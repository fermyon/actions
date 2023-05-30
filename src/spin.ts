import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as downloader from './downloader'
import * as sys from './system'
import * as fs from 'fs-extra'
import * as toml from 'toml'

export const DEFAULT_APP_CONFIG_FILE = "spin.toml"
export const CANARY_VERSION = "canary"

export async function install(version: string): Promise<void> {
    await download(version)

    const result = await exec.getExecOutput("spin", ["--version"])
    if (result.exitCode != 0) {
        throw new Error(`failed while verifying spin version.\n[stdout: ${result.stdout}] [stderr: ${result.stderr}]`)
    }

    core.info(result.stdout)
    core.exportVariable("SPIN_VERSION", result.stdout)
}

async function download(version: string): Promise<void> {
    const osPlatform = sys.getPlatform()
    const osArch = sys.getArch()

    let archiveExtension = osPlatform === 'windows' ? '.zip' : '.tar.gz';
    let binaryExtension = osPlatform === 'windows' ? '.exe' : '';

    const downloadUrl = `https://github.com/fermyon/spin/releases/download/${version}/spin-${version}-${osPlatform}-${osArch}${archiveExtension}`
    await downloader
        .getConfig(`spin${binaryExtension}`, downloadUrl, `spin${binaryExtension}`)
        .download()
}


export async function installPlugins(plugins: Array<string>): Promise<void> {
    await pullPluginManifests()

    plugins.every(async function (plugin) {
        await installOnePlugin(plugin);
    })
}

export async function build_cmd(cmd: string): Promise<void> {
    await exec.exec(cmd)
}

export async function build(manifestFile: string): Promise<void> {
    await exec.exec('spin', ['build', '-f', manifestFile])
}

async function pullPluginManifests(): Promise<void> {
    await exec.exec('spin', ['plugin', 'update'])
}

//todo: support installing specific version
//todo: support checking compatibility with spin version
async function installOnePlugin(plugin: string): Promise<void> {
    core.info(`installing spin plugin '${plugin}'`);
    await exec.exec('spin', ['plugin', 'install', plugin, '--yes'])
    const result = await exec.getExecOutput("spin", [plugin, "--version"])
    if (result.exitCode != 0) {
        throw new Error(`failed while verifying installation for spin plugin ${plugin}.\n[stdout: ${result.stdout}] [stderr: ${result.stderr}]`)
    }
}

export async function registryLogin(registry: string, username: string, password: string): Promise<void> {
    await exec.exec('spin', ['registry', 'login', registry, '--username', username, "--password-stdin"], {
        input: Buffer.from(password)
    })
}

export async function registryPush(registry_reference: string, manifestFile: string): Promise<void> {
    const result = await exec.getExecOutput('spin', ['registry', 'push', '-f', manifestFile, registry_reference])
    if (result.exitCode != 0) {
        throw new Error(`failed while pushing reference ${registry_reference}.\n[stdout: ${result.stdout}] [stderr: ${result.stderr}]`)
    }
    const matches = result.stdout.match(new RegExp('sha256:[A-Fa-f0-9]{64}'))
    matches != null ? core.setOutput('digest', matches[0]) :
        core.notice(`successfully pushed reference ${registry_reference} but unable to determine digest`)
}

export class SpinAppManifest {
    name: string

    constructor(name: string) {
        this.name = name
    }
}

export function getAppManifest(manifestFile: string): SpinAppManifest {
    let token: string = '';
    const data = fs.readFileSync(manifestFile, "utf8");
    return toml.parse(data);
}