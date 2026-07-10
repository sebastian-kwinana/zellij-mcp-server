// Tests for the WindowsMCPTools MCP tool surface.
//
// On non-Windows hosts (CI, Linux dev boxes) every tool must fail closed:
// return a clear "Windows-only" message and perform no action. The
// Windows-side execution path (PowerShell invocation, single-instance launch)
// is covered by the on-host checklist in docs/WINDOWS-MCP-INTEGRATION.md and
// the PowerShell parser gate in test/powershell-syntax.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WindowsMCPTools, parseResult } from '../dist/tools/windows-mcp.js';

const onWindows = os.platform() === 'win32';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('all five tools fail closed on non-Windows hosts', { skip: onWindows }, async () => {
  for (const action of ['setup', 'launch', 'status', 'stop', 'installTask']) {
    const res = await WindowsMCPTools[action]({ port: 9443 });
    assert.ok(Array.isArray(res.content), `${action}: ToolResponse shape`);
    assert.equal(res.content[0].type, 'text');
    assert.match(res.content[0].text, /Windows-only/, `${action}: must state it is Windows-only`);
  }
});

test('guard responses identify the current platform for diagnosability', { skip: onWindows }, async () => {
  const res = await WindowsMCPTools.status({});
  assert.ok(
    res.content[0].text.includes(os.platform()),
    'guard message should name the actual host platform'
  );
});

test('guard runs before any argument processing (no throw on bad input off-Windows)', { skip: onWindows }, async () => {
  // Off-Windows the platform guard must win even for hostile input: nothing
  // is validated, spawned, or executed.
  const res = await WindowsMCPTools.launch({ host: 'evil; rm -rf /', port: -1 });
  assert.match(res.content[0].text, /Windows-only/);
});

test('the PowerShell integration script ships at the path the tools resolve', () => {
  const script = path.join(repoRoot, 'scripts', 'windows', 'windows-mcp.ps1');
  assert.ok(existsSync(script), `expected ${script} to exist`);
});

test('parseResult only matches a line that STARTS WITH the marker', () => {
  const good = 'other log line\n__WINMCP_RESULT__ {"running":true,"pid":123}\n';
  assert.deepEqual(parseResult(good), { running: true, pid: 123 });

  // Install-Task streams `uvx windows-mcp install` output directly; unlike
  // auth/serve (redirected to files), a substring anywhere on the line must
  // NOT be mistaken for the real result line.
  const spoofed = 'note: see __WINMCP_RESULT__ in the docs for the JSON schema\n';
  assert.equal(parseResult(spoofed), null, 'a marker embedded mid-line must not be parsed as a result');

  // Leading/trailing whitespace around a genuine marker line is tolerated.
  const padded = '  __WINMCP_RESULT__ {"running":false}  \n';
  assert.deepEqual(parseResult(padded), { running: false });

  assert.equal(parseResult('no marker here at all'), null);
});

test('parseResult picks the LAST matching line when multiple are present', () => {
  const multi = '__WINMCP_RESULT__ {"pid":1}\nsome other output\n__WINMCP_RESULT__ {"pid":2}\n';
  assert.deepEqual(parseResult(multi), { pid: 2 });
});

test("setup()'s timeout has real headroom over the PowerShell script's own cert-setup budget", () => {
  // The PS script's own -CertSetupTimeoutSec defaults to 300s (300_000ms) for
  // the cert step ALONE, before mkcert package-manager install attempts and
  // the launch+readiness wait are even accounted for. The TS-side timeout for
  // setup() must safely exceed that inner budget, not merely match it — a
  // 1:1 match risks the TS layer killing PowerShell mid-cleanup.
  const script = readFileSync(path.join(repoRoot, 'scripts', 'windows', 'windows-mcp.ps1'), 'utf8');
  const match = script.match(/\[int\]\$CertSetupTimeoutSec\s*=\s*(\d+)/);
  assert.ok(match, 'expected to find the PS-side default $CertSetupTimeoutSec');
  const psInnerBudgetMs = Number(match[1]) * 1000;

  const src = readFileSync(path.join(repoRoot, 'src', 'tools', 'windows-mcp.ts'), 'utf8');
  const tsMatch = src.match(/return this\.run\('setup', opts, ([\d_]+)\)/);
  assert.ok(tsMatch, "expected to find setup()'s TS-side timeout");
  const tsTimeoutMs = Number(tsMatch[1].replace(/_/g, ''));

  assert.ok(
    tsTimeoutMs >= psInnerBudgetMs + 60_000,
    `TS setup() timeout (${tsTimeoutMs}ms) must exceed the PS cert-setup budget ` +
      `(${psInnerBudgetMs}ms) by at least 60s of headroom for mkcert install + launch + readiness`
  );
});
