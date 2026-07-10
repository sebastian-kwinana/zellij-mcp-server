# AGENTS.md — Windows-MCP launcher subsystem

Nested guidance for `windows-mcp.ps1` and its TypeScript front door
(`src/tools/windows-mcp.ts`) + the validators/config it relies on. The root
[`AGENTS.md`](../../AGENTS.md) still applies; this file adds what an agent editing
*this subsystem* must know. (Placed here — not at root — because these lessons are
localized to the Windows-MCP launcher; see the placement trio in the root file.)

## What this subsystem does
`windows-mcp.ps1 -Action setup|launch|status|stop|install-task` brings up
CursorTouch/Windows-MCP (`uvx windows-mcp`) over streamable-http with locally
trusted TLS. `src/tools/windows-mcp.ts` is a platform-guarded, validated front
door that invokes it via `spawn` with an **argv array**.

## Hard-won lessons (do not regress these)

1. **An argv array stops *shell* injection, not PowerShell *parameter binding*.**
   Values forwarded as `-BindHost <v>`, `-AuthKey <v>`, `-CertFile <v>`, etc. can
   be mis-parsed if `<v>` starts with `-` (e.g. `-Force` binds as a switch). The
   validators in `src/utils/validator.ts` (`validateHost` / `validateCertPath` /
   `validateAuthKey`) therefore **reject a leading `-` after trim**. Keep that
   guard, and keep the leading-dash negative tests in `test/validator.test.js`.
   (Note: URL-safe auth tokens may legitimately begin with `-`; rejecting them is
   a deliberate fail-closed trade-off — the normal flow reads the key from
   `config.toml`, not the `-AuthKey` override.)

   **`-AuthKey` credential exposure in process listings:** When the optional `-AuthKey`
   parameter override is used, the auth key value is visible in the `uvx` process
   command line — accessible via `Get-Process`, Task Manager, or `ps` on the host.
   The normal flow reads the key from `~/.windows-mcp/config.toml` (written by
   `windows-mcp auth --with-tls`) and never passes it as a CLI argument to the
   `serve` sub-command. Only use `-AuthKey` as a last resort (e.g. testing or when
   `config.toml` is not writable); prefer the standard `setup` flow.

2. **Never trust a lockfile PID blindly.** `Get-RunningPid` confirms the PID's
   command line references `windows-mcp` (`Win32_Process.CommandLine`) before
   reporting or `Stop-Process`-ing it, so a stale lockfile + a recycled PID can't
   make us kill an unrelated process. Fail closed if the command line is
   unreadable.

3. **"Launch once" = port-listen check *and* a PID lockfile**
   (`%LOCALAPPDATA%\zellij-mcp\windows-mcp.pid`). The TOCTOU window between the
   check and `Start-Process` is closed by a `[System.Threading.Mutex]` with scope
   `Global\ZellijWindowsMCP`. The entire critical section (from `Test-ServerRunning`
   through `Set-Content $LockFile`) runs under the mutex; `WaitOne(30000)` gives
   concurrent agents up to 30 s to finish before failing open. The PID lockfile is
   written *inside* the mutex hold so the next agent to acquire it finds the server
   already up and short-circuits. If you extend this with additional pre-launch state,
   keep it inside the mutex or you reintroduce the race.

4. **Interactive vs. non-interactive is a hard split.** `setup` prompts
   (`Read-Host`) for a human; MCP always passes `-NonInteractive`. An LLM-driven
   call has no TTY — never add a prompt to a path the tool layer can reach.

5. **Keep the TS↔PowerShell contract in sync.** Parameter names, the
   `__WINMCP_RESULT__` marker, and the `-Action` set are pinned by
   `test/powershell-contract.test.js`. Change them in lockstep or that test fails.

6. **`mkcert -install` is interactive — it cannot run headless.** It pops a
   Windows trust-store dialog; on a headless/CI session it blocks forever. The
   cert-setup step therefore runs under a timeout (`-CertSetupTimeoutSec`) with
   output logged to file, force-kills the tree (`taskkill /T`) on timeout, and
   offers `-SkipMkcertInstall` to use the openssl self-signed path instead. The
   mkcert *trust* path is for a human running `setup` interactively, once.

7. **Force child Python into UTF-8.** `windows-mcp` prints Unicode (a U+2192
   arrow) via `click.echo`; when its stdout is captured — here (Start-Process
   redirect) or from the TS layer (`spawn`) — Python defaults to cp1252 and dies
   with `UnicodeEncodeError`. The script sets `PYTHONUTF8=1` /
   `PYTHONIOENCODING=utf-8` before any `uvx` call. (Found by the live CI probe.)

8. **Repair windows-mcp's `config.toml` before `serve`.** `windows-mcp auth`
   writes Windows cert paths into TOML *basic* strings unescaped
   (`ssl_certfile = "C:\Users\..."`); the `\U` in `\Users` is read as a unicode
   escape, so `serve` can't parse its own config ("Invalid hex value") and never
   binds. `Repair-WindowsMcpConfig` rewrites the `ssl_*` lines to forward slashes
   (valid TOML, accepted by Windows). Upstream bug; found by the live CI probe.

9. **Pin the upstream `windows-mcp` PyPI version.** All three `uvx` invocations
   (`auth`, `serve`, `install`) use `"windows-mcp==$($script:WindowsMcpVersion)"`
   (defined near the top of the script). Pinned to `0.8.2` — the version validated
   by the live CI probe (2026-07-09, Actions run 29059674872). To upgrade: bump
   `$script:WindowsMcpVersion`, run `npm test`, then run the `e2e-windows` dispatch
   probe. See `docs/Provenance/Windows-MCP/2026-07-10-action-record-mutex-pinning.md` for version history.
   Do NOT revert to an unpinned `uvx windows-mcp` call — a breaking upstream release
   would silently break every user's next launch with no change to this repository.

## Verifying PowerShell changes
- Parser gate: `test/powershell-contract.test.js` runs the PowerShell language
  parser when a `pwsh`/`powershell` binary is present (it is on CI runners).
- Keep PSScriptAnalyzer at **0 Error-severity** findings (CI `quality` job gates
  this). Prefer `$null -eq $x` over `$x -eq $null`.
- The live end-to-end path is exercised only by the `e2e-windows`
  `workflow_dispatch` probe in `.github/workflows/ci.yml` — never a PR gate.
