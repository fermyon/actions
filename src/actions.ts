import * as core from '@actions/core'
import * as spin from './spin'
import * as github from './github'
import * as cloud from './cloud'
import { context } from '@actions/github'

const FERMYON_GITHUB_ORG = "fermyon"
const SPIN_GITHUB_REPO = "spin"

export async function setup(): Promise<void> {
    let version = core.getInput('version');
    if (!version || version === 'latest') {
        version = await github.getLatestRelease(FERMYON_GITHUB_ORG, SPIN_GITHUB_REPO)
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
    const kvPairs = getKeyValuePairs()
    const variables = getDeployVariables()
    return cloud.deploy(manifestFile, kvPairs, variables)
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

export function getManifestFile(): string {
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

export async function deployPreview(prNumber: number): Promise<cloud.Metadata> {
    const manifestFile = getManifestFile()
    const spinConfig = spin.getAppManifest(manifestFile)

    const realAppName = spinConfig.name
    const previewAppName = `${realAppName}-pr-${prNumber}`

    core.info(`🚀 deploying preview as ${previewAppName} to Fermyon Cloud`)
    const kvPairs = getKeyValuePairs()
    const variables = getDeployVariables()
    const metadata = await cloud.deployAs(previewAppName, manifestFile, kvPairs, variables)

    const comment = `🚀 preview deployed successfully to Fermyon Cloud and available at ${metadata.base}`
    core.info(comment)

    await github.updateComment(context.repo.owner, context.repo.repo, prNumber, comment)
    return metadata
}

export async function undeployPreview(prNumber: number): Promise<void> {
    const manifestFile = getManifestFile()
    const spinConfig = spin.getAppManifest(manifestFile)

    const realAppName = spinConfig.name
    const previewAppName = `${spinConfig.name}-pr-${prNumber}`

    const cloudToken = core.getInput('fermyon_token', { required: true })
    const cloudClient = cloud.initClient(cloudToken)

    const apps = await cloudClient.getAllApps()
    const thisPreviewExists = apps.find(item => item.name === previewAppName)

    if (!thisPreviewExists) {
        core.info(`no preview found for pr ${prNumber}`)
        return
    }

    core.info(`cleaning up preview for pr ${prNumber}`)
    await cloudClient.deleteAppById(thisPreviewExists.id)
    core.info(`preview deployment removed successfully`)
}

export function getKeyValuePairs(): Array<string> {
    const rawKV = core.getInput('key_values');
    if (!rawKV) {
        return new Array<string>();
    }

    return rawKV.split(/\r|\n/)
}

export function getDeployVariables(): Array<string> {
    const rawVariables = core.getInput('variables');
    if (!rawVariables) {
        return new Array<string>();
    }

    return rawVariables.split(/\r|\n/)
}