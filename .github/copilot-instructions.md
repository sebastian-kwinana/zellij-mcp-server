# Copilot / AI reviewer instructions — zellij-mcp-server

<!--
Scope of this file (MoSCoW):
  MUST  give a reviewer the repo purpose, stack, how to build/verify, the
        review focus areas, and the intentional decisions NOT to re-flag.
  SHOULD give the security model and pointers to assurance artifacts.
  COULD  summarise the tool surface.
  WON'T  duplicate exhaustive API docs (the README/docs/ own that) or restate
        generic style rules a linter already enforces.
Keep this file scannable, imperative, and < ~200 lines (GitHub caps usefulness
around 1000 lines; high signal beats completeness).
-->

## What this project is
An MCP (Model Context Protocol) server that drives the Zellij terminal
multiplexer, plus a **Windows-MCP integration** that (on Windows hosts only)
launches CursorTouch/Windows-MCP over secure streamable-http with locally
trusted TLS. See `README.md` and `docs/WINDOWS-MCP-INTEGRATION.md`.

## Stack & conventions
- **TypeScript (ESM, `"type": "module"`), Node.js.** Dev/CI run on **Node 22**;
  the runtime targets Node 18+.
- **Near-zero runtime dependencies** — only `@modelcontextprotocol/sdk`. Do not
  suggest adding libraries (glob, dotenv, a test framework, an HTTP client)
  unless a task truly requires it; the minimalism is deliberate.
- **Tests use the built-in `node --test` runner** (no Jest/Mocha/Vitest).
- Tool modules live in `src/tools/*.ts` as classes with **static methods**
  returning `ToolResponse` (`{ content: [{ type: 'text', text }] }`). Each tool
  is registered in **two** places in `src/index.ts`: the
  `ListToolsRequestSchema` schema array and the `CallToolRequestSchema`
  switch-case. Reuse `Validator` (`src/utils/validator.ts`), `execAsync`
  (`src/utils/command.ts`), and the typed errors in `src/types/zellij.ts`
  (`ZellijError` / `ValidationError` / `SecurityError`).

## How to build & verify (please actually run these)
```bash
npm ci
npm test              # builds, then runs 33 unit/contract tests
npm run test:integration   # portable smoke checks
```
CI (`.github/workflows/ci.yml`) runs the suite on ubuntu-latest **and**
windows-latest, plus an npm-audit gate, a committed-`dist/` drift gate, and a
PSScriptAnalyzer gate. A live Windows E2E exists as a manual `workflow_dispatch`
probe (never a PR gate — by design).

## Where real bugs are most likely — focus review here
1. **TS ↔ PowerShell contract**: `src/tools/windows-mcp.ts` invokes
   `scripts/windows/windows-mcp.ps1`. Parameter names, the `__WINMCP_RESULT__`
   marker, and the action set must stay in sync (`test/powershell-contract.test.js`).
2. **Command-injection surface**: values flow into PowerShell/`windows-mcp`.
   They are validated in `src/utils/validator.ts` and passed as an **argv array
   via `spawn` (no shell)** — never string-interpolated. Flag any deviation.
3. **Single-instance / "launch once"** guard in the PowerShell script
   (port-listen check + PID lockfile) — look for TOCTOU or PID-reuse issues.
4. **Fail-closed platform guard**: every Windows-MCP tool must early-return a
   "Windows-only" message on non-Windows *before* processing arguments.

## Intentional decisions — do NOT flag these as defects (context first)
- **`dist/` is committed on purpose** (run-from-clone convention). Drift is
  prevented by the CI `quality` job that rebuilds and `git diff --exit-code`s
  `dist/`. Don't recommend gitignoring it without acknowledging that gate.
- **`node_modules/` was removed from version control** in this PR; `npm ci` +
  the committed lockfile is the source of truth. The large deletion count is
  hygiene, not code removal.
- **`-ExecutionPolicy Bypass`** in the TS layer runs *our own shipped* script,
  not remote content — standard for repo-local automation.
- **Quoted `"test/*.test.js"` glob** is intentional: Node 21+ expands it
  natively and consistently across POSIX/Windows. Bare `node --test` is avoided
  because it would sweep in non-test scripts (`test-detection.js`).
- **`windows-mcp` is now pinned to `0.8.2`** via `$script:WindowsMcpVersion` in
  `windows-mcp.ps1`. To upgrade, bump that variable, run `npm test`, and run the
  `e2e-windows` dispatch probe. See `docs/2026-07-10-action-record-mutex-pinning.md`.

## Security model (one line)
Loopback bind + TLS + optional auth key + optional IP allowlist; validated,
argv-array-passed arguments; per-tool rate limiting. Details in
`docs/WINDOWS-MCP-INTEGRATION.md`.

## Assurance artifacts (read for rationale before challenging a design choice)
- `docs/HASE-COMPLIANCE.md` — 18-principle compliance matrix (evidence + residual risk)
- `docs/CONFIDENCE-RUBRIC.md` — weighted self-assessment + independent-review protocol
- `docs/CI-DECISION-RECORD.md` — multi-framework rationale for the CI shape
- `docs/SECOND-OPINION-CST.md` — prompt for an independent, adversarial second-opinion review
