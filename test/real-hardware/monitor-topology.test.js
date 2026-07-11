// C.2: monitor topology, honestly scoped.
//
// scripts/windows/windows-mcp.ps1 has ZERO monitor-enumeration code -- the real
// target for a live screenshot-content assertion would be upstream
// CursorTouch/Windows-MCP's own tool surface, which is out of scope for this
// repo. This test captures the real topology as a documented fact for the
// Provenance record and asserts only a loose "multiple real displays" claim --
// do not extend this into an overclaimed content assertion this repo's code
// does not support.
//
// Requires REQUIRES_REAL_HARDWARE=1 and a real (non-CI) Windows host.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const onWindows = os.platform() === 'win32';
const flagged = process.env.REQUIRES_REAL_HARDWARE === '1';
const skip = !onWindows || !flagged
  ? { skip: !onWindows ? 'requires a Windows host' : 'set REQUIRES_REAL_HARDWARE=1 to run' }
  : {};

test('at least 2 real displays are detected (a topology CI cloud VMs cannot replicate)', skip, () => {
  const script =
    'Add-Type -AssemblyName System.Windows.Forms; ' +
    '[System.Windows.Forms.Screen]::AllScreens | ' +
    'ForEach-Object { "$($_.DeviceName)|$($_.Bounds.Width)x$($_.Bounds.Height)|$($_.Primary)" }';
  const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    timeout: 30000,
  }).toString().trim();
  const lines = out.split(/\r?\n/).filter(Boolean);
  console.log(`[monitor-topology] detected displays:\n${lines.join('\n')}`);
  assert.ok(
    lines.length >= 2,
    `expected >=2 real displays on this docked machine, got ${lines.length}: ${out}`
  );
});
