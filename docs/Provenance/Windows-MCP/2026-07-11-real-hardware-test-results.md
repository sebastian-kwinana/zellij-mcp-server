# Real-Hardware Test Results: C.4 / C.2 / C.3 / C.1 — all complete (7/7)

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

## C.1 — the interactive mkcert trust dialog — ✅ complete (human-executed)

The user (Sebastian) ran `pwsh -File scripts\windows\windows-mcp.ps1 -Action setup`
interactively. Output: `mkcert is already installed` — no new interactive dialog
appeared this time (the CA was apparently already trusted from a prior manual mkcert
use on this machine), confirmed `Certificate + auth key configured`, launched
successfully (`PID=29220`, `https://127.0.0.1:8000/mcp/`).

**A real bug was found and fixed on the first verification attempt.** The
TLS-handshake assertion initially failed:
```
Invoke-WebRequest : A parameter cannot be found that matches parameter name
'SkipHttpErrorCheck'.
```
Root cause: `-SkipHttpErrorCheck` is a **PowerShell 7+-only** `Invoke-WebRequest`
parameter (does not exist in Windows PowerShell 5.1). The test had been written to
shell out via `powershell.exe` (5.1) — a copy-paste of CI's own probe flag pattern
without noticing CI always runs that specific check via `pwsh`. The
`ParameterBindingException` meant the command never executed, so the captured output
was `''`, which then correctly failed the `/^\d+$/` regex match with
`actual: ''`. **Fix:** switched this one check to use `pwsh` explicitly (not
`powershell.exe`) — deliberately, since this test is about cert *trust*, not
PowerShell-*version* compatibility (that's `powershell51-compat.test.js`'s distinct
job); using `pwsh` holds the PS-version variable constant against CI's own
`e2e-windows` probe, isolating cert trust as the one thing genuinely under test.
Commit (pending, this record's own commit).

**Re-run after the fix — full pass:**
```
✔ mkcert CA is present in the current-user Windows trust store
[mkcert-trust] HTTPS reachable without -SkipCertificateCheck, status 401
✔ TLS handshake to the live server succeeds WITHOUT -SkipCertificateCheck
```
Status `401` (auth key correctly rejecting the unauthenticated request) over a
**successful** TLS handshake, without `-SkipCertificateCheck`, is the actual claim
this test exists to prove — the one thing CI's headless `e2e-windows` probe
structurally cannot demonstrate (it always needs `-SkipCertificateCheck`, since its
cert is TOFU-only, never OS-trusted). **Final tally: 7/7 real-hardware tests pass.**

## A second, unrelated finding surfaced during C.1 re-verification

To re-run the TLS check, this session brought the server back up via
`-Action launch -NonInteractive` (safe/idempotent — cert already configured, no
interactive prompt). It reported `"alreadyUp":true` with `"pid":null`. Investigation
(`Get-NetTCPConnection -LocalPort 8000`, `Get-Process`, and confirming
`%LOCALAPPDATA%\zellij-mcp\windows-mcp.pid` does **not exist**) found: port 8000 *was*
genuinely listening (owned by a live `python.exe`/`windows-mcp.exe` process pair,
process-start timestamp well after the original `PID=29220` had already been
confirmed stopped by the C.3 test run) — but with **no PID lockfile at all**, meaning
it was never launched through `Start-WindowsMcp`'s mutex-guarded path.

**Best-evidence hypothesis, not fully proven:** this session's own earlier
`claude mcp list` / `grok mcp list` diagnostic calls (run during Phase D registration,
after C.3's test had already stopped the original PID and freed port 8000) most likely
triggered those CLIs' own connectivity health-checks against the **pre-existing**
`WinMCPstdio` (claude) / `windows-mcp` (grok) MCP registrations — both configured to
run `uvx windows-mcp==0.8.2 serve` *directly*, entirely bypassing
`windows-mcp.ps1`/`Start-WindowsMcp`'s mutex and PID-lockfile bookkeeping. If correct,
this is a genuine, if unanticipated, instance of exactly the class of risk the
project's triadic decision-framework debate flagged during planning (external,
uncoordinated processes reaching Windows-MCP outside the launcher's own concurrency
guard) — just via a different mechanism (an MCP client's own health-check spawn) than
the one debated (`zellij_write_to_pane` focus races). Consequence observed: `-Action
stop` cannot track or kill this process (`"No tracked Windows-MCP process to stop"`),
though the mutex-guarded *launch* path itself still behaved safely and correctly (the
port-check branch of `Test-ServerRunning` detected it and avoided a double-bind).

**Not resolved in this session** — the process was left running (it was live,
correctly serving the passing test's requests; killing a working, in-use server on an
unconfirmed hypothesis was judged the wrong call). Recommended follow-up: decide
whether pre-existing MCP client configs that bypass the launcher script entirely
(`WinMCPstdio`, `windows-mcp` → raw `uvx windows-mcp==0.8.2 serve`) should be
reconfigured to invoke `windows-mcp.ps1 -Action launch` instead, so all paths converge
on the same mutex/lockfile-guarded launch.
