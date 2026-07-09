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
`docs/HASE-COMPLIANCE.md`, `docs/CONFIDENCE-RUBRIC.md`, `docs/CI-DECISION-RECORD.md`,
`docs/SECOND-OPINION-CST.md`. Development happens in a git worktree on branch
`claude/clever-ramanujan-lob3g9` (PR #1). PR #2 is a throwaway Copilot review
vehicle — do not merge it to `main`.
