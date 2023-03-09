import * as core from '@actions/core'
import * as spin from './spin'
import * as cloud from './cloud'
import * as consts from './consts'

async function run(): Promise<void> {
  try {
    const version = core.getInput('version') || consts.DEFAULT_SPIN_VERSION;
    await spin.install(version)

    //todo: check compatibility with spin version
    const pluginsList = core.getInput('plugins') !== '' ? core.getInput('plugins').split(',') : [];
    if (pluginsList.length > 0) {
      await spin.installPlugins(pluginsList)
    }

    const appConfigFile = core.getInput('app_config_file') || consts.DEFAULT_APP_CONFIG_FILE;
    if (core.getInput('build_cmd') !== '') {
      await spin.build_cmd(core.getInput('build_cmd'))
    } else if (core.getInput('build') === 'true') {
      await spin.build(appConfigFile)
    }

    // registry app reference
    // assumes login to registry is already done
    if (core.getInput('oci_app_reference') !== '') {
      await spin.registryPush(core.getInput('oci_app_reference'), appConfigFile)
    }

    const cloudBaseURL = core.getInput('cloud_base_url') || consts.DEFAULT_CLOUD_URL
    if (core.getInput('fermyon_token') !== '') {
      await cloud.login(cloudBaseURL, core.getInput('fermyon_token'))
    }

    if (core.getInput('deploy') === 'true') {
      const metadata = await cloud.deploy(appConfigFile)
      core.info(`your app is deployed and available at ${metadata.base}`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
