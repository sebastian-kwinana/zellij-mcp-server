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
| 9 | **Verification & test coverage** | 🟡 | `npm test`: unit tests for validators, config precedence, platform guard, TS↔PowerShell contract; PowerShell language-parser gate (runs when a PowerShell binary is present); standalone smoke script (`test-windows-mcp.js`). | The Windows-side execution path (actual launch, cert generation) is a **documented manual checklist**, not automated — no Windows host in this environment. Remediation: GitHub Actions `windows-latest` E2E job. |
| 10 | **Continuous integration** | ❌ | None in the repository (pre-existing gap; predates this change). | Add CI running `npm test` on `ubuntu-latest` + `windows-latest` (the suite is already cross-platform; the parser test auto-activates on Windows). |
| 11 | **Supply-chain integrity** | 🟡 | Single runtime dependency (`@modelcontextprotocol/sdk`) with committed lockfile; reference clone of Windows-MCP is gitignored, not vendored; mkcert installed from official package-manager IDs (`FiloSottile.mkcert`). | `uvx` fetches `windows-mcp` from PyPI without version pinning or hash verification; no SBOM; no dependency scanning. Remediation: pin `windows-mcp==<version>` in the script, add SBOM generation. |
| 12 | **Cryptographic hygiene** | 🟡 | TLS via mkcert-issued, locally-trusted certs (local CA never leaves the machine); auth key generated upstream with `secrets.token_urlsafe(32)`; openssl fallback is RSA-4096. | Self-signed fallback is trust-on-first-use until manually imported; no cert rotation/expiry monitoring (mkcert default validity applies). |
| 13 | **Error handling & typed failure** | ✅ | Typed errors (`ValidationError`/`SecurityError`/`ZellijError`) mapped to MCP error codes; the PowerShell script traps all exceptions, emits a JSON error record, and exits non-zero. | — |
| 14 | **Open design & documentation** | ✅ | Full design, security notes, interactive-vs-automated split, and verification steps in `docs/WINDOWS-MCP-INTEGRATION.md`; MIT licence; this matrix. | — |
| 15 | **Reproducible builds** | 🟡 | Deterministic `tsc` build; lockfile committed. | Compiled `dist/` is committed (pre-existing repo convention) — drift between `src/` and `dist/` is possible if a contributor edits only one; `npm test` rebuilds first, which mitigates. Remediation: CI check that `dist/` matches a fresh build, or stop committing `dist/`. |
| 16 | **Rate limiting / DoS resistance** | ✅ | All five tools inherit the server-wide per-tool rate limiter (50 req/min, `src/index.ts`); script invocations carry hard timeouts (30 s–300 s). | — |
| 17 | **Secrets handling** | 🟡 | Auth key accepted via env var (`ZELLIJ_WINMCP_AUTH_KEY`) or upstream `config.toml`; never logged by our code; validated charset prevents log-breaking values. | Passing `-AuthKey` on a command line is visible to local process listing for the script's lifetime; prefer the upstream config-file path (default flow) — documented. |
| 18 | **Formal methods / independent review** | ❌→🟡 | No formal verification (out of proportion for this component). Independent review protocol prepared: [CONFIDENCE-RUBRIC.md](CONFIDENCE-RUBRIC.md) is self-contained for scoring by a second, independent frontier model from a different provider. | Complete the second-opinion review and record its scores alongside the self-assessment. |

## Summary

- **Compliant: 8** (1–5, 13, 14, 16) — the core security posture of the change.
- **Partial: 8** (6–9, 11, 12, 15, 17) — implemented with documented, bounded residual risk.
- **Gap: 2** (10 CI, 18 independent review — the latter has its protocol ready and is in progress).

**Overall judgement**: the integration itself follows secure-by-default, validated-input,
fail-closed design and is regression-tested where this environment can execute. The two
hard gaps (CI, completed independent review) and the highest-value partials (Windows E2E
automation, PyPI version pinning) are the recommended next investments, in that order of
effort-to-assurance ratio: **pin `windows-mcp` version → add CI (ubuntu + windows) →
automate the Windows E2E checklist**.
