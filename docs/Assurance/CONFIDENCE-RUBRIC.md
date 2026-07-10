# Confidence Scoring Rubric — Windows-MCP Integration

**Purpose**: a self-contained scoring protocol so that an **independent frontier AI model
from a different AI Service Provider (AISP)** — or a human reviewer — can produce a second
opinion on this change without access to the original authoring session.

**Subject under review**: branch `claude/clever-ramanujan-lob3g9` of
`sebastian-kwinana/zellij-mcp-server`, specifically the Windows-MCP integration
(see the file list in [HASE-COMPLIANCE.md](HASE-COMPLIANCE.md), which also carries the
principle-by-principle decision matrix).

---

## Instructions to the independent reviewer

You are reviewing someone else's work. Do not trust the self-assessment below — verify it.

1. Clone the repository and check out the branch.
2. Reproduce the evidence:
   ```bash
   npm ci
   npm test                 # builds, then runs the unit/contract suite (node --test)
   npm run test:integration # standalone smoke script
   ```
   On a Windows host, additionally run the manual E2E checklist at the end of
   [WINDOWS-MCP-INTEGRATION.md](../Guides/WINDOWS-MCP-INTEGRATION.md).
3. Read, at minimum: `scripts/windows/windows-mcp.ps1`, `src/tools/windows-mcp.ts`,
   `src/utils/validator.ts` (Windows-MCP section), `src/utils/config.ts`, the five tool
   registrations in `src/index.ts`, and the `test/` directory.
4. Score each dimension 0–5 against the anchors. Use the evidence you reproduced, not the
   claimed scores. Award **half points** freely; justify any score that differs from the
   self-assessment by more than 1 point.
5. Actively attempt refutation for Security and Correctness: try to construct an input that
   reaches PowerShell unvalidated, a code path that executes off-Windows, or a state where
   two server instances launch. Document each attempt, even failed ones.
6. Report using the output format at the bottom.

## Scoring scale (anchors)

| Score | Anchor |
|-------|--------|
| 0 | Absent or broken |
| 1 | Token effort; would not survive first contact |
| 2 | Present but with known exploitable/failing cases |
| 3 | Sound design, incomplete evidence |
| 4 | Sound design, strong evidence, bounded residual risk |
| 5 | Exemplary; nothing material left to do |

## Dimensions, weights, and self-assessment

