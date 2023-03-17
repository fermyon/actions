import * as actions from './actions'
import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    await actions.setup()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
