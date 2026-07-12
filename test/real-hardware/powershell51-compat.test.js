// C.3: full launcher lifecycle under Windows PowerShell 5.1, not pwsh 7.
//
// test/powershell-contract.test.js's shell-detection list tries `pwsh` FIRST
// (['pwsh', 'powershell.exe', ...]), so on a machine that has both (as this one
// does, post Phase-0 bootstrap), that existing test silently prefers pwsh 7 and
// never exercises the pre-existing Windows PowerShell 5.1 -- a configuration
// scripts/windows/windows-mcp.ps1's own `#Requires -Version 5.1` floor claims
// to support but that CI (which always has pwsh 7) never actually tests.
//
// This test explicitly invokes `powershell.exe` (5.1), not `pwsh`, for the
// full status/stop lifecycle -- non-destructive reads/idempotent actions only,
// so it is safe to run standalone without requiring the C.1 setup step to have
// run first in the same invocation (status/stop on an already-stopped server
// are no-ops per the existing single-instance guard contract).
//
// Requires REQUIRES_REAL_HARDWARE=1 and a real (non-CI) Windows host.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const onWindows = os.platform() === 'win32';
const flagged = process.env.REQUIRES_REAL_HARDWARE === '1';
const skip = !onWindows || !flagged
  ? { skip: !onWindows ? 'requires a Windows host' : 'set REQUIRES_REAL_HARDWARE=1 to run' }
  : {};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = path.join(repoRoot, 'scripts', 'windows', 'windows-mcp.ps1');

test('windows-mcp.ps1 -Action status runs under Windows PowerShell 5.1 (not pwsh 7)', skip, () => {
  const out = execFileSync(
    'powershell.exe', // Windows PowerShell 5.1, deliberately not `pwsh`
    ['-NoProfile', '-File', script, '-Action', 'status'],
    { timeout: 30000 }
  ).toString();
  console.log(`[powershell51-compat] status output:\n${out}`);
  assert.match(
    out,
    /__WINMCP_RESULT__/,
    'the script must emit its standard result marker even under PowerShell 5.1'
  );
});

// NOTE for future editors of this directory: this test genuinely stops any
// tracked windows-mcp server as a side effect (that's what it's testing).
// Because Node's `node --test` CLI runs multiple matched files concurrently
// by default, this can race with other files in this directory that need a
// live server (see docs/Provenance/Windows-MCP/
// 2026-07-12-test-suite-ordering-hazard.md). `test:real-hardware` now forces
// --test-concurrency=1 as defense-in-depth, but any NEW file added here that
// needs the server running should still self-provision it (see
// mkcert-trust.test.js's `-Action launch` pattern) rather than assume this
// file hasn't run yet.
test('windows-mcp.ps1 -Action stop is a safe no-op under PowerShell 5.1 when nothing is running', skip, () => {
  const out = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-File', script, '-Action', 'stop'],
    { timeout: 30000 }
  ).toString();
  console.log(`[powershell51-compat] stop output:\n${out}`);
  assert.match(out, /__WINMCP_RESULT__/, 'stop must emit the result marker under 5.1 too');
});
