# AGENTS.md

Cross-tool agent instructions (the emerging standard read by GitHub Copilot's
coding agent and a growing set of AI dev tools). For AI **code review**, the
authoritative file is [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
— read it first; this file is the short, tool-agnostic entry point.

## Quick facts
- **Project**: MCP server for Zellij + a Windows-only Windows-MCP integration
  (secure streamable-http + locally-trusted TLS).
- **Stack**: TypeScript (ESM), Node 22 for dev/CI, near-zero runtime deps
  (only `@modelcontextprotocol/sdk`), tests via built-in `node --test`.

## Setup / build / test
```bash
npm ci                   # ALWAYS from the lockfile; a partial node_modules
                         # silently falls back to a stray global tsc (see lessons)
npm test                 # build + 44 unit/contract tests
npm run test:integration # portable smoke checks
```

## Conventions (details in .github/copilot-instructions.md)
- Add a tool: static-method class in `src/tools/*.ts` returning `ToolResponse`;
  register it in BOTH the `ListTools` schema and the `CallTool` switch in
  `src/index.ts`; validate inputs with `Validator`.
- Windows-MCP tools must fail closed (return "Windows-only") off-Windows.
- `dist/` is committed intentionally and drift-gated in CI; `node_modules/` is
  not tracked (`npm ci` + lockfile is the source of truth).
- Pass external arguments as argv arrays via `spawn` — never string-interpolate
  into a shell command.

## Highest-risk review areas
The TS↔PowerShell contract (`src/tools/windows-mcp.ts` ↔
`scripts/windows/windows-mcp.ps1`), the command-injection surface, and the
single-instance launch guard. See `docs/` for the compliance matrix, confidence
rubric, CI decision record, and the independent second-opinion review prompt.

## Lessons learned (repo-wide working agreements)
These are the *global* lessons — they apply no matter which file you touch.
Subsystem-specific lessons live in nested `AGENTS.md` files (see the map below).

- **Right-size PRs — GitHub Copilot code review hard-caps at 300 changed files**
  (July 2026), and that count is taken *before* content-exclusions / review-scope
  path filters apply ([community #195507](https://github.com/orgs/community/discussions/195507)),
  so exclusions cannot rescue an over-limit PR. Keep unrelated hygiene (e.g. the
  `node_modules` un-tracking) in its own PR so the substantive diff stays
  reviewable. (When a large PR must exist, a "review-vehicle" branch omitting the
  bulk deletion — see PR #2 — is the escape hatch.)
- **`node_modules/` is NOT tracked**; the committed `package-lock.json` + `npm ci`
  is the single source of truth. `dist/` *is* committed intentionally and is
  drift-gated by CI (`quality` job rebuilds and `git diff --exit-code`s it).
- **`npm ci`, never a partial install.** A broken/partial `node_modules` drops
  the local `.bin/tsc`, and `npm run build` then silently uses a *global* `tsc`
  (possibly a newer major that hard-errors on deprecated options). CI is safe
  because it always does a clean `npm ci` on the pinned TypeScript **5.9.2**.
- **`moduleResolution: "node"` is deprecated** (TS 7.0 will drop it), but
  migrating to `nodenext` is a *real* migration, not a one-liner: it stops
  auto-loading `@types/node` (needs `types`/resolution fixes) and surfaces
  implicit-`any` errors. Pinned 5.9.2 builds clean today, so this is a
  deliberate, separately-tested follow-up — do not slip it into an unrelated PR.
- **The `npm test` glob (`"test/*.test.js"`) requires Node ≥21** (native test-runner
  glob expansion); it is quoted on purpose. Do *not* switch to bare `node --test`
  — it sweeps in non-test scripts (`test-detection.js`).

## Where agent guidance lives (and why)
Placement of each lesson is decided by a trio of strategies — (1) **nearest common
ancestor**: put it at the deepest dir common to all files it governs; (2) **blast
radius**: whole-repo → root, one subsystem → nested; (3) **cost of misplacement**:
weigh "missed because buried" against "root pollution", keeping root high-signal.

| File | Scope |
|------|-------|
| `AGENTS.md` (this file) | repo-wide facts, conventions, and lessons |
| [`scripts/windows/AGENTS.md`](scripts/windows/AGENTS.md) | Windows-MCP launcher subsystem lessons (nearest-wins for agents editing the launcher/validators) |
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | repo-wide Copilot **code-review** custom instructions |
| [`.github/instructions/windows-mcp.instructions.md`](.github/instructions/windows-mcp.instructions.md) | **path-scoped** Copilot review directives for the Windows-MCP files |
