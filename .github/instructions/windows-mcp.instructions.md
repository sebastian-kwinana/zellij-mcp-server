---
applyTo: "src/tools/windows-mcp.ts,scripts/windows/**,src/utils/validator.ts,src/utils/config.ts,src/utils/platform.ts,test/windows-mcp-tools.test.js,test/powershell-contract.test.js"
---

# Copilot review directives — Windows-MCP integration

Path-scoped review guidance for the Windows-MCP files. Rationale for each point
lives in [`scripts/windows/AGENTS.md`](../../scripts/windows/AGENTS.md); when
reviewing these files, actively verify:

1. **PowerShell parameter-injection.** Any value forwarded to `windows-mcp.ps1`
   as `-Param <value>` (host, cert/key paths, auth key) must be rejected by its
   validator if it starts with `-` after trimming. An argv array via `spawn`
   stops shell injection but NOT PowerShell parameter binding — flag any new
   forwarded value that lacks a leading-dash guard.
2. **Fail-closed platform guard.** Every `zellij_windows_mcp_*` tool must
   early-return the "Windows-only" `ToolResponse` on non-Windows *before* it
   validates or spawns anything. Flag any argument handling that precedes the guard.
3. **PID identity before action.** Flag any `Stop-Process` / kill path that trusts
   a lockfile PID without confirming the process is actually `windows-mcp`
   (`Win32_Process.CommandLine`).
4. **Env/config robustness.** Numeric env overrides (e.g. `ZELLIJ_WINMCP_PORT`)
   must apply only for a strict integer string within range, else fall back — no
   `parseInt` partial-match coercion.
5. **TS↔PowerShell contract.** Parameter names, the `__WINMCP_RESULT__` marker,
   and the `-Action` set must stay in sync (`test/powershell-contract.test.js`).

Do NOT flag as defects (intentional, see `.github/copilot-instructions.md`):
committed `dist/`, untracked `node_modules/`, `-ExecutionPolicy Bypass` on our own
shipped script, or the quoted `test/*.test.js` glob.
