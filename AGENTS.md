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
npm ci
npm test                 # build + 33 unit/contract tests
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
