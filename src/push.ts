import * as actions from './actions'
import * as core from '@actions/core'

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
