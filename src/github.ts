import * as core from '@actions/core'
import {Octokit} from '@octokit/rest'

const token = core.getInput('github_token')
const octokit = (() => {
  return token ? new Octokit({auth: token}) : new Octokit()
})()

export async function getLatestRelease(
  owner: string,
  repo: string
): Promise<string> {
  const allReleases = await octokit.rest.repos.listReleases({
    owner,
    repo
  })

  const releases = allReleases.data.filter(item => !item.prerelease)
  if (releases.length === 0) {
    throw new Error(`no releases found for fermyon/spin`)
  }

  return Promise.resolve(releases[0].tag_name)
}

export async function updateComment(
  owner: string,
  repo: string,
  prNumber: number,
  msg: string
): Promise<void> {
  if (!(await findComment(owner, repo, prNumber, msg))) {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: msg
    })
    core.info(`updated comment on PR #${prNumber}`)
  }
}

export async function findComment(
  owner: string,
  repo: string,
  prNumber: number,
  msg: string
): Promise<boolean> {
  for await (const response of octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    {owner, repo, issue_number: prNumber, per_page: 100}
  )) {
    const comments = response.data
    const found = comments.find(item => {
      return item.body && item.body === msg
    })

    if (found) {
      return Promise.resolve(true)
    }
  }

  return Promise.resolve(false)
}
