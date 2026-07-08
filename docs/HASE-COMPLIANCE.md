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
| 7 | **Idempotency / single instance** | 🟡 | Launch-once enforced by port-listen check **and** PID lockfile (`test/powershell-contract.test.js` pins both). | Check-then-act has an inherent TOCTOU window between port check and process start; acceptable for a single-operator workstation, would need a named mutex for multi-agent concurrency. |
| 8 | **Auditability / observability** | 🟡 | Server stdout/stderr redirected to log files under `%LOCALAPPDATA%\zellij-mcp`; machine-readable JSON status lines; status tool reports PID/URL. | No structured audit log of who launched/stopped; no log rotation. |
| 9 | **Verification & test coverage** | 🟡 | `npm test`: unit tests for validators, config precedence, platform guard, TS↔PowerShell contract; PowerShell language-parser gate (runs when a PowerShell binary is present); standalone smoke script (`test-windows-mcp.js`); CI now executes the full suite on `windows-latest` per PR, and a dispatch-only live E2E probe exists (`e2e-windows` in `.github/workflows/ci.yml`). | The live launch path (cert generation, TLS serve) remains a manually-triggered probe, not a blocking gate. Remediation: promote the probe once it proves stable across ~5 dispatched runs. |
| 10 | **Continuous integration** | ✅ | GitHub Actions pipeline (`.github/workflows/ci.yml`): build + full test suite on `ubuntu-latest` **and** `windows-latest`, dependency audit gate (high/critical), `dist/` drift gate, PSScriptAnalyzer Error-severity gate, dispatch-only Windows E2E probe. Design rationale in [CI-DECISION-RECORD.md](CI-DECISION-RECORD.md). First execution observed green on PR #1 (Actions run 28933079883: both OS legs + quality gates passed; e2e correctly skipped on PR events). | Live E2E remains a dispatch-only probe (tracked under #9). |
| 11 | **Supply-chain integrity** | 🟡 | Single runtime dependency (`@modelcontextprotocol/sdk`) with committed lockfile; `npm audit` clean (5 advisories, 2 high, fixed on this branch) and now gated in CI at high/critical; vendored `node_modules/` (2,267 files) removed from tracking — lockfile + `npm ci` is the single source of truth; reference clone of Windows-MCP is gitignored, not vendored; mkcert installed from official package-manager IDs (`FiloSottile.mkcert`); CI restricted to official pinned actions with a read-only token. | `uvx` fetches `windows-mcp` from PyPI without version pinning or hash verification; no SBOM. Remediation: pin `windows-mcp==<version>` in the script, add SBOM generation. |
| 12 | **Cryptographic hygiene** | 🟡 | TLS via mkcert-issued, locally-trusted certs (local CA never leaves the machine); auth key generated upstream with `secrets.token_urlsafe(32)`; openssl fallback is RSA-4096. | Self-signed fallback is trust-on-first-use until manually imported; no cert rotation/expiry monitoring (mkcert default validity applies). |
| 13 | **Error handling & typed failure** | ✅ | Typed errors (`ValidationError`/`SecurityError`/`ZellijError`) mapped to MCP error codes; the PowerShell script traps all exceptions, emits a JSON error record, and exits non-zero. | — |
| 14 | **Open design & documentation** | ✅ | Full design, security notes, interactive-vs-automated split, and verification steps in `docs/WINDOWS-MCP-INTEGRATION.md`; MIT licence; this matrix. | — |
| 15 | **Reproducible builds** | ✅ | Deterministic `tsc` build; lockfile committed; CI `quality` job rebuilds from a cold `npm ci` and fails on any `git diff` in `dist/` — the committed-`dist/` convention can no longer drift from `src/`. | — |
| 16 | **Rate limiting / DoS resistance** | ✅ | All five tools inherit the server-wide per-tool rate limiter (50 req/min, `src/index.ts`); script invocations carry hard timeouts (30 s–300 s). | — |
| 17 | **Secrets handling** | 🟡 | Auth key accepted via env var (`ZELLIJ_WINMCP_AUTH_KEY`) or upstream `config.toml`; never logged by our code; validated charset prevents log-breaking values. | Passing `-AuthKey` on a command line is visible to local process listing for the script's lifetime; prefer the upstream config-file path (default flow) — documented. |
| 18 | **Formal methods / independent review** | ❌→🟡 | No formal verification (out of proportion for this component). Independent review protocol prepared: [CONFIDENCE-RUBRIC.md](CONFIDENCE-RUBRIC.md) is self-contained for scoring by a second, independent frontier model from a different provider. | Complete the second-opinion review and record its scores alongside the self-assessment. |

## Summary

*(Revised 2026-07-08: CI pipeline, dependency-audit fix, and vendored-`node_modules`
removal shipped; rows 9–11 and 15 re-rated accordingly.)*

- **Compliant: 10** (1–5, 10, 13–16) — the core security posture of the change, plus
  drift-gated reproducible builds and CI observed green on both OS legs.
- **Partial: 7** (6–9, 11, 12, 17) — implemented with documented, bounded residual risk.
- **Gap: 1** (18 independent review — protocol ready in
  [SECOND-OPINION-CST.md](SECOND-OPINION-CST.md); execution pending).

**Overall judgement**: the integration follows secure-by-default, validated-input,
fail-closed design, is regression-tested on every push on both target OS families, and its
build artefacts are drift-gated. Remaining investments in effort-to-assurance order:
**pin the `windows-mcp` PyPI version → complete the independent second-opinion review →
stabilise and promote the dispatched Windows E2E probe**.
