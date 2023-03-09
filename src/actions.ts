import * as core from '@actions/core'
import * as spin from './spin'
import * as github from './github'
import * as cloud from './cloud'

export async function setup(): Promise<void> {
    let version = core.getInput('version');
    if (!version || version === 'latest') {
        version = await github.getLatestRelease()
    }

    await spin.install(version)

    //todo: check compatibility with spin version
    const pluginsList = core.getInput('plugins') !== '' ? core.getInput('plugins').split(',') : [];
    if (pluginsList.length > 0) {
        await spin.installPlugins(pluginsList)
    }
}

export async function deploy(): Promise<cloud.Metadata> {
    const manifestFile = getManifestFile()
    return cloud.deploy(manifestFile)
}

export async function build(): Promise<void> {
    const manifestFile = getManifestFile()
    await spin.build(manifestFile)
}

export async function push(): Promise<void> {
    const registry_reference = core.getInput('registry_reference', { required: true })
    const manifestFile = getManifestFile()
    await spin.registryPush(registry_reference, manifestFile)
}

function getManifestFile(): string {
    return core.getInput('manifest_file') || spin.DEFAULT_APP_CONFIG_FILE;
}

export async function registryLogin(): Promise<void> {
    const required = ["registry", "registry_username", "registry_password"]
    const provided = required.filter(x => core.getInput(x) !== null && core.getInput(x) !== '').length;
    if (provided === 0) {
        core.debug("registry login not requested")
        return Promise.resolve()
    }

    if (provided > 0 && provided !== required.length) {
        throw new Error(`all or none of ${required} should be provided`)
    }

    return spin.registryLogin(core.getInput('registry'), core.getInput('registry_username'), core.getInput('registry_password'))
}