# CLAUDE.md

Claude Code project memory. The canonical, cross-tool guidance is in
[`AGENTS.md`](AGENTS.md) (repo-wide) and
[`scripts/windows/AGENTS.md`](scripts/windows/AGENTS.md) (Windows-MCP subsystem) —
read those first. This file records the durable lessons a future session must not
re-learn the hard way.

## Must-remember lessons
- **PR sizing gates AI review.** GitHub Copilot code review refuses PRs over
  **300 changed files**, counted *before* content-exclusions apply. Keep bulky
  hygiene (e.g. `node_modules` un-tracking) in a separate PR; for an unavoidably
  large PR, use a "review-vehicle" branch that omits the bulk deletion (see PR #2).
- **Dependencies:** `node_modules/` is untracked — always `npm ci` (a partial
  install makes `npm run build` fall back to a stray global `tsc`). `dist/` is
  committed on purpose and drift-gated in CI. TypeScript is pinned to **5.9.2**.
- **`moduleResolution: "node"`** is deprecated but migrating to `nodenext` is a
  real migration (breaks `@types/node` auto-loading + surfaces implicit-`any`);
  it builds clean on 5.9.2 today, so schedule it as its own tested PR.
- **Windows-MCP security:** validators reject leading-`-` values (PowerShell
  parameter-injection), `Get-RunningPid` verifies process identity before kill,
  and the tools fail closed off-Windows. Details + rationale in
  `scripts/windows/AGENTS.md`.

## Assurance artifacts
`docs/Assurance/HASE-COMPLIANCE.md`, `docs/Assurance/CONFIDENCE-RUBRIC.md`, `docs/ADRs/CI/001-tiered-ci-for-windows-mcp.md`,
`docs/Assurance/SECOND-OPINION-CST.md`. The Windows-MCP integration (PR #1,
`claude/clever-ramanujan-lob3g9`) merged to `main` 2026-07-10 (commit `de12592`).
PR #2 was a throwaway Copilot review vehicle, closed without merging — do not
reopen it or reuse its branch. Real-hardware follow-on validation work happens
on `real-hardware-validation-v1`; see
`docs/Provenance/Windows-MCP/2026-07-11-real-hardware-followon-tracking.md`.

## Real-hardware environment notes (`CW-WinDevTablet1`, Dell Latitude 5285)
- `core.autocrlf=true` is Windows' git default and, before 2026-07-11, this repo
  had **no `.gitattributes`** — routine `git checkout`/`add` could silently
  convert committed LF `dist/**`/`*.ts`/`*.js` to CRLF, permanently failing CI's
  Linux-side `dist/` drift gate. Fixed by adding `.gitattributes` pinning those
  paths to `eol=lf`. If you ever see a `dist/` diff that's pure CRLF↔LF noise on
  Windows, re-run `git add dist/` after confirming `.gitattributes` covers the
  path — do not commit the CRLF version.
- `npm test`'s `node --test` glob needs Node ≥21 (see the root `AGENTS.md`
  lesson) — confirmed working here against Node v26.5.0 (scoop's `nodejs`
  package installs latest, not CI's pinned v22; both are fine, just don't
  conflate "works on my machine" with CI parity).
