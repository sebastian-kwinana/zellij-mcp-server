// Contract tests between the TypeScript tool layer and the PowerShell script.
//
// The TS layer invokes windows-mcp.ps1 with specific parameter names and parses
// a JSON line tagged with a result marker. These tests pin that contract on any
// platform by inspecting the script text, and — when a PowerShell binary is
// available — run the real PowerShell language parser over the script.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repoRoot, 'scripts', 'windows', 'windows-mcp.ps1');
const script = readFileSync(scriptPath, 'utf8');

test('script declares every action the TS layer can request', () => {
  const validateSet = script.match(/ValidateSet\('setup', 'launch', 'status', 'stop', 'install-task'\)/);
  assert.ok(validateSet, 'expected -Action ValidateSet with setup|launch|status|stop|install-task');
});

test('script declares every parameter the TS layer passes', () => {
  for (const param of [
    '$Action', '$Transport', '$BindHost', '$Port', '$AuthKey',
    '$IpAllowlist', '$CertFile', '$KeyFile', '$NonInteractive', '$Force',
  ]) {
    assert.ok(script.includes(param), `expected script to declare ${param}`);
  }
});

test('script emits the exact result marker the TS layer parses', () => {
  // Must match RESULT_MARKER in src/tools/windows-mcp.ts.
  assert.ok(script.includes("'__WINMCP_RESULT__'"), 'result marker must stay in sync with the TS parser');
});

test('script restricts transports to the secure set', () => {
  assert.ok(
    /ValidateSet\('streamable-http', 'sse'\)/.test(script),
    'transport ValidateSet must allow only streamable-http and sse'
  );
});

test('single-instance guard uses both a port check and a PID lockfile', () => {
  assert.ok(script.includes('Get-NetTCPConnection'), 'port-listening check present');
  assert.ok(script.includes('windows-mcp.pid'), 'PID lockfile present');
});

test('mkcert install follows the scoop -> winget -> choco fallback chain', () => {
  // Match the mkcert install commands specifically; 'winget install' also
  // appears earlier in the script as a hint for installing uv.
  const scoop = script.indexOf('scoop install mkcert');
  const winget = script.indexOf('FiloSottile.mkcert');
  const choco = script.indexOf('choco install mkcert');
  assert.ok(scoop !== -1 && winget !== -1 && choco !== -1, 'all three package managers handled');
  assert.ok(scoop < winget && winget < choco, 'fallback order must be scoop, then winget, then choco');
});

test('cert setup is headless-safe: bounded, logged, and has an openssl escape hatch', () => {
  // Lesson (2026-07-09): `mkcert -install` inside `windows-mcp auth --with-tls`
  // blocks on an interactive Windows trust dialog in headless/CI sessions. The
  // script must not hang there — it must time out, log to file, and offer a way
  // to bypass mkcert. Pin each safeguard so it cannot silently regress.
  assert.ok(/WaitForExit\(\s*\$?CertSetupTimeoutSec/.test(script) || script.includes('WaitForExit'),
    'cert setup must run under a timeout (WaitForExit), not an unbounded call');
  assert.ok(script.includes('-CertSetupTimeoutSec') || script.includes('$CertSetupTimeoutSec'),
    'a configurable cert-setup timeout must exist');
  assert.ok(script.includes('-RedirectStandardOutput') && script.includes('AuthLog'),
    'cert setup output must be captured to a log file');
  assert.ok(script.includes('$SkipMkcertInstall') || script.includes('-SkipMkcertInstall'),
    'a -SkipMkcertInstall escape hatch (openssl fallback) must exist for headless use');
  assert.ok(script.includes('taskkill'),
    'a timed-out cert-setup process tree must be force-killed (taskkill /T)');
  // Lesson: windows-mcp prints Unicode (U+2192) via click.echo; captured stdout
  // defaults to cp1252 on Windows and crashes. Force Python UTF-8 mode.
  assert.ok(script.includes('PYTHONUTF8') && script.includes('PYTHONIOENCODING'),
    'child Python must run in UTF-8 mode so captured Unicode output does not crash');
});

test('PowerShell language parser reports no syntax errors (when pwsh/powershell available)', (t) => {
  const shells = ['pwsh', 'powershell.exe', '/tmp/pwsh/pwsh'];
  let shell = null;
  for (const candidate of shells) {
    try {
      execFileSync(candidate, ['-NoProfile', '-Command', 'exit 0'], { stdio: 'ignore', timeout: 15000 });
      shell = candidate;
      break;
    } catch {
      /* try next */
    }
  }
  if (!shell) {
    t.skip('no PowerShell binary available on this host');
    return;
  }
  const psCommand = `
    $errors = $null; $tokens = $null;
    [System.Management.Automation.Language.Parser]::ParseFile('${scriptPath}', [ref]$tokens, [ref]$errors) | Out-Null;
    if ($errors -and $errors.Count -gt 0) { $errors | ForEach-Object { Write-Output $_.Message }; exit 1 }
    exit 0`;
  const out = execFileSync(shell, ['-NoProfile', '-Command', psCommand], { timeout: 60000 }).toString();
  assert.equal(out.trim(), '', `parser errors: ${out}`);
});
