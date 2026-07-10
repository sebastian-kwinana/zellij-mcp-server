// Cross-platform detection helpers.
//
// The server historically assumed a Unix host (bash, /tmp, ps, mkfifo). The
// Windows-MCP integration is the first feature that branches on the operating
// system, so platform detection lives here in one place for reuse.
import os from 'os';
export function getPlatform() {
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
export function isWindows() {
    return os.platform() === 'win32';
}
export function isMac() {
    return os.platform() === 'darwin';
}
export function isLinux() {
    return os.platform() === 'linux';
}
/**
 * Human-readable platform label for status/error messages, e.g.
 * "linux (x64)".
 */
export function describePlatform() {
    return `${os.platform()} (${os.arch()})`;
}
//# sourceMappingURL=platform.js.map