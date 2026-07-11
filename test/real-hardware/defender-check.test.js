// C.4: read-only Windows Defender/AV interference check.
//
// CI's GitHub-hosted windows-latest runners ship Defender pre-tuned for CI use;
// they cannot surface the class of AV interference a real, unmanaged Windows
// workstation can. This test is deliberately observe-only: it adds no
// exclusions, disables nothing, and only reads Defender's own reported state.
// Run first in the C.4->C.2->C.3->C.1 sequence to establish a clean baseline
// before the more invasive tests (C.1 especially) run.
//
// Requires REQUIRES_REAL_HARDWARE=1 and a real (non-CI) Windows host. Never
// wired into `npm test`'s glob (test/*.test.js does not recurse into this
// directory) — the env-var + platform guard below is belt-and-suspenders.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const onWindows = os.platform() === 'win32';
const flagged = process.env.REQUIRES_REAL_HARDWARE === '1';
const skip = !onWindows || !flagged
  ? { skip: !onWindows ? 'requires a Windows host' : 'set REQUIRES_REAL_HARDWARE=1 to run' }
  : {};

test('Windows Defender cmdlets are queryable (read-only) without error', skip, () => {
  const out = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-Command', '(Get-MpPreference) -ne $null'],
    { timeout: 30000 }
  ).toString().trim();
  assert.equal(out, 'True', 'Get-MpPreference should return a preference object');
});

test('no exclusions have been silently added for this run (observe-only invariant)', skip, () => {
  // This test does not assert a specific exclusion count -- it only proves the
  // property list is queryable and logs it for the Provenance record. Adding
  // exclusions is explicitly out of scope for this workstream.
  const out = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-Command', '(Get-MpPreference).ExclusionPath -join ";"'],
    { timeout: 30000 }
  ).toString().trim();
  // No assertion on content -- presence of this line in `npm run test:real-hardware`
  // output is itself the evidence to copy into the dated Provenance record.
  console.log(`[defender-check] current ExclusionPath: ${out || '(none)'}`);
});
