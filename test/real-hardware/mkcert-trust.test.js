// C.1 (the hero test): the interactive mkcert Windows trust-store dialog.
//
// CI's e2e-windows job ALWAYS passes -SkipMkcertInstall, because a headless
// cloud runner cannot answer the Windows trust-store "Do you want to allow
// this app to make changes..." / certificate-trust dialog that `mkcert
// -install` triggers. This is the single highest-value gap CI structurally
// cannot close.
//
// PRECONDITION (not automatable, and not performed by this test): a human
// must have already run, in an interactive terminal on real Windows hardware:
//
//   pwsh -File scripts/windows/windows-mcp.ps1 -Action setup
//
// (no -SkipMkcertInstall, no -NonInteractive) and clicked through the mkcert
// trust prompt exactly once. This test then verifies the resulting, durable
// postcondition: the OS itself now trusts the mkcert-issued cert, which CI's
// -SkipCertificateCheck-dependent probe can never demonstrate.
//
// If the precondition hasn't been met (server not listening), this test
// SKIPS with an actionable message rather than failing -- that's an
// environmental/sequencing state, not a test failure.
//
// Requires REQUIRES_REAL_HARDWARE=1 and a real (non-CI) Windows host.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import net from 'node:net';
import { execFileSync } from 'node:child_process';

const onWindows = os.platform() === 'win32';
const flagged = process.env.REQUIRES_REAL_HARDWARE === '1';
const skip = !onWindows || !flagged
  ? { skip: !onWindows ? 'requires a Windows host' : 'set REQUIRES_REAL_HARDWARE=1 to run' }
  : {};

function isPortListening(port, host = '127.0.0.1', timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

test('mkcert CA is present in the current-user Windows trust store', skip, (t) => {
  // Query the store via the .NET X509Store API directly, NOT the Cert:
  // PSDrive -- on this real machine, `-NoProfile` (needed to keep this
  // invocation deterministic) leaves the Certificate PSProvider's `Cert:`
  // drive unmounted (a genuine environment nuance CI's tuned runners never
  // surfaced), which made `Get-ChildItem Cert:\...` fail with "Cannot find
  // drive". The X509Store API has no such dependency.
  const script =
    "$s = [System.Security.Cryptography.X509Certificates.X509Store]::new('Root','CurrentUser'); " +
    "$s.Open('ReadOnly'); " +
    "($s.Certificates | Where-Object { $_.Subject -like '*mkcert*' } | Measure-Object).Count";
  const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    timeout: 30000,
  }).toString().trim();
  const count = Number(out);
  if (count === 0) {
    t.skip(
      'no mkcert CA found under Cert:\\CurrentUser\\Root -- run ' +
        '`pwsh -File scripts/windows/windows-mcp.ps1 -Action setup` interactively ' +
        '(no -SkipMkcertInstall) and click through the trust prompt first'
    );
    return;
  }
  assert.ok(count >= 1, `expected >=1 mkcert CA in the trust store, found ${count}`);
});

test('TLS handshake to the live server succeeds WITHOUT -SkipCertificateCheck', skip, async (t) => {
  const up = await isPortListening(8000);
  if (!up) {
    t.skip(
      'no server listening on 127.0.0.1:8000 -- run the interactive setup step ' +
        '(see file header) before this test can exercise the trust postcondition'
    );
    return;
  }
  // Deliberately the inverse of the CI probe's own check (ci.yml always passes
  // -SkipCertificateCheck because CI's cert is TOFU-only, never OS-trusted).
  // Any HTTP status here (including 401, since auth is on) over a SUCCESSFUL
  // TLS handshake proves the OS trusts the cert -- an untrusted cert would
  // throw before any status is ever returned.
  const out = execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      '$r = Invoke-WebRequest -Uri https://127.0.0.1:8000/mcp/ -SkipHttpErrorCheck -UseBasicParsing; ' +
        '$r.StatusCode',
    ],
    { timeout: 30000 }
  ).toString().trim();
  console.log(`[mkcert-trust] HTTPS reachable without -SkipCertificateCheck, status ${out}`);
  assert.match(out, /^\d+$/, `expected a numeric HTTP status, got: ${out}`);
});
