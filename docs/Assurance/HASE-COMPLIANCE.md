# HASE Compliance Decision Matrix — Windows-MCP Integration

**Scope**: the Windows-MCP integration added on branch `claude/clever-ramanujan-lob3g9`
(`scripts/windows/windows-mcp.ps1`, `src/tools/windows-mcp.ts`, `src/utils/platform.ts`,
`src/utils/config.ts`, validator additions, tool registration).
**Assessment date**: 2026-06-16. **Assessor**: automated agent (Claude); independent
second-opinion review protocol in [CONFIDENCE-RUBRIC.md](CONFIDENCE-RUBRIC.md).

This matrix applies a set of High Assurance Software Engineering (HASE) principles drawn
from Saltzer & Schroeder's secure-design principles, NIST SSDF (SP 800-218), and OWASP
ASVS themes. Ratings are deliberately conservative: **Compliant** requires evidence in
the repository, not intent.

| Rating | Meaning |
|--------|---------|
| ✅ Compliant | Implemented and evidenced in this repository |
| 🟡 Partial | Implemented with documented limitations or residual risk |
| ❌ Gap | Not implemented; remediation identified |
| ➖ N/A | Out of scope for this change |

## Decision matrix

| # | Principle | Rating | Evidence | Residual risk / remediation |
|---|-----------|--------|----------|------------------------------|
| 1 | **Fail-safe (secure) defaults** | ✅ | Defaults are `streamable-http` + TLS + loopback bind (`src/utils/config.ts`); the SSE transport (deprecated by the MCP spec) is opt-in only; upstream Windows-MCP refuses non-loopback binds without auth. | None significant. |
| 2 | **Complete mediation / input validation** | ✅ | Every value forwarded to PowerShell is validated (`validatePort/Host/Transport/CertPath/AuthKey/IpAllowlist` in `src/utils/validator.ts`); arguments passed as argv arrays via `spawn` — never interpolated into a shell string (`src/tools/windows-mcp.ts`); covered by `test/validator.test.js`. | Validation is allowlist-style but not formally verified. |
| 3 | **Fail closed on unsupported platforms** | ✅ | Platform guard runs before any argument processing; hostile input off-Windows produces a refusal, not execution (`test/windows-mcp-tools.test.js`). | — |
| 4 | **Defence in depth** | ✅ | Layers: TS validation → argv-array passing → PowerShell `ValidateSet`/typed params → upstream Windows-MCP loopback/auth refusals → TLS → optional auth key + IP allowlist. | — |
| 5 | **Economy of mechanism** | ✅ | Integration reuses Windows-MCP's own `auth --with-tls`, `serve`, `install` commands rather than reimplementing cert or task logic; one script, one tool module. | — |
| 6 | **Least privilege** | 🟡 | Loopback bind by default; scheduled task registered at `-RunLevel Limited` (upstream); no elevation required for mkcert via scoop. | Windows-MCP itself has full desktop control by design — documented prominently; `-ExecutionPolicy Bypass` is used to invoke our own shipped script (standard practice, but noted). Mitigate by `ip_allowlist` + auth key; consider a dedicated low-privilege user for the scheduled task. |
| 7 | **Idempotency / single instance** | ✅ | Launch-once enforced by port-listen check **and** PID lockfile (`test/powershell-contract.test.js` pins both); **empirically demonstrated** on real `windows-latest` — a second `launch` against a running server correctly reported `"alreadyUp":true` (Actions run 29059674872). The TOCTOU window between check and `Start-Process` is now closed by a `Global\ZellijWindowsMCP` .NET mutex wrapping the entire critical section in `Start-WindowsMcp` (`WaitOne(30000)`, fail-open). PID lockfile written inside the mutex hold so waiting agents find the server up. | Mutex fail-open on 30 s timeout (availability over strict serialisation); `AbandonedMutexException` is caught and treated as successful acquisition per the .NET mutex contract. |
| 8 | **Auditability / observability** | 🟡 | Server stdout/stderr redirected to log files under `%LOCALAPPDATA%\zellij-mcp`; machine-readable JSON status lines; status tool reports PID/URL. | No structured audit log of who launched/stopped; no log rotation. |
| 9 | **Verification & test coverage** | ✅ | 44 unit/contract tests (validators incl. IPv6/host:port, config precedence, platform guard, TS↔PowerShell contract, headless-safety, launch-readiness); PowerShell language-parser + PSScriptAnalyzer gates; smoke script; full suite on `windows-latest` per PR. **The live E2E probe achieved a complete green run on a real `windows-latest` runner** (Actions run 29059674872, 2026-07-10): `winget` uv install → cert/auth-key generation → TLS `serve` launch → confirmed listening → HTTPS handshake reachable (401, correctly rejecting the unauthenticated request) → idempotent relaunch no-op (`alreadyUp:true`) → status → clean stop. Along the way the probe found and drove fixes for **three real bugs no unit test could reach**: `mkcert -install` hanging on an interactive trust dialog (headless), an upstream `UnicodeEncodeError` when `windows-mcp`'s captured stdout hit cp1252, and `serve` failing to parse its own `config.toml` because `auth` writes Windows paths into TOML basic strings unescaped. | The interactive mkcert-trust path (vs. the openssl fallback exercised by the probe) remains human-verified only, by design — it requires a Windows trust-store dialog no headless runner can answer. |
| 10 | **Continuous integration** | ✅ | GitHub Actions pipeline (`.github/workflows/ci.yml`): build + full test suite on `ubuntu-latest` **and** `windows-latest`, dependency audit gate (high/critical), `dist/` drift gate, PSScriptAnalyzer Error-severity gate, dispatch-only Windows E2E probe. Design rationale in [ADR-001](../ADRs/CI/001-tiered-ci-for-windows-mcp.md). Observed green on every PR run since, including a full pass of the dispatched live probe (run 29059674872). | Live E2E remains a manually-dispatched probe, not a blocking gate by design; promote toward required status after further consecutive green runs. |
| 11 | **Supply-chain integrity** | ✅ | Single runtime dependency (`@modelcontextprotocol/sdk`) with committed lockfile; `npm audit` clean and gated in CI at high/critical; `node_modules/` untracked — lockfile + `npm ci` is the single source of truth; mkcert from official package-manager IDs; CI restricted to official pinned actions with a read-only token. `windows-mcp` now pinned to `0.8.2` (`$script:WindowsMcpVersion` in `windows-mcp.ps1`; upgrade procedure in `../Provenance/Windows-MCP/2026-07-10-action-record-mutex-pinning.md`). | No SBOM for the `windows-mcp` PyPI artefact; no hash verification of the wheel. |
| 12 | **Cryptographic hygiene** | 🟡 | TLS via mkcert-issued, locally-trusted certs (local CA never leaves the machine); auth key generated upstream with `secrets.token_urlsafe(32)`; openssl fallback is RSA-4096. | Self-signed fallback is trust-on-first-use until manually imported; no cert rotation/expiry monitoring (mkcert default validity applies). |
| 13 | **Error handling & typed failure** | ✅ | Typed errors (`ValidationError`/`SecurityError`/`ZellijError`) mapped to MCP error codes; the PowerShell script traps all exceptions, emits a JSON error record, and exits non-zero. | — |
| 14 | **Open design & documentation** | ✅ | Full design, security notes, interactive-vs-automated split, and verification steps in `docs/Guides/WINDOWS-MCP-INTEGRATION.md`; MIT licence; this matrix. | — |
| 15 | **Reproducible builds** | ✅ | Deterministic `tsc` build; lockfile committed; CI `quality` job rebuilds from a cold `npm ci` and fails on any `git diff` in `dist/` — the committed-`dist/` convention can no longer drift from `src/`. | — |
| 16 | **Rate limiting / DoS resistance** | ✅ | All five tools inherit the server-wide per-tool rate limiter (50 req/min, `src/index.ts`); script invocations carry hard timeouts (30 s–300 s). | — |
| 17 | **Secrets handling** | 🟡 | Auth key accepted via env var (`ZELLIJ_WINMCP_AUTH_KEY`) or upstream `config.toml`; never logged by our code; validated charset prevents log-breaking values. | Passing `-AuthKey` on a command line is visible to local process listing for the script's lifetime; prefer the upstream config-file path (default flow) — documented. |
| 18 | **Formal methods / independent review** | ❌→🟡 | No formal verification (out of proportion for this component). Independent review protocol prepared: [CONFIDENCE-RUBRIC.md](CONFIDENCE-RUBRIC.md) is self-contained for scoring by a second, independent frontier model from a different provider. | Complete the second-opinion review and record its scores alongside the self-assessment. |

