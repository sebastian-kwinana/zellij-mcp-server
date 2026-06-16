// Windows-MCP integration tools.
//
// These tools let the zellij-mcp-server bring up CursorTouch/Windows-MCP
// (launched via `uvx windows-mcp`) on Windows hosts, secured with locally
// trusted TLS over the streamable-http transport. All heavy lifting (mkcert
// install via scoop/winget/choco, cert + auth-key generation, single-instance
// launch) lives in scripts/windows/windows-mcp.ps1; this module is a typed,
// validated, platform-guarded front door to that script.
//
// The interactive cert-setup flow is meant to be run once by a human via the
// script directly. When invoked through MCP (no TTY) these tools always run the
// script with -NonInteractive, relying on config + already-installed certs.
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { execAsync } from '../utils/command.js';
import { Validator } from '../utils/validator.js';
import { isWindows, describePlatform } from '../utils/platform.js';
import { resolveWindowsMCPConfig } from '../utils/config.js';
import { ValidationError } from '../types/zellij.js';
const RESULT_MARKER = '__WINMCP_RESULT__';
export class WindowsMCPTools {
    static shell = null;
    // ----- public tool methods -----
    static async setup(opts = {}) {
        return this.run('setup', opts, 300_000);
    }
    static async launch(opts = {}) {
        return this.run('launch', opts, 120_000);
    }
    static async status(opts = {}) {
        return this.run('status', opts, 30_000);
    }
    static async stop(opts = {}) {
        return this.run('stop', opts, 30_000);
    }
    static async installTask(opts = {}) {
        return this.run('install-task', opts, 120_000);
    }
    // ----- internals -----
    static async run(action, opts, timeoutMs) {
        if (!isWindows()) {
            return text(`Windows-MCP integration is Windows-only. Current host platform is ${describePlatform()}. ` +
                `Run this on the Windows machine where zellij/Windows-MCP live.`);
        }
        const config = resolveWindowsMCPConfig({
            transport: opts.transport,
            host: opts.host,
            port: opts.port,
            authKey: opts.authKey,
            ipAllowlist: opts.ipAllowlist,
            certFile: opts.certFile,
            keyFile: opts.keyFile,
        });
        const args = this.buildArgs(action, config, opts.force === true);
        const shell = await this.detectPowerShell();
        const { code, stdout, stderr } = await this.invoke(shell, args, timeoutMs);
        const result = parseResult(stdout);
        const summary = result?.error
            ? `Windows-MCP ${action} failed: ${result.error}`
            : `Windows-MCP ${action} completed (${this.describeUrl(config)}).`;
        const body = [
            summary,
            result ? `\nResult:\n${JSON.stringify(result, null, 2)}` : '',
            code !== 0 ? `\n(PowerShell exited with code ${code})` : '',
            stderr.trim() ? `\nstderr:\n${stderr.trim()}` : '',
        ]
            .filter(Boolean)
            .join('');
        return text(body);
    }
    static buildArgs(action, config, force) {
        // Validate everything that is forwarded to PowerShell / windows-mcp.
        assertValid(Validator.validateTransport(config.transport), 'transport');
        assertValid(Validator.validateHost(config.host), 'host');
        assertValid(Validator.validatePort(config.port), 'port');
        if (config.authKey)
            assertValid(Validator.validateAuthKey(config.authKey), 'authKey');
        if (config.ipAllowlist)
            assertValid(Validator.validateIpAllowlist(config.ipAllowlist), 'ipAllowlist');
        if (config.certFile)
            assertValid(Validator.validateCertPath(config.certFile, 'certFile'), 'certFile');
        if (config.keyFile)
            assertValid(Validator.validateCertPath(config.keyFile, 'keyFile'), 'keyFile');
        const scriptPath = this.resolveScriptPath();
        const args = [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            scriptPath,
            '-Action',
            action,
            '-Transport',
            config.transport,
            '-BindHost',
            config.host,
            '-Port',
            String(config.port),
            '-NonInteractive',
        ];
        if (config.authKey)
            args.push('-AuthKey', config.authKey);
        if (config.ipAllowlist)
            args.push('-IpAllowlist', config.ipAllowlist);
        if (config.certFile && config.keyFile) {
            args.push('-CertFile', config.certFile, '-KeyFile', config.keyFile);
        }
        if (force)
            args.push('-Force');
        return args;
    }
    static resolveScriptPath() {
        const dir = path.dirname(fileURLToPath(import.meta.url));
        // Compiled module lives at dist/tools/windows-mcp.js; the script is shipped
        // at <repo>/scripts/windows/windows-mcp.ps1. Try the compiled layout first,
        // then the src layout (ts-node / tests).
        const candidates = [
            path.resolve(dir, '..', '..', 'scripts', 'windows', 'windows-mcp.ps1'),
            path.resolve(dir, '..', '..', '..', 'scripts', 'windows', 'windows-mcp.ps1'),
        ];
        const found = candidates.find((c) => existsSync(c));
        if (!found) {
            throw new ValidationError(`Could not locate windows-mcp.ps1 (looked in: ${candidates.join(', ')})`);
        }
        return found;
    }
    static async detectPowerShell() {
        if (this.shell)
            return this.shell;
        // Prefer PowerShell 7+ (pwsh); fall back to Windows PowerShell.
        for (const candidate of ['pwsh', 'powershell.exe']) {
            try {
                await execAsync(`${candidate} -NoProfile -Command "exit 0"`, { timeout: 10_000 });
                this.shell = candidate;
                return candidate;
            }
            catch {
                /* try next */
            }
        }
        this.shell = 'powershell.exe';
        return this.shell;
    }
    static invoke(shell, args, timeoutMs) {
        return new Promise((resolve) => {
            // spawn with an argv array (no shell) so values are never re-parsed.
            const child = spawn(shell, args, { windowsHide: true });
            let stdout = '';
            let stderr = '';
            const timer = setTimeout(() => child.kill(), timeoutMs);
            child.stdout.on('data', (d) => (stdout += d.toString()));
            child.stderr.on('data', (d) => (stderr += d.toString()));
            child.on('error', (err) => {
                clearTimeout(timer);
                resolve({ code: -1, stdout, stderr: `${stderr}${err.message}` });
            });
            child.on('close', (code) => {
                clearTimeout(timer);
                resolve({ code: code ?? -1, stdout, stderr });
            });
        });
    }
    static describeUrl(config) {
        const urlPath = config.transport === 'sse' ? '/sse' : '/mcp/';
        return `https://${config.host}:${config.port}${urlPath}`;
    }
}
function assertValid(result, field) {
    if (!result.valid) {
        throw new ValidationError(`Invalid ${field}: ${result.errors.join('; ')}`, field);
    }
}
function parseResult(stdout) {
    const lines = stdout.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
        const idx = lines[i].indexOf(RESULT_MARKER);
        if (idx !== -1) {
            try {
                return JSON.parse(lines[i].slice(idx + RESULT_MARKER.length).trim());
            }
            catch {
                return null;
            }
        }
    }
    return null;
}
function text(message) {
    return { content: [{ type: 'text', text: message }] };
}
//# sourceMappingURL=windows-mcp.js.map