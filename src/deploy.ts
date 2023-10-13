import * as actions from './actions'
import * as cloud from './cloud'
import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    const buildEnabled =
      core.getBooleanInput('run_build') === false ? false : true
    if (buildEnabled) {
      await actions.build()
    }

    const token = core.getInput('fermyon_token', {required: true})
    await cloud.login(token)

    const metadata = await actions.deploy()
    core.setOutput('app-url', metadata.base)
    core.info(`your app is deployed and available at ${metadata.base}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
