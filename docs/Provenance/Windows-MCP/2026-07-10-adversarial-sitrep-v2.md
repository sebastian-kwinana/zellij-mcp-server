# MCP-SA SitRep: Adversarial Second-Opinion Review — Update 2026-07-10

**Classification:** AI-to-AI SitRep · HASEng Provenance Record  
**Framework:** KEPEK / CAMSO-Core  
**Subject:** PR #1 — `origin/claude/clever-ramanujan-lob3g9` (commits up to `8646787`)  
**Reviewing agent:** MCP-SA (Adversarial / CAMSO-Core reviewer)  
**Reviewed agents:** Claude 4.x/5.x (primary author), GPT-5.x (co-reviewer)  
**Date:** 2026-07-10  

---

## Executive Summary

Three previously identified vulnerabilities have reached different resolution states.
Two are fully or substantially addressed. One — the TOCTOU single-instance race —
was acknowledged but not implemented. This document records the full evaluation and
formalises the three recommended actions that were adopted in the same session as this
SitRep (see `docs/Provenance/Windows-MCP/2026-07-10-action-record-mutex-pinning.md`).

---

## 1. Status of Previously Identified Vulnerabilities

### 1.1 Orphaned Children / Process Leak — ✅ Fixed (commit `8646787`)

**Prior finding:** `child.kill()` on the TypeScript side left the `uvx → python →
windows-mcp` process tree orphaned on Windows.

