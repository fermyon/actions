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

  async getAppIdByName(name: string): Promise<string> {
    const apps = await this.getAllApps()
    const app = apps.find(item => item.name === name)
    if (!app) {
      throw new Error(`no app found with name ${name}`)
    }

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
): Promise<Metadata> {
  const manifest = spin.getAppManifest(manifestFile)

  const args = ['deploy', '-f', manifestFile]
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

  return extractMetadataFromLogs(manifest.name, result.stdout)
}

export async function deployAs(
  appName: string,
  manifestFile: string,
  kvPairs: string[],
  variables: string[]
): Promise<Metadata> {
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

  return deploy(previewTomlFile, kvPairs, variables)
}

export interface Metadata {
  appName: string
  base: string
  version: string
  appRoutes: Route[]
  rawLogs: string
}

export function extractMetadataFromLogs(
  appName: string,
  rawLogs: string
): Metadata {
  let version = ''
  const m = rawLogs.match(`Uploading ${appName} version (.*)\\.\\.\\.`)
  if (m && m.length > 1) {
    version = m[1]
  }

  let routeStart = false
  const routeMatcher = `^(.*): (https?:\\/\\/[^\\s^(]+)(.*)`
  const lines = rawLogs.split('\n')
  const appRoutes = new Array<Route>()
  let base = ''

  for (const line of lines) {
    if (!routeStart && line.trim() !== 'Available Routes:') {
      continue
    }

    if (!routeStart) {
      routeStart = true
      continue
    }

    const matches = line.trim().match(routeMatcher)
    if (matches && matches.length >= 2) {
      const route: Route = {
        name: matches[1],
        routeUrl: matches[2],
        wildcard: matches[3].trim() === '(wildcard)'
      }
      appRoutes.push(route)
    }
  }

  if (appRoutes.length > 0) {
    base = appRoutes[0].routeUrl
  }

  const meta: Metadata = {
    appName,
    base,
    version,
    appRoutes,
    rawLogs
  }

  return meta
}
