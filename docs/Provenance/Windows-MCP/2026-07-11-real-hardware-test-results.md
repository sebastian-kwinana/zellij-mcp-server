# Real-Hardware Test Results: C.4 / C.2 / C.3 (C.1 pending human step)

**Classification:** AI-to-AI Provenance Record — HASEng
**Subject:** `test/real-hardware/*.test.js`, first execution
**Environment:** see
[2026-07-11-real-hardware-followon-tracking.md](2026-07-11-real-hardware-followon-tracking.md)
for the dated environment snapshot this record is valid against.

---

## C.4 — Windows Defender / AV interference (read-only) — ✅ complete

`Get-MpPreference` queryable without error. `ExclusionPath` reported
`N/A: Must be an administrator to view exclusions` — this account is not elevated, so
that specific property is inaccessible; this is expected, documented behavior, not a
test failure, and is itself a real finding: some Defender introspection genuinely
requires elevation on a real workstation in a way CI's runner (typically elevated by
default) may not surface identically.

## C.2 — monitor topology — ✅ complete

Confirmed 3 real, distinct displays currently attached:

```
\\.\DISPLAY1 | 1920x1280 | Primary
\\.\DISPLAY2 | 2560x1080 |
\\.\DISPLAY4 | 1920x1080 |
```

Consistent with the earlier read-only hardware probe from this same session. As scoped
in the plan: `windows-mcp.ps1` has zero monitor-enumeration code of its own — this
record captures the topology as a documented fact for a future, separately-scoped
workstream that would drive Windows-MCP's own screenshot/UI-Automation tools against
it; no live screenshot-content assertion is claimed here.

## C.3 — full launcher lifecycle under Windows PowerShell 5.1 — ✅ complete

Both `-Action status` and `-Action stop` run correctly under `powershell.exe`
(Windows PowerShell 5.1) — explicitly, not `pwsh` 7, which
`test/powershell-contract.test.js`'s shell-detection list tries first and would
otherwise mask this gap. Both emitted the expected `__WINMCP_RESULT__` marker:

```
status: {"url":"https://127.0.0.1:8000/mcp/","action":"status","running":false,"listening":false,"host":"127.0.0.1","transport":"streamable-http","pid":null,"tls":true,"port":8000}
stop:   {"port":8000,"host":"127.0.0.1","running":false,"action":"stop"}
```

This closes a real CI-invisible gap: the script's own `#Requires -Version 5.1` floor
had never actually been exercised at that floor by CI (which always has `pwsh` 7
available).

## Bug found and fixed during this run

`mkcert-trust.test.js`'s first check originally used `Get-ChildItem
Cert:\CurrentUser\Root`, which failed with `Cannot find drive` — on this machine, the
Certificate PSProvider's `Cert:` PSDrive is not auto-mounted under
`powershell.exe -NoProfile -Command` invocation. Fixed by querying via
`[System.Security.Cryptography.X509Certificates.X509Store]` directly, which has no
PSDrive dependency. Re-run confirmed the fix: the test now correctly reports "no
mkcert CA found" (a legitimate zero-result skip) instead of crashing on drive
resolution. Commit `7b10cbd`.

## C.1 — the interactive mkcert trust dialog — ⏸ blocked on a human step

**Not yet executed.** Both `mkcert-trust.test.js` assertions correctly
*dynamically-skipped* (not failed) — the CA-in-trust-store check found zero mkcert
CAs, and the TLS-handshake check found no server listening on 127.0.0.1:8000 — because
the precondition (a human running
`pwsh -File scripts/windows/windows-mcp.ps1 -Action setup`, no `-SkipMkcertInstall`,
no `-NonInteractive`, and clicking through the mkcert Windows trust-store dialog once)
has not yet happened.

**Why this session did not attempt it unilaterally:** this is a security-relevant,
system-trust-store-mutating action that may present a real interactive Windows
dialog. This session has no GUI-interaction/computer-use tool capable of clicking
through such a dialog if one appears — attempting the command blind would either (a)
complete silently if no dialog is actually required for the current-user cert store on
this OS/PowerShell combination (genuinely possible, but not something to assume), or
(b) hang for the full 5-minute `-CertSetupTimeoutSec` before the launcher's own
hardening (built in PR #1) safely kills the process tree and logs the failure — a
foreseeable, low-value outcome to walk into blind. The plan this workstream executes
against was explicit that this is "one human click."

**To complete C.1:** run, in an interactive terminal on this machine:
```powershell
pwsh -File scripts\windows\windows-mcp.ps1 -Action setup
```
(no flags suppressing the interactive prompts), click through the trust dialog if one
appears, then re-run:
```powershell
$env:REQUIRES_REAL_HARDWARE = '1'
npm run test:real-hardware
```
Both `mkcert-trust.test.js` assertions should then execute for real rather than skip.
This record will be updated with the result once that happens.
