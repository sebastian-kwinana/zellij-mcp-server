# Real-Hardware Validation Follow-On: Tracking Record

**Classification:** AI-to-AI Provenance Record — HASEng
**Framework:** KEPEK / CAMSO-Core / CAICEWAC
**Subject:** Follow-on workstream to PR #1 (merged `de12592`, 2026-07-10), running on
real physical Windows hardware for the first time.
**Author:** Claude Code, in-terminal session (`bash.exe`/PowerShell within Windows
Terminal — distinct from the prior browser-hosted, Linux-sandboxed session that
authored PR #1).
**Date:** 2026-07-11

---

## Environment this record is valid as of

Per the triadic decision-framework debate that shaped this workstream (Agent B's
Alternative Futures point: environmental drift — Defender updates, mkcert revocation,
PowerShell EOL — can silently invalidate a "now tested" claim), every fact in this
record and its siblings is scoped to the following, captured at time of writing:

| Component | Value |
|---|---|
| Host | `CW-WinDevTablet1` (Dell Latitude 5285, i5 vPro 7th-gen) |
| OS | Windows 10 Pro, build 19045.6466 |
| Node.js | v26.5.0 (scoop `nodejs` main bucket — newer than CI's pinned v22; see note below) |
| npm | 11.17.0 |
| uv/uvx | 0.11.28 |
| PowerShell (pwsh) | 7.6.3 |
| PowerShell (built-in) | 5.1 (pre-existing on this machine) |
| mkcert | v1.4.4 |
| `gh` CLI | v2.96.0, authenticated as `sebastian-kwinana` |

**Node version note:** scoop's `nodejs` package installed v26.5.0 (latest), not v22
(CI's `actions/setup-node@v4` pin). `npm ci && npm test` were run and passed against
this newer version — itself a useful real-hardware signal (this repo has never been
built against Node 26 before), but it means this record does **not** claim CI-version
parity; it claims "works on real hardware," a distinct and additive fact.

## Why this exists — SNEng-scoped, not a PR #1 gate

Per the SNEng ("Solutions Negation Engineering") pushback applied when this workstream
was planned: **none of this gated PR #1's merge.** PR #1 merged unchanged, on its own
already-adversarially-reviewed merits (3 rounds of Copilot review + one executed
independent second opinion, 44 tests, HASE-COMPLIANCE 13/5/0). Everything tracked here
is field validation of already-merged code plus new capability (multi-harness
reachability) — not completion of PR #1.

## Tracking artifacts (GitHub-native, created 2026-07-11)

- **Milestone**: [Real-Hardware Validation v1](https://github.com/sebastian-kwinana/zellij-mcp-server/milestone/1)
- **Project board**: [Windows-MCP Real-Hardware Validation](https://github.com/users/sebastian-kwinana/projects/7)
- **Labels**: `real-hardware`, `windows-mcp`, `multi-harness`, `assurance`
- **Issue #5**: [Real-hardware E2E test suite (test/real-hardware/, C.1-C.4)](https://github.com/sebastian-kwinana/zellij-mcp-server/issues/5)
- **Issue #6**: [Multi-harness AI-to-AI messaging demo](https://github.com/sebastian-kwinana/zellij-mcp-server/issues/6)

This Provenance doc is kept as the durable, git-blame-able record even though native
GitHub tooling is now also in play — the two are complementary, not redundant: Issues
can be edited or deleted; a merged commit cannot.

## Already-completed evidence (this session, prior to test suite / demo work)

- `npm ci && npm test` run on this machine for the first time ever: **41/41 pass**
  (3 correctly skipped — the `{ skip: onWindows }` fail-closed-off-Windows assertions
  do not apply on real Windows). This is the first-ever local Windows build/test of
  this repository; previously only GitHub's cloud `windows-latest` runner had ever
  built or tested it on Windows.
- `windows-mcp-real-hardware-e2e-v0.0.1.kdl` written — a CAMSO-Core-mapped,
  CAICEWAC-conventioned Zellij session layout adapting the operator's real, working
  precedent `spof-agy-caicewac-v0.0.1.kdl`. *(2026-07-12 update: originally written
  to the operator's out-of-tree specifications library; moved in-repo to
  `test/real-hardware/workspaces/` — that library is reserved for production-ready
  reusable reference specs, and the per-test-category `workspaces/` directory is now
  the foundational, self-documenting filesystem pattern for future MAIESAW-Engine
  work. See `test/real-hardware/workspaces/AGENTS.md`.)*

## What's tracked next

See Issue #5 (real-hardware test suite, RICE-ordered C.4→C.2→C.3→C.1) and Issue #6
(multi-harness demo, single-writer discipline for v0.0.1) for scope. Their respective
completion Provenance records:
- `docs/Provenance/Windows-MCP/2026-07-11-real-hardware-test-results.md` (pending)
- `docs/Provenance/Windows-MCP/2026-07-11-multi-harness-registration-demo.md` (pending)