| Dimension | Weight | What to verify | Self-score | Self-justification |
|-----------|-------:|----------------|-----------:|--------------------|
| **Correctness** | 25% | Build passes; tool registration complete (schema + dispatch for all five tools); config precedence behaves as documented; TS↔PowerShell contract holds (param names, result marker, action set). | 4.5 | `npm test` green; compiled output committed in sync; the TS↔PowerShell contract is now empirically confirmed end-to-end on a real `windows-latest` runner (Actions run 29059674872), not just statically pinned. |
| **Security** | 25% | Input validation completeness; no shell-string interpolation anywhere on the invocation path; fail-closed platform guard ordering; secure defaults (TLS, loopback, streamable-http); secrets never logged. | 4.0 | Allowlist validators (incl. IPv6/host:port hardening from Copilot's 2nd review) + argv arrays + `ValidateSet` + upstream refusals (4 layers); guard-before-validation pinned by test; residuals: the optional `-AuthKey` override is visible in process listings, and the live Windows E2E remains dispatch-only rather than a required gate. |
| **Test coverage** | 20% | Tests exist, run, and actually assert the claimed properties; negative/injection cases present; coverage of the Windows-only path. | 4.5 | 44 tests; injection corpus incl. IPv6/host:port; the live E2E probe achieved a **complete green run** on real Windows (cert→auth→launch→listening→HTTPS→idempotent relaunch→stop), and found+drove fixes for 3 real bugs unit tests could not reach. Held just below 5 because it's a dispatched probe, not yet a required gate, and only a handful of green runs exist so far. |
| **Documentation** | 10% | A competent stranger can set this up from docs alone; security trade-offs stated honestly; interactive-vs-automated split explained. | 4.5 | README section + full guide + HASE matrix + this rubric; verify by following WINDOWS-MCP-INTEGRATION.md cold. |
| **Maintainability** | 10% | Matches existing repo conventions (static tool classes, Validator, ToolResponse, error types); no new runtime dependencies; clear separation TS orchestration vs PowerShell mechanics. | 4.0 | Zero new npm dependencies; conventions mirrored; one script instead of many; `dist/`-committed convention inherited (pre-existing drift risk). |
| **HASE compliance** | 10% | Spot-check the [decision matrix](HASE-COMPLIANCE.md): are the ✅ ratings evidenced? Are the 🟡/❌ honest? | 4.5 | 13 compliant / 4 partial / 1 gap after the mutex fix, version pin, and live-probe validation; the remaining gap (independent review) has its protocol ready and pending execution. |

### Weighted self-assessment

`0.25×4.5 + 0.25×4.0 + 0.20×4.5 + 0.10×4.5 + 0.10×4.0 + 0.10×4.5 = 4.33 / 5`
*(2026-07-10: Correctness, Tests, and HASE re-scored after the live Windows E2E probe achieved a complete green run — see revision note below)*

**Confidence band**: 4.33 → **"Ship with documented follow-ups"** (see verdict table).

| Weighted score | Verdict |
|----------------|---------|
| ≥ 4.5 | Ship; exemplary |
| 3.5 – 4.49 | Ship with documented follow-ups |
| 2.5 – 3.49 | Ship only behind a flag / to a staging branch |
| < 2.5 | Do not ship; rework |

The declared follow-ups (in priority order) are: complete the independent second-opinion review, add an SBOM / stronger artefact-integrity story for the `windows-mcp` PyPI package, and accumulate further green dispatched-probe runs before considering promotion toward a required (blocking) gate.

> **Revision 2026-07-08**: this branch added the CI pipeline (`.github/workflows/ci.yml` —
> both-OS test matrix, audit/dist-drift/PSSA gates, dispatch-only Windows E2E probe;
> rationale in [ADR-001](../ADRs/CI/001-tiered-ci-for-windows-mcp.md)), fixed 5 `npm audit`
> advisories (2 high), and untracked 2,267 vendored `node_modules` files. First CI runs
> observed green (Actions run 28933079883). Tests 3.0→3.5, HASE 3.5→4.0, weighted
> 3.80→3.95.
>
> **Revision 2026-07-10**: the dispatched live Windows E2E probe achieved a **complete
> green run** on a real `windows-latest` runner (Actions run 29059674872) — cert/auth-key
> generation, TLS `serve` launch, confirmed listening, HTTPS reachable, idempotent relaunch
> correctly a no-op, status, clean stop. This also validated `winget`-based `uv` install
> (adopted from Copilot's 2nd review, corrected after the auto-generated fix shipped
> invalid YAML — see PR history) and the launch-readiness check that same review requested.
> Correctness 4.0→4.5, Tests 3.5→4.5, HASE 4.0→4.5, weighted 3.95→**4.33** (same verdict
> band — the remaining independent-review gap is what separates this from "exemplary").
> Independent reviewers should score what they observe, not this history.

## Known limitations declared by the author (verify these are the only ones)

1. No Windows host was available during initial development; the Windows execution path
   was validated later by the live CI probe rather than by the author on a local Windows
   workstation.
2. The live Windows E2E remains a dispatch-only probe rather than a required PR gate.
3. The mutex guard deliberately fails open after a 30-second wait to preserve availability
   if a concurrent launcher appears stuck.
4. `dist/` is committed by repo convention; drift is blocked by CI for PR-driven changes,
   not by an out-of-band release process.
5. The optional `-AuthKey` override is visible in local process listings for the lifetime
   of the spawned `uvx` process; the preferred path is the upstream config file.

## Required output format for the second opinion

```markdown
## Independent review — <model name>, <AISP>, <date>
Per-dimension: Correctness X.X | Security X.X | Tests X.X | Docs X.X | Maintainability X.X | HASE X.X
Weighted: X.XX → <verdict>
Refutation attempts (min. 3, with outcome): ...
Material disagreements with self-assessment: ...
Undeclared limitations found: ...
Top 3 recommended actions: ...
```

Append the completed review to this file under `## Second opinions`.

## Second opinions

_None recorded yet. The rubric is ready for independent scoring._
