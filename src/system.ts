/*
  this code is taken from endocrimes/setup-nomad
*/

import os from 'os'

export function getPlatform(): string {
  const platform = os.platform()
  switch (platform) {
    case 'darwin':
      return 'macos'
    case 'freebsd':
      return 'freebsd'
    case 'linux':
      return 'linux'
    case 'openbsd':
      return 'openbsd'
    case 'win32':
      return 'windows'
    default:
      throw new Error(`Unsupported operating system platform: ${platform}`)
  }
}

export function getArch(): string {
  const arch = os.arch()
  switch (arch) {
    case 'arm':
      return 'arm'
    case 'arm64':
      return 'aarch64'
    case 'x32':
      return '386'
    case 'x64':
      return 'amd64'
    default:
      throw new Error(`Unsupported operating system architecture: ${arch}`)
  }
}
