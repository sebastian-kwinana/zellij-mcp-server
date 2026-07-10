// Cross-platform detection helpers.
//
// The server historically assumed a Unix host (bash, /tmp, ps, mkfifo). The
// Windows-MCP integration is the first feature that branches on the operating
// system, so platform detection lives here in one place for reuse.

import os from 'os';

export type SupportedPlatform = 'windows' | 'mac' | 'linux' | 'other';

export function getPlatform(): SupportedPlatform {
  switch (os.platform()) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'mac';
    case 'linux':
      return 'linux';
    default:
      return 'other';
  }
}

export function isWindows(): boolean {
  return os.platform() === 'win32';
}

export function isMac(): boolean {
  return os.platform() === 'darwin';
}

export function isLinux(): boolean {
  return os.platform() === 'linux';
}

/**
 * Human-readable platform label for status/error messages, e.g.
 * "linux (x64)".
 */
export function describePlatform(): string {
  return `${os.platform()} (${os.arch()})`;
}
