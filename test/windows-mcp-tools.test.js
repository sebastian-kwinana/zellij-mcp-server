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
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WindowsMCPTools } from '../dist/tools/windows-mcp.js';

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
