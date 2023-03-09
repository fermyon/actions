import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as downloader from './downloader'
import * as sys from './system'
import * as fs from 'fs-extra'
import * as toml from 'toml'

export async function install(version: string): Promise<void> {
    await download(version)

    // verify spin setup succeeded or not
    const result = await exec.getExecOutput("spin", ["--version"])
    if (result.exitCode != 0) {
        throw new Error(`failed while verifying spin version.\n[stdout: ${result.stdout}] [stderr: ${result.stderr}]`)
    }

    // remove 'v' from version before verifying
    if (result.stdout.indexOf(version.replace(/^v/, '')) === -1) {
        throw new Error(`expected version ${version}, found ${result.stdout}`)
    }
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

export async function build(appConfigFile: string): Promise<void> {
    await exec.exec('spin', ['build', '-f', appConfigFile])
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

export async function registryPush(oci_app_reference: string, appConfigFile: string): Promise<void> {
    await exec.exec('spin', ['registry', 'push', '-f', appConfigFile, oci_app_reference])
}

export class SpinAppConfig {
    name: string

    constructor(name: string) {
        this.name = name
    }
}

export function getAppConfig(appConfigFile: string): SpinAppConfig {
    let token: string = '';
    const data = fs.readFileSync(appConfigFile, "utf8");
    return toml.parse(data);
}