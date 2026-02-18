import * as exec from '@actions/exec'
import * as fs from 'fs-extra'
import * as httpm from '@actions/http-client'
import * as io from '@actions/io'
import * as path from 'path'

import * as spin from './spin'

export const DEFAULT_CLOUD_URL = 'https://cloud.fermyon.com'

export function initClient(token: string): Client {
  return new Client(token)
}

export interface GetAppsResp {
  items: App[]
}

export interface App {
  id: string
  name: string
  healthStatus: string
  subdomain: string
  domain: Domain
}

export interface Domain {
  name: string
  validationStatus: string
}

export interface Route {
  name: string
  routeUrl: string
  wildcard: boolean
}

export class Client {
  base: string
  token: string
  _httpclient: httpm.HttpClient

  constructor(token: string) {
    this.base = DEFAULT_CLOUD_URL
    this.token = token
    this._httpclient = new httpm.HttpClient('fermyon/actions', [], {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    })
  }

  async getAllApps(): Promise<App[]> {
    const resp = await this._httpclient.get(`${this.base}/api/apps`)
    if (resp.message.statusCode !== httpm.HttpCodes.OK) {
      throw new Error(
        `expexted code ${httpm.HttpCodes.OK}, got ${resp.message.statusCode}`
      )
    }

    const appsResp: GetAppsResp = JSON.parse(await resp.readBody())
    return appsResp.items
  }

  async getAppByName(name: string): Promise<App> {
    const apps = await this.getAllApps()
    const app = apps.find(item => item.name === name)
    if (!app) {
      throw new Error(`no app found with name ${name}`)
    }

    return app
  }

  async getAppIdByName(name: string): Promise<string> {
    const app = await this.getAppByName(name)
    return app.id
  }

  async deleteAppById(id: string): Promise<void> {
    const resp = await this._httpclient.del(`${this.base}/api/apps/${id}`)
    if (resp.message.statusCode !== 204) {
      throw new Error(`expected code 204, got ${resp.message.statusCode}`)
    }
  }

  async deleteAppByName(name: string): Promise<void> {
    const appId = await this.getAppIdByName(name)
    this.deleteAppById(appId)
  }
}

export async function login(token: string): Promise<void> {
  await exec.exec('spin', ['cloud', 'login', '--token', token])
}

export async function deploy(
  manifestFile: string,
  kvPairs: string[],
  variables: string[]
): Promise<void> {
  const args = ['cloud', 'deploy', '-f', manifestFile]
  for (const kvpair of kvPairs) {
    args.push('--key-value')
    args.push(kvpair)
  }

  for (const variable of variables) {
    args.push('--variable')
    args.push(variable)
  }

  const result = await exec.getExecOutput('spin', args)
  if (result.exitCode !== 0) {
    throw new Error(
      `deploy failed with [status_code: ${result.exitCode}] [stdout: ${result.stdout}] [stderr: ${result.stderr}] `
    )
  }
}

export async function deployAs(
  appName: string,
  manifestFile: string,
  kvPairs: string[],
  variables: string[]
): Promise<void> {
  const manifest = spin.getAppManifest(manifestFile)
  const previewTomlFile = path.join(
    path.dirname(manifestFile),
    `${appName}-spin.toml`
  )
  await io.cp(manifestFile, previewTomlFile)

  const data = fs.readFileSync(previewTomlFile, 'utf8')
  const re = new RegExp(`name = "${manifest.name}"`, 'g')
  const result = data.replace(re, `name = "${appName}"`)
  fs.writeFileSync(previewTomlFile, result, 'utf8')

  await deploy(previewTomlFile, kvPairs, variables)
}