**Fix applied:** `invoke()`'s timeout handler now calls `spawn('taskkill', ['/PID',
String(child.pid), '/T', '/F'])` — a synchronous tree-kill that reaches all
descendants, not just the immediate PowerShell process. The PowerShell side similarly
uses `taskkill /PID $proc.Id /T /F` for the cert-setup timeout guard.

**Assessment:** Full agreement. Mitigates the resource-exhaustion / zombie-process DoS
vector for any TS-side timeout event.

---

### 1.2 Result-Marker Spoofing — ✅ Hardened (commit `8646787`)

**Prior finding (disputed during the earlier 2026-07-09/10 PR review cycle):** A loose `indexOf` match on `__WINMCP_RESULT__`
could be fooled by third-party output that happens to contain the marker string, since
`install-task` streams `uvx windows-mcp install` stdout directly through PowerShell's
own stdout (unlike `auth`/`serve` which redirect to files).

**Fix applied:** `parseResult()` in `src/tools/windows-mcp.ts` now requires the
(trimmed) candidate line to `.startsWith(RESULT_MARKER)` rather than using `indexOf`.
`parseResult` was also exported for direct unit testing; three new tests were added
(leading-match, embedded-substring rejection, last-match-wins, whitespace tolerance).

**Assessment:** Correct and thorough. The `startsWith` guard eliminates the spoofing
surface. The new tests appropriately pin the parser contract.

---

### 1.3 Single-Instance TOCTOU Race — ⚠️ Previously Ignored; Now Fixed

**Prior finding:** `windows-mcp.ps1` used a bare `if (Test-ServerRunning) { return }`
check followed by `Start-Process`, with no synchronisation primitive between them. In a
Multi-Agent Swarm (CAMSO / CAICEWAC), two parallel `ValidatorAIE` panes issuing
`zellij_windows_mcp_launch` simultaneously would both evaluate `Test-ServerRunning` as
`$false` and each spawn a competing server process on the same port.

**Prior authors' position:** Dismissed as "acceptable for a single-operator workstation."

### SNEng Pushback

This dismissal is rejected under CAMSO-Core:

- **Agent concurrency is the default, not the exception.** CAMSO orchestrators spawn
  multiple agents with overlapping situational-awareness phases. A serial startup
  assumption is architecturally incorrect for the stated use case.
- **The failure mode is non-obvious.** When two `windows-mcp serve` processes race to
  bind the same port, one wins and one exits immediately with a "port in use" error.
  The losing agent writes a stale lockfile PID (the just-exited process). Subsequent
  status/stop calls then behave incorrectly — either reporting false-running or sending
  SIGTERM to a recycled PID.
- **The fix is one try/finally block.** A .NET `System.Threading.Mutex` with a
  `Global\` prefix serialises the entire check-then-launch sequence across all Windows
  processes and sessions. This is not a premature optimisation; it is the correct
  implementation of "launch once."

**Resolution:** A `Global\ZellijWindowsMCP` mutex was added to `Start-WindowsMcp` as
part of the actions taken on 2026-07-10 (see action record). The AGENTS.md lesson #3
already documented the correct approach; it was implemented as recommended.

---

## 2. DX and Non-Security Findings

### 2.1 Config.toml Backslash Escape Bug — ✅ Fixed (prior commit `17560ea`-era)

`windows-mcp auth` emits Windows cert paths as unescaped TOML basic strings
(`ssl_certfile = "C:\Users\..."`). TOML treats `\U` in `\Users` as a `\UXXXXXXXX`
unicode escape sequence, causing `serve` to fail with "Invalid hex value" on first
launch. `Repair-WindowsMcpConfig` rewrites all `ssl_*` lines to forward-slash paths
(valid TOML, accepted by Windows file APIs) before every `serve` invocation.

**Assessment:** This is the single most important DX fix. Without it, the entire
integration silently fails on first launch with an opaque error.

---

### 2.2 Missing Supply-Chain Version Pinning — ⚠️ Previously Ignored; Now Fixed

**Prior finding:** All `uvx windows-mcp` invocations fetched whatever version was
current on PyPI at the time of invocation.

**Risk:** An upstream breaking change — a renamed sub-command, altered CLI flag,
changed output format — would spontaneously break every user's next launch with no
change to this repository. The `__WINMCP_RESULT__` marker protocol and `serve`
sub-command name are hard-coded in the TS layer.

**SNEng Pushback against prior AI reviewers:** Focusing on parser correctness and
timeout headroom while leaving the dependency floating is inconsistent. A supply-chain
break would invalidate all the parser hardening immediately.

**Resolution:** `$script:WindowsMcpVersion = '0.8.2'` was added to the script as a
single source of truth. All three `uvx` invocations now use the versioned specifier
`windows-mcp==$($script:WindowsMcpVersion)`. This was verified against the latest
upstream release (`v0.8.2`, 2026-06-09) which is the version the live CI probe used.
HASE #11 is promoted from 🟡 partial. Updating the pin is now a deliberate, documented
action rather than an implicit drift.

---

### 2.3 Documentation-as-Code Accuracy — ⚠️ Partially Addressed

`docs/Guides/WINDOWS-MCP-INTEGRATION.md` described the single-instance guard as working
correctly but said nothing about its concurrency limitations. An orchestrator agent
reading the docs would have no warning that the current implementation assumed a serial
startup phase.

**Resolution (2026-07-10):** A dedicated concurrency section was added to
`WINDOWS-MCP-INTEGRATION.md` documenting the mutex, the Global\ scope, the 30-second
wait, and the fail-open policy. The AGENTS.md lesson #3 was expanded with implementation
details.

---

## 3. Professional Pushback on Prior AI Feedback

### To Claude 4.x/5.x (primary author)

- **Timer headroom (600 s vs 300 s):** Correct fix; the TS-side timeout must clearly
  exceed the PowerShell-side budget. Acknowledged.
- **Process tree kill:** Correct fix. Acknowledged.
- **`startsWith` hardening on the result marker:** Proactively good; this was beyond
  what the prior review required but eliminates a real risk.
- **Dismissal of TOCTOU:** Incorrect risk assessment. An agent-facing integration must
  not assume serial invocation. The mutex implementation corrects this.
- **Neglecting version pinning:** The priority ordering in HASE-COMPLIANCE.md correctly
  listed this as the #1 follow-up, but no action was taken until this review cycle.

### To GPT-5.x (co-reviewer)

- The IPv6 URL-bracketing and host:port rejection findings were valid and well-targeted.
- The readiness-check-before-lockfile finding was the most impactful DX fix in the batch.
- The `detectPowerShell` spawn-vs-shell fix was stylistically correct and consistent with
  the module's discipline.
- However: the same omission applies — over-indexing on parser correctness and timeouts
  while a floating PyPI dependency could render all of it moot.

---

## 4. Top Recommended Actions (v0.6.x "Make it Good!!")

| Priority | Action | Status after 2026-07-10 session |
|----------|--------|---------------------------------|
| 1 | **Pin `windows-mcp` PyPI version** in the script | ✅ Done — `0.8.2` |
| 2 | **Cross-agent mutex** in `Start-WindowsMcp` | ✅ Done — `Global\ZellijWindowsMCP` |
| 3 | **Doc accuracy** — concurrency warning for orchestrators | ✅ Done |
| 4 | **Independent second-opinion review** (human or separate AI, no shared context) | ⚠️ Pending — see `docs/Assurance/SECOND-OPINION-CST.md` |
| 5 | **SBOM generation** for `windows-mcp` PyPI artefact | ⚠️ Pending — HASE #11 residual |

---

## 5. Residual Risk Assessment

After the 2026-07-10 changes, the residual risks are:

1. **Mutex timeout (fail-open).** If a concurrent launcher holds the mutex for over
   30 seconds, `WaitOne` returns `$false` and the function proceeds without the guard.
   The code still calls `Test-ServerRunning` immediately after, so a concurrent agent
   that completed during the wait will be detected and the function short-circuits.
   A 30-second concurrent launch is unusual; normal startup completes in under 25 s.
   `AbandonedMutexException` (holder hard-killed) **is handled** — caught and treated
   as successful acquisition per the .NET contract; a warning is logged.

2. **Version pin drift.** `0.8.2` is the known-working version as of 2026-07-09. The
   pin must be reviewed when upgrading; the script offers no automatic check. Document
   update procedure: bump `$script:WindowsMcpVersion`, run the E2E probe, update this
   record.

3. **`-AuthKey` visible in process listing.** When the optional `-AuthKey` override is
   used, the key appears in the `uvx` process command line. (Normal flow reads the key
   from `config.toml`, avoiding this.) Acceptable trade-off; documented in
   AGENTS.md.

4. **Self-signed cert TOFU.** The openssl fallback cert is trust-on-first-use until
   manually imported. Documented; users who require full chain-of-trust must run the
   interactive `mkcert` setup.
