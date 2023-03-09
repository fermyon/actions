/*
  this code is taken from engineerd/configurator which is MIT licensed
*/

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs-extra'
import * as io from '@actions/io'
import * as os from 'os'
import * as path from 'path'
import * as tc from '@actions/tool-cache'
import { v4 as uuidv4 } from 'uuid'

export enum ArchiveType {
  None = '',
  TarGz = '.tar.gz',
  TarXz = '.tar.xz',
  Tgz = '.tgz',
  Zip = '.zip',
  SevenZ = '.7z'
}

export function getConfig(
  nameInput: string,
  urlInput: string,
  pathInArchive: string
): Downloader {
  return new Downloader(nameInput, urlInput, pathInArchive)
}

export class Downloader {
  name: string
  url: string
  pathInArchive: string

  constructor(name: string, url: string, pathInArchive: string) {
    this.name = name
    this.url = url
    this.pathInArchive = pathInArchive
  }

  async download(): Promise<void> {
    this.validate()
    const downloadURL = this.url

    core.info(`Downloading tool from ${downloadURL}`)
    let downloadPath: string | null = null
    let archivePath: string | null = null
    const randomDir: string = uuidv4()
    const tempDir = path.join(os.tmpdir(), 'tmp', 'runner', randomDir)
    core.info(`Creating tempdir ${tempDir}`)
    await io.mkdirP(tempDir)
    downloadPath = await tc.downloadTool(downloadURL)

    switch (getArchiveType(downloadURL)) {
      case ArchiveType.None:
        await this.moveToPath(downloadPath)
        break

      case ArchiveType.TarGz:
        archivePath = await tc.extractTar(downloadPath, tempDir)
        await this.moveToPath(path.join(archivePath, this.pathInArchive))
        break

      case ArchiveType.TarXz:
        archivePath = await tc.extractTar(downloadPath, tempDir, 'x')
        await this.moveToPath(path.join(archivePath, this.pathInArchive))
        break

      case ArchiveType.Tgz:
        archivePath = await tc.extractTar(downloadPath, tempDir)
        await this.moveToPath(path.join(archivePath, this.pathInArchive))
        break

      case ArchiveType.Zip:
        archivePath = await tc.extractZip(downloadPath, tempDir)
        await this.moveToPath(path.join(archivePath, this.pathInArchive))
        break

      case ArchiveType.SevenZ:
        archivePath = await tc.extract7z(downloadPath, tempDir)
        await this.moveToPath(path.join(archivePath, this.pathInArchive))
        break
    }

    // Clean up the tempdir when done (this step is important for self-hosted runners)
    return io.rmRF(tempDir)
  }


  async downloadAsDir(): Promise<void> {
    this.validate()
    const downloadURL = this.url

    core.info(`Downloading tool from ${downloadURL}`)
    let downloadPath: string | null = null
    let archivePath: string | null = null
    const randomDir: string = uuidv4()
    const tempDir = path.join(os.tmpdir(), 'tmp', 'runner', randomDir)
    core.info(`Creating tempdir ${tempDir}`)
    await io.mkdirP(tempDir)
    downloadPath = await tc.downloadTool(downloadURL)

    switch (getArchiveType(downloadURL)) {
      case ArchiveType.None:
        await this.moveDirToPath(downloadPath)
        break

      case ArchiveType.TarGz:
        archivePath = await tc.extractTar(downloadPath, tempDir)
        await this.moveDirToPath(path.join(archivePath, this.pathInArchive))
        break

      case ArchiveType.TarXz:
        archivePath = await tc.extractTar(downloadPath, tempDir, 'x')
        await this.moveDirToPath(path.join(archivePath, this.pathInArchive))
        break

      case ArchiveType.Tgz:
        archivePath = await tc.extractTar(downloadPath, tempDir)
        await this.moveDirToPath(path.join(archivePath, this.pathInArchive))
        break

      case ArchiveType.Zip:
        archivePath = await tc.extractZip(downloadPath, tempDir)
        await this.moveDirToPath(path.join(archivePath, this.pathInArchive))
        break

      case ArchiveType.SevenZ:
        archivePath = await tc.extract7z(downloadPath, tempDir)
        await this.moveDirToPath(path.join(archivePath, this.pathInArchive))
        break
    }

    // Clean up the tempdir when done (this step is important for self-hosted runners)
    return io.rmRF(tempDir)
  }

  async moveToPath(downloadPath: string): Promise<void> {
    const toolPath = binPath()
    await io.mkdirP(toolPath)
    const dest = path.join(toolPath, this.name)
    await fs.exists(downloadPath)
    core.info(`copying ${downloadPath} to ${dest}`)

    if (!fs.existsSync(dest)) {
      fs.moveSync(downloadPath, dest)
    }

    if (process.platform !== 'win32') {
      await exec.exec('chmod', ['+x', path.join(toolPath, this.name)])
    }

    core.addPath(toolPath)
  }

  async moveDirToPath(downloadPath: string): Promise<void> {
    const toolPath = binFolderPath()
    await io.mkdirP(toolPath)
    const dest = path.join(toolPath, this.name)
    core.info(`copying to ${dest}`)

    if (!fs.existsSync(dest)) {
      fs.moveSync(downloadPath, dest)
    }

    core.addPath(dest)
    core.addPath(path.join(dest, "bin"))
  }

  validate(): void {
    if (!this.name) {
      throw new Error(
        `"name" is required. This is used to set the executable name of the tool.`
      )
    }

    if (getArchiveType(this.url) !== ArchiveType.None && !this.pathInArchive) {
      throw new Error(
        `"pathInArchive" is required when "url" points to an archive file`
      )
    }
  }
}

export function getArchiveType(downloadURL: string): ArchiveType {
  if (downloadURL.endsWith(ArchiveType.TarGz)) return ArchiveType.TarGz
  if (downloadURL.endsWith(ArchiveType.TarXz)) return ArchiveType.TarXz
  if (downloadURL.endsWith(ArchiveType.Tgz)) return ArchiveType.Tgz
  if (downloadURL.endsWith(ArchiveType.Zip)) return ArchiveType.Zip
  if (downloadURL.endsWith(ArchiveType.SevenZ)) return ArchiveType.SevenZ

  return ArchiveType.None
}

export function binFolderPath(): string {
  let baseLocation: string
  if (process.platform === 'win32') {
    // On windows use the USERPROFILE env variable
    baseLocation = process.env['USERPROFILE'] || 'C:\\'
  } else {
    if (process.platform === 'darwin') {
      baseLocation = '/Users'
    } else {
      baseLocation = '/home'
    }
  }

  return path.join(baseLocation, os.userInfo().username, 'downloader')
}

export function binPath(): string {
  return path.join(binFolderPath(), 'bin')
}
