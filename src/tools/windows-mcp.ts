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
import { Validator } from '../utils/validator.js';
import { isWindows, describePlatform } from '../utils/platform.js';
import { resolveWindowsMCPConfig } from '../utils/config.js';
import { ToolResponse, ValidationError, WindowsMCPConfig } from '../types/zellij.js';

const RESULT_MARKER = '__WINMCP_RESULT__';

export interface WindowsMCPToolOptions {
  transport?: 'streamable-http' | 'sse';
  host?: string;
  port?: number;
  authKey?: string;
  ipAllowlist?: string;
  certFile?: string;
  keyFile?: string;
  force?: boolean;
}

export class WindowsMCPTools {
  private static shell: string | null = null;

  // ----- public tool methods -----

  static async setup(opts: WindowsMCPToolOptions = {}): Promise<ToolResponse> {
    // The PowerShell script's own cert-setup step already budgets up to 300s
    // (-CertSetupTimeoutSec default) BEFORE mkcert package-manager install
    // attempts (scoop/winget/choco) and the subsequent launch + readiness wait
    // (~20s) are even accounted for. A TS-side timeout equal to that inner
    // budget could kill the script mid-setup, right as PowerShell's own
    // timeout/cleanup logic is trying to run. Budget generous headroom above
    // the worst-case PS-side total instead of matching it 1:1.
    return this.run('setup', opts, 600_000);
  }

  static async launch(opts: WindowsMCPToolOptions = {}): Promise<ToolResponse> {
    return this.run('launch', opts, 120_000);
  }

  static async status(opts: WindowsMCPToolOptions = {}): Promise<ToolResponse> {
    return this.run('status', opts, 30_000);
  }

  static async stop(opts: WindowsMCPToolOptions = {}): Promise<ToolResponse> {
    return this.run('stop', opts, 30_000);
  }

  static async installTask(opts: WindowsMCPToolOptions = {}): Promise<ToolResponse> {
    return this.run('install-task', opts, 120_000);
  }

  // ----- internals -----

  private static async run(
    action: string,
    opts: WindowsMCPToolOptions,
    timeoutMs: number
  ): Promise<ToolResponse> {
    if (!isWindows()) {
      return text(
        `Windows-MCP integration is Windows-only. Current host platform is ${describePlatform()}. ` +
          `Run this on the Windows machine where zellij/Windows-MCP live.`
      );
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

    const summary =
      result?.error
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

  private static buildArgs(action: string, config: WindowsMCPConfig, force: boolean): string[] {
    // Validate everything that is forwarded to PowerShell / windows-mcp.
    assertValid(Validator.validateTransport(config.transport), 'transport');
    assertValid(Validator.validateHost(config.host), 'host');
    assertValid(Validator.validatePort(config.port), 'port');
    if (config.authKey) assertValid(Validator.validateAuthKey(config.authKey), 'authKey');
    if (config.ipAllowlist) assertValid(Validator.validateIpAllowlist(config.ipAllowlist), 'ipAllowlist');
    if (config.certFile) assertValid(Validator.validateCertPath(config.certFile, 'certFile'), 'certFile');
    if (config.keyFile) assertValid(Validator.validateCertPath(config.keyFile, 'keyFile'), 'keyFile');

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
    if (config.authKey) args.push('-AuthKey', config.authKey);
    if (config.ipAllowlist) args.push('-IpAllowlist', config.ipAllowlist);
    if (config.certFile && config.keyFile) {
      args.push('-CertFile', config.certFile, '-KeyFile', config.keyFile);
    }
    if (force) args.push('-Force');
    return args;
  }

  private static resolveScriptPath(): string {
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
      throw new ValidationError(
        `Could not locate windows-mcp.ps1 (looked in: ${candidates.join(', ')})`
      );
    }
    return found;
  }

  private static async detectPowerShell(): Promise<string> {
    if (this.shell) return this.shell;
    // Prefer PowerShell 7+ (pwsh); fall back to Windows PowerShell. Probe via
    // spawn + argv (no shell) to match the rest of this module's discipline.
    for (const candidate of ['pwsh', 'powershell.exe']) {
      const ok = await new Promise<boolean>((resolve) => {
        try {
          const child = spawn(candidate, ['-NoProfile', '-Command', 'exit 0'], { windowsHide: true });
          const timer = setTimeout(() => {
            child.kill();
            resolve(false);
          }, 10_000);
          child.on('error', () => {
            clearTimeout(timer);
            resolve(false);
          });
          child.on('close', (code) => {
            clearTimeout(timer);
            resolve(code === 0);
          });
        } catch {
          resolve(false);
        }
      });
      if (ok) {
        this.shell = candidate;
        return candidate;
      }
    }
    this.shell = 'powershell.exe';
    return this.shell;
  }

  private static invoke(
    shell: string,
    args: string[],
    timeoutMs: number
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      // spawn with an argv array (no shell) so values are never re-parsed.
      const child = spawn(shell, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        // child.kill() only signals the immediate PowerShell process; on
        // Windows it does not terminate its descendants (uvx -> python ->
        // mkcert/windows-mcp). Use taskkill /T to take the whole tree, so a
        // TS-side timeout can never leave an orphaned grandchild running.
        if (child.pid) {
          spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }).on(
            'error',
            () => child.kill()
          );
        } else {
          child.kill();
        }
      }, timeoutMs);

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

  private static describeUrl(config: WindowsMCPConfig): string {
    const urlPath = config.transport === 'sse' ? '/sse' : '/mcp/';
    return `https://${formatHostForUrl(config.host)}:${config.port}${urlPath}`;
  }
}

function assertValid(result: { valid: boolean; errors: string[] }, field: string): void {
  if (!result.valid) {
    throw new ValidationError(`Invalid ${field}: ${result.errors.join('; ')}`, field);
  }
}

export function parseResult(stdout: string): any | null {
  const lines = stdout.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    // Write-Result always emits the marker as the first token of its own
    // Write-Host line. Require the (trimmed) line to START WITH the marker,
    // not merely contain it anywhere — Install-Task streams `uvx windows-mcp
    // install` output directly (unlike auth/serve, which redirect to files),
    // so a substring match could misparse unrelated third-party output that
    // happens to contain the marker text.
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith(RESULT_MARKER)) {
      try {
        return JSON.parse(trimmedLine.slice(RESULT_MARKER.length).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function text(message: string): ToolResponse {
  return { content: [{ type: 'text', text: message }] };
}

/** Bracket IPv6 literals for use in a URL authority (e.g. ::1 -> [::1]). */
function formatHostForUrl(host: string): string {
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`;
  }
  return host;
}
