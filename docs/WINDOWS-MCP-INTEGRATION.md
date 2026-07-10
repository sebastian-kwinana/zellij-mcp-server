# Windows-MCP Integration

This integration lets the zellij-mcp-server give an agent **situational awareness of the
Windows desktop** when zellij is running on Windows. It does so by bringing up
[CursorTouch/Windows-MCP](https://github.com/CursorTouch/Windows-MCP) — a Python MCP server
(run via `uvx windows-mcp`) that automates the Windows UI — over a **secure transport with
locally-trusted TLS**.

All the heavy lifting lives in a single PowerShell script,
[`scripts/windows/windows-mcp.ps1`](../scripts/windows/windows-mcp.ps1). The TypeScript
tools (`src/tools/windows-mcp.ts`) are a thin, validated, platform-guarded front door to it.

## Why streamable-http

The user asked for "streamable-http or sse, whichever is more secure". The integration
defaults to **`streamable-http`** because:

- The MCP specification **deprecated the HTTP+SSE transport** in favour of **Streamable
  HTTP**.
- Windows-MCP's own documentation recommends `streamable-http` for production.

`sse` remains available as a configurable fallback. Either way the server is configured with
TLS, and binds to loopback (`127.0.0.1`) by default.

## Prerequisites (on the Windows host)

| Requirement | Install |
|-------------|---------|
| `uv` / `uvx` | `winget install astral-sh.uv` (or `pip install uv`) |
| `mkcert` (recommended) | `scoop install mkcert` — auto-installed by `setup` if missing |
| Python 3.13+ | fetched automatically by `uvx` |

`mkcert` produces **locally-trusted** certificates (it installs a local CA). If it cannot be
installed, Windows-MCP's `auth --with-tls` falls back to an **openssl self-signed** cert,
which works but is not trusted by default.

## Two ways to run it

Interactive prompting (`Read-Host`, trusting the local CA) only makes sense for a human at a
terminal — an LLM-driven MCP call has no TTY. The integration therefore splits into:

### 1. One-time interactive setup (run the script directly)

```powershell
pwsh -File scripts/windows/windows-mcp.ps1 -Action setup
```

This will, prompting for confirmation along the way:

1. Verify `uvx` is available.
2. Install `mkcert` via the first available package manager: **scoop → winget → choco**,
   else print manual instructions and continue with the openssl fallback.
3. Run `uvx windows-mcp auth --transport streamable-http --host 127.0.0.1 --port 8000
   --with-tls`, which generates an auth key + TLS cert/key (mkcert-preferred) and saves them
   to `~/.windows-mcp/config.toml`.
4. Launch the server once.

### 2. Automated, idempotent launches (via the MCP tools)

From an MCP client the tools always run the script **non-interactively**:

The TS layer always includes `-NonInteractive` for every action (an LLM-driven
call has no TTY):

| Tool | Action |
|------|--------|
| `zellij_windows_mcp_setup` | `-Action setup -NonInteractive` |
| `zellij_windows_mcp_launch` | `-Action launch -NonInteractive` |
| `zellij_windows_mcp_status` | `-Action status -NonInteractive` |
| `zellij_windows_mcp_stop` | `-Action stop -NonInteractive` |
| `zellij_windows_mcp_install_task` | `-Action install-task -NonInteractive` |

"Launch once" is enforced by the script: it checks both whether the port is already being
listened on (`Get-NetTCPConnection`) and a PID lockfile at
`%LOCALAPPDATA%\zellij-mcp\windows-mcp.pid`. If the server is already up, `launch` is a no-op.

## Configuration

Defaults can be overridden (precedence: tool argument > env var > config file > default).

**Config file** `~/.zellij-mcp/config.json` (override path with `$ZELLIJ_MCP_CONFIG`):

```json
{
  "windowsMcp": {
    "transport": "streamable-http",
    "host": "127.0.0.1",
    "port": 8000
  }
}
```

**Environment variables**: `ZELLIJ_WINMCP_TRANSPORT`, `ZELLIJ_WINMCP_HOST`,
`ZELLIJ_WINMCP_PORT`, `ZELLIJ_WINMCP_AUTH_KEY`, `ZELLIJ_WINMCP_IP_ALLOWLIST`,
`ZELLIJ_WINMCP_CERT_FILE`, `ZELLIJ_WINMCP_KEY_FILE`.

## Resulting endpoint

- Streamable HTTP: `https://127.0.0.1:8000/mcp/`
- SSE (fallback): `https://127.0.0.1:8000/sse`

When an auth key is configured, clients must send `Authorization: Bearer <token>`.

## Persistent install

```powershell
pwsh -File scripts/windows/windows-mcp.ps1 -Action install-task
```

Wraps `uvx windows-mcp install`, registering a scheduled task that starts the server at every
login. Remove it with `uvx windows-mcp uninstall`.

## Security notes

- Binds to loopback by default; Windows-MCP refuses to bind a non-loopback host over HTTP
  without an auth key, OAuth, or an explicit `--allow-insecure-remote`.
- Windows-MCP "operates with full system access and can perform irreversible operations" —
  keep it on loopback, behind TLS and an auth key, and use `ip_allowlist` if exposing it.
- All values forwarded to the script are validated (`src/utils/validator.ts`) and passed as a
  typed argument array (never interpolated into a shell command line).

## Verifying

- **Off-Windows (CI / dev)**: every tool returns a clear "Windows-only" message and takes no
  action — see `test-windows-mcp.js`.
- **PowerShell syntax**: on a Windows host (or where `pwsh` is installed) validate with
  `[System.Management.Automation.Language.Parser]::ParseFile('scripts/windows/windows-mcp.ps1',[ref]$null,[ref]$errs)`.
- **End-to-end on Windows**: run `-Action setup`, confirm a cert/key under `~/.windows-mcp`
  and the server listening on `https://127.0.0.1:8000/mcp/`; re-run `-Action launch` to prove
  the single-instance guard no-ops.