## Summary

*(Revised 2026-07-10: the dispatched live Windows E2E probe achieved a complete green
run — cert/auth-key generation, TLS launch, HTTPS reachability, idempotent relaunch,
status, and clean stop, all confirmed on a real `windows-latest` runner. Row 9 promoted
to Compliant; row 7's idempotency claim now has direct empirical evidence. Additionally,
the TOCTOU / mutex fix (row 7 → ✅) and `windows-mcp` version pin (row 11 → ✅) were
implemented following the adversarial SitRep v2 (`../Provenance/Windows-MCP/2026-07-10-adversarial-sitrep-v2.md`).)*

- **Compliant: 13** (1–5, 7, 9, 10, 11, 13–16) — core security posture, mutex-guarded
  single-instance launch, pinned supply chain, drift-gated reproducible builds, and
  both static + live-runner verification.
- **Partial: 4** (6, 8, 12, 17) — implemented with documented, bounded residual risk.
- **Gap: 1** (18 independent review — protocol ready in
  [SECOND-OPINION-CST.md](SECOND-OPINION-CST.md); execution pending).

**Overall judgement**: the integration follows secure-by-default, validated-input,
fail-closed design, is regression-tested on every push on both target OS families, its
build artefacts are drift-gated, and its live launch chain has now been exercised
end-to-end on real Windows — not merely reasoned about. Remaining investments in
effort-to-assurance order: **complete the independent second-opinion review → add an SBOM / stronger artefact-integrity story for the `windows-mcp` PyPI package → accumulate further green dispatched-probe runs before considering promotion toward a blocking gate**.
