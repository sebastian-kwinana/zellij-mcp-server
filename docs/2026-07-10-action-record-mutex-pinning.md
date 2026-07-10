# HASEng Action Record — Mutex + Version Pinning

**Type:** HASEng Provenance / Attestation Record  
**Date:** 2026-07-10  
**Branch:** `copilot/windows-mcp-integration` (based on `claude/clever-ramanujan-lob3g9` @ `8646787`)  
**Triggered by:** Adversarial SitRep v2 (`docs/2026-07-10-adversarial-sitrep-v2.md`)  
**HASE principles addressed:** #3 (single-instance guard), #11 (supply-chain integrity)  

---

## Actions Taken

### Action 1 — Pin `windows-mcp` PyPI version (HASE #11)

**Problem:** All three `uvx windows-mcp` invocations (`auth`, `serve`, `install`) fetched
the latest PyPI release at invocation time. A breaking upstream change (renamed
sub-command, altered CLI flags, changed output format, removed Python version support)
would silently break users' next launch with no change to this repository.

**Decision:** Pin to `0.8.2` — the release current as of the live CI probe (2026-07-09,
Actions run 29059674872) and the latest release as of 2026-07-10. This is the only
version against which the full integration has been empirically validated end-to-end.

**Implementation:**
- Added `$script:WindowsMcpVersion = '0.8.2'` near the top of `windows-mcp.ps1`
  (single source of truth; update here to upgrade).
- All three `uvx` arg arrays now use `"windows-mcp==$($script:WindowsMcpVersion)"` as
  the tool specifier instead of bare `'windows-mcp'`.
- Added a contract test in `test/powershell-contract.test.js` asserting that the script
  contains a version variable and uses a pinned specifier.
- Updated `docs/WINDOWS-MCP-INTEGRATION.md` prerequisites table to show the pinned version.
- Updated HASE #11 in `docs/HASE-COMPLIANCE.md` from 🟡 partial to ✅ compliant.

**Upgrade procedure:** Bump `$script:WindowsMcpVersion`, run `npm test` (contract tests
will pass), then run the `e2e-windows` dispatch probe to confirm the new version works
end-to-end. Update this record with the new version and probe run ID.

**Version history:**
| Version | Date pinned | Probe run | Notes |
|---------|-------------|-----------|-------|
| `0.8.2` | 2026-07-10 | 29059674872 | Initial pin; first fully validated release |

---

### Action 2 — System-wide `Global\ZellijWindowsMCP` mutex (HASE #3 / TOCTOU)

**Problem:** `Start-WindowsMcp` evaluated `Test-ServerRunning` and then called
`Start-Process` with no synchronisation between them. In a multi-agent swarm
(CAMSO / CAICEWAC), two parallel `zellij_windows_mcp_launch` calls could both
evaluate `$false` and each spawn a competing `windows-mcp serve` on the same port.
The losing process exits immediately with "port in use"; the agent that sees its
process exit before the port is bound writes a stale PID lockfile and subsequent
`status`/`stop` operations behave incorrectly.

**Decision:** Wrap the critical section (from `Test-ServerRunning` through
`Set-Content $LockFile`) in a `[System.Threading.Mutex]` with a `Global\` prefix.
The `Global\` scope makes the mutex visible across all Windows sessions and processes,
including elevated and non-elevated contexts.

**Implementation:**
- A `[System.Threading.Mutex]::new($false, 'Global\ZellijWindowsMCP')` instance is
  created at the top of `Start-WindowsMcp`.
- `WaitOne(30000)` is called to acquire it (30-second timeout). If the timeout expires,
  the function emits a warning and continues without the mutex guard (fail-open: a 30-
  second concurrent launch is more likely a stuck agent than an intentional race; we
  prefer availability over a deadlock).
- The PID lockfile is written *inside* the mutex hold, so any waiting agent that next
  calls `Test-ServerRunning` will find either the port listening or the lockfile and
  short-circuit.
- `finally { if ($mutexAcquired) { $mutex.ReleaseMutex() }; $mutex.Dispose() }` ensures
  the mutex is released on all paths including exceptions.
- Added a contract test asserting `Global\ZellijWindowsMCP` is present in the script.

**Residual — mutex timeout (fail-open):**
If no other agent releases the mutex within 30 seconds, `WaitOne` returns `$false` and
the function proceeds without the guard (fail-open for availability). On timeout the
code still calls `Test-ServerRunning`, so if a concurrent agent succeeded during the
wait it will be detected and the function short-circuits. A 30-second concurrent launch
is unusual; normal startup completes in under 25 seconds.

`AbandonedMutexException` (hard-kill of the mutex holder) **is** now caught and treated
as successful acquisition — per the .NET contract, ownership transfers to the catching
thread when a mutex is abandoned. A warning is logged.

---

## Files Changed

| File | Change |
|------|--------|
| `scripts/windows/windows-mcp.ps1` | Added `$script:WindowsMcpVersion`; pinned all uvx calls; added mutex to `Start-WindowsMcp` |
| `test/powershell-contract.test.js` | Added contract tests for mutex presence and version pinning |
| `docs/WINDOWS-MCP-INTEGRATION.md` | Added concurrency warning section; updated prerequisites with pinned version |
| `scripts/windows/AGENTS.md` | Expanded lesson #3 (TOCTOU → implemented); added lesson #9 (version pinning) |
| `docs/HASE-COMPLIANCE.md` | Promoted HASE #11 to ✅; updated HASE #3 TOCTOU entry |
| `.github/copilot-instructions.md` | Removed stale "unpinned uvx" intentional-decisions note |
| `.github/instructions/windows-mcp.instructions.md` | Removed "do not flag unpinned uvx" from reviewer directives |
| `docs/2026-07-10-adversarial-sitrep-v2.md` | New — adversarial SitRep (provenance) |
| `docs/2026-07-10-action-record-mutex-pinning.md` | New — this file (HASEng action record) |
