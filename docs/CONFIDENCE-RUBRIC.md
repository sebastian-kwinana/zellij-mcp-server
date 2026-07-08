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
   npm install
   npm test                 # builds, then runs the unit/contract suite (node --test)
   npm run test:integration # standalone smoke script
   ```
   On a Windows host, additionally run the manual E2E checklist at the end of
   [WINDOWS-MCP-INTEGRATION.md](WINDOWS-MCP-INTEGRATION.md).
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
| **Correctness** | 25% | Build passes; tool registration complete (schema + dispatch for all five tools); config precedence behaves as documented; TS↔PowerShell contract holds (param names, result marker, action set). | 4.0 | `npm test` green (validators, config precedence, contract pins); compiled output committed in sync; **not** exercised on a real Windows host in this environment. |
| **Security** | 25% | Input validation completeness; no shell-string interpolation anywhere on the invocation path; fail-closed platform guard ordering; secure defaults (TLS, loopback, streamable-http); secrets never logged. | 4.0 | Allowlist validators + argv arrays + `ValidateSet` + upstream refusals (4 layers); guard-before-validation pinned by test; residuals: `-AuthKey` visible in process listing if used, TOCTOU window in single-instance guard. |
| **Test coverage** | 20% | Tests exist, run, and actually assert the claimed properties; negative/injection cases present; coverage of the Windows-only path. | 3.0 | 4 test files + smoke script; injection corpus in `test/validator.test.js`; PowerShell parser gate auto-activates when PowerShell exists. Windows execution path is a manual checklist, not automated — capped at 3 until CI on `windows-latest` exists. |
| **Documentation** | 10% | A competent stranger can set this up from docs alone; security trade-offs stated honestly; interactive-vs-automated split explained. | 4.5 | README section + full guide + HASE matrix + this rubric; verify by following WINDOWS-MCP-INTEGRATION.md cold. |
| **Maintainability** | 10% | Matches existing repo conventions (static tool classes, Validator, ToolResponse, error types); no new runtime dependencies; clear separation TS orchestration vs PowerShell mechanics. | 4.0 | Zero new npm dependencies; conventions mirrored; one script instead of many; `dist/`-committed convention inherited (pre-existing drift risk). |
| **HASE compliance** | 10% | Spot-check the [decision matrix](HASE-COMPLIANCE.md): are the ✅ ratings evidenced? Are the 🟡/❌ honest? | 3.5 | 8 compliant / 8 partial / 2 gaps, self-rated conservatively; score reflects the gaps existing at all, not their disclosure. |

### Weighted self-assessment

`0.25×4.0 + 0.25×4.0 + 0.20×3.0 + 0.10×4.5 + 0.10×4.0 + 0.10×3.5 = 3.80 / 5`

**Confidence band**: 3.80 → **"Ship with documented follow-ups"** (see verdict table).

| Weighted score | Verdict |
|----------------|---------|
| ≥ 4.5 | Ship; exemplary |
| 3.5 – 4.49 | Ship with documented follow-ups |
| 2.5 – 3.49 | Ship only behind a flag / to a staging branch |
| < 2.5 | Do not ship; rework |

The declared follow-ups (in priority order) are: pin the `windows-mcp` PyPI version in the
script, add CI (`ubuntu-latest` + `windows-latest`), automate the Windows E2E checklist.

## Known limitations declared by the author (verify these are the only ones)

1. No Windows host was available during development; the Windows execution path is
   parser-checked and contract-pinned but not machine-executed.
2. Single-instance guard has a TOCTOU window (port check → process start).
3. `uvx` pulls `windows-mcp` from PyPI unpinned.
4. Repository has no CI (pre-existing).
5. `dist/` is committed by repo convention; drift is possible if `npm test` is skipped.

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
