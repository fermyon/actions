import * as core from '@actions/core'
import * as github from '@actions/github';
import * as actions from './actions'
import * as cloud from './cloud'

async function run(): Promise<void> {
  try {
    if (!github.context.payload.pull_request) {
      throw new Error(`this action currently support deploying apps on PR only`)
    }

    const prNumber = github.context.payload.pull_request.number
    if (core.getBooleanInput('undeploy')) {
      await actions.undeployPreview(prNumber)
      return
    }

    const token = core.getInput('fermyon_token', { required: true })
    await cloud.login(token)
    await actions.build()
    const metadata = await actions.deployPreview(prNumber)
    core.setOutput("app-url", metadata.base)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
