import * as core from '@actions/core'
import * as httpm from '@actions/http-client'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as fs from 'fs-extra'
import * as spin from './spin'
import * as path from 'path'

export const DEFAULT_CLOUD_URL = "https://cloud.fermyon.com"

export function initClient(token: string): Client {
    return new Client(token)
}

export class GetAppsResp {
    items: Array<App>
    constructor(items: Array<App>) {
        this.items = items
    }
}

export class App {
    id: string
    name: string

    constructor(id: string, name: string) {
        this.id = id
        this.name = name
    }
}

export class Route {
    name: string
    routeUrl: string
    wildcard: boolean

    constructor(name: string, routeUrl: string, wildcard: boolean) {
        this.name = name
        this.routeUrl = routeUrl
        this.wildcard = wildcard
    }
}

export class Client {
    base: string
    token: string
    _httpclient: httpm.HttpClient

    constructor(token: string) {
        this.base = DEFAULT_CLOUD_URL
        this.token = token
        this._httpclient = new httpm.HttpClient("fermyon/actions", [], {
            headers: {
                Authorization: `Bearer ${this.token}`
            }
        })
    }

    async getAllApps(): Promise<App[]> {
        const resp = await this._httpclient.get(`${this.base}/api/apps`)
        if (resp.message.statusCode !== httpm.HttpCodes.OK) {
            throw `expexted code ${httpm.HttpCodes.OK}, got ${resp.message.statusCode}`
        }

        const appsResp: GetAppsResp = JSON.parse(await resp.readBody())
        return appsResp.items;
    }

    async getAppIdByName(name: string): Promise<string> {
        let apps = await this.getAllApps()
        const app = apps.find(item => item.name === name);
        if (!app) {
            throw `no app found with name ${name}`
        }

        return app.id;
    }

    async deleteAppById(id: string): Promise<void> {
        const resp = await this._httpclient.del(`${this.base}/api/apps/${id}`)
        if (resp.message.statusCode !== 204) {
            throw `expected code 204, got ${resp.message.statusCode}`
        }
    }

    async deleteAppByName(name: string): Promise<void> {
        let appId = await this.getAppIdByName(name)
        this.deleteAppById(appId)
    }
}

export async function login(token: string): Promise<void> {
    await exec.exec('spin', ['cloud', 'login', '--token', token])
}

export async function deploy(manifestFile: string, kvPairs: Array<string>): Promise<Metadata> {
    const manifest = spin.getAppManifest(manifestFile)

    let args = ["deploy", "-f", manifestFile];
    for (let i = 0; i < kvPairs.length; i++) {
        args.push("--key-value")
        args.push(kvPairs[i])
    }

    const result = await exec.getExecOutput("spin", args)
    if (result.exitCode != 0) {
        throw new Error(`deploy failed with [status_code: ${result.exitCode}] [stdout: ${result.stdout}] [stderr: ${result.stderr}] `)
    }

    return extractMetadataFromLogs(manifest.name, result.stdout)
}

export async function deployAs(appName: string, manifestFile: string, kvPairs: Array<string>): Promise<Metadata> {
    const manifest = spin.getAppManifest(manifestFile)
    const previewTomlFile = path.join(path.dirname(manifestFile), `${appName}-spin.toml`)
    await io.cp(manifestFile, previewTomlFile)

    const data = fs.readFileSync(previewTomlFile, 'utf8');
    const re = new RegExp(`name = "${manifest.name}"`, "g")
    var result = data.replace(re, `name = "${appName}"`);
    fs.writeFileSync(previewTomlFile, result, 'utf8');

    return deploy(previewTomlFile, kvPairs)
}

export class Metadata {
    appName: string
    base: string
    version: string
    appRoutes: Array<Route>
    rawLogs: string

    constructor(appName: string, base: string, version: string, appRoutes: Array<Route>, rawLogs: string) {
        this.appName = appName;
        this.base = base;
        this.version = version;
        this.appRoutes = appRoutes
        this.rawLogs = rawLogs
    }
}

export const extractMetadataFromLogs = function (appName: string, logs: string): Metadata {
    let version = '';
    const m = logs.match(`Uploading ${appName} version (.*)\.\.\.`)
    if (m && m.length > 1) {
        version = m[1]
    }

    let routeStart = false;
    const routeMatcher = `^(.*): (https?:\/\/[^\\s^(]+)(.*)`
    const lines = logs.split("\n")
    let routes = new Array<Route>();
    let base = '';
    for (let i = 0; i < lines.length; i++) {
        if (!routeStart && lines[i].trim() != 'Available Routes:') {
            continue
        }

        if (!routeStart) {
            routeStart = true
            continue
        }

        const matches = lines[i].trim().match(routeMatcher)
        if (matches && matches.length >= 2) {
            const route = new Route(matches[1], matches[2], matches[3].trim() === '(wildcard)')
            routes.push(route)
        }
    }

    if (routes.length > 0) {
        base = routes[0].routeUrl
    }

    return new Metadata(appName, base, version, routes, logs)
}