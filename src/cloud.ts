import * as exec from '@actions/exec'
import * as spin from './spin'

export const DEFAULT_CLOUD_URL = "https://cloud.fermyon.com"

export async function login(token: string): Promise<void> {
    await exec.exec('spin', ['cloud', 'login', '--token', token])
}

export async function deploy(manifestFile: string): Promise<Metadata> {
    const manifest = spin.getAppManifest(manifestFile)
    const result = await exec.getExecOutput("spin", ["deploy", "-f", manifestFile])
    if (result.exitCode != 0) {
        throw new Error(`deploy failed with [status_code: ${result.exitCode}] [stdout: ${result.stdout}] [stderr: ${result.stderr}] `)
    }

    return extractMetadataFromLogs(manifest.name, result.stdout)
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