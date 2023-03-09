import * as core from '@actions/core'
import * as actions from './actions'

async function run(): Promise<void> {
  try {
    await actions.build()
    await actions.registryLogin()
    await actions.push()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
