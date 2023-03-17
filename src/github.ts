import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';

const token = core.getInput('github_token');
const octokit = (() => {
    return token ? new Octokit({ auth: token }) : new Octokit();
})();

export async function getLatestRelease(): Promise<string> {
    const allReleases = await octokit.rest.repos.listReleases({
        owner: 'fermyon',
        repo: 'spin',
    });

    const releases = allReleases.data.filter(item => !item.prerelease)
    if (releases.length === 0) {
        throw new Error(`no releases found for fermyon/spin`)
    }

    return Promise.resolve(releases[0].tag_name)
}