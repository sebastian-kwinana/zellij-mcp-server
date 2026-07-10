#Requires -Version 5.1
<#
.SYNOPSIS
    Scripted integration that brings up the Windows-MCP server for the
    zellij-mcp-server, secured with locally-trusted TLS over streamable-http.

.DESCRIPTION
    Orchestrates CursorTouch/Windows-MCP (https://github.com/CursorTouch/Windows-MCP),
    which is launched via `uvx windows-mcp`. Responsibilities by -Action:

      setup         Ensure prerequisites, install mkcert (scoop -> winget ->
                    choco -> manual/openssl fallback), generate locally-trusted
                    TLS certs + an auth key via `windows-mcp auth --with-tls`,
                    then launch the server once.
      launch        Idempotently start `windows-mcp serve` (single instance).
      status        Report whether the server is listening, its PID and URL.
      stop          Stop the server started by this script.
      install-task  Register a persistent scheduled task via `windows-mcp install`.

    streamable-http is the default transport: the MCP specification deprecated
    the SSE transport in favour of Streamable HTTP, and Windows-MCP documents
    streamable-http as the production-recommended option. sse remains available
    as a fallback.

    Interactive prompts (mkcert install, trusting the local CA) only appear when
    run by a human in a terminal. Pass -NonInteractive (as the MCP server does)
    to run unattended with sensible defaults.

.EXAMPLE
    pwsh -File windows-mcp.ps1 -Action setup

.EXAMPLE
    pwsh -File windows-mcp.ps1 -Action launch -Transport streamable-http -Port 8000 -NonInteractive
#>
[CmdletBinding()]
param(
    [ValidateSet('setup', 'launch', 'status', 'stop', 'install-task')]
    [string]$Action = 'setup',

    [ValidateSet('streamable-http', 'sse')]
    [string]$Transport = 'streamable-http',

    # NB: -Host is a reserved automatic variable in PowerShell, so use -BindHost.
    [string]$BindHost = '127.0.0.1',

    [int]$Port = 8000,

    [string]$AuthKey,

    [string]$IpAllowlist,

    [string]$CertFile,

    [string]$KeyFile,

    [switch]$NonInteractive,

    [switch]$Force,

    # Skip installing mkcert; Windows-MCP then falls back to an openssl
    # self-signed cert. Use in headless/CI contexts where `mkcert -install`
    # would block on an interactive Windows trust-store dialog.
    [switch]$SkipMkcertInstall,

    # Hard cap for the `windows-mcp auth --with-tls` step, after which it is
    # killed with a diagnostic rather than hanging (default 5 min).
    [int]$CertSetupTimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Run child Python (uvx windows-mcp) in UTF-8 mode. windows-mcp prints Unicode
# (e.g. "cert -> path" with a U+2192 arrow) via click.echo; when its stdout is
# captured/redirected — as it is both here (Start-Process -RedirectStandardOutput)
# and from the TypeScript tool layer (spawn) — Python otherwise defaults to the
# Windows ANSI code page (cp1252) and dies with UnicodeEncodeError. Surfaced by
# the live CI probe on 2026-07-09.
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'

$script:ConfigDir = Join-Path $env:LOCALAPPDATA 'zellij-mcp'
$script:LockFile  = Join-Path $script:ConfigDir 'windows-mcp.pid'
$script:LogOut    = Join-Path $script:ConfigDir 'windows-mcp.out.log'
$script:LogErr    = Join-Path $script:ConfigDir 'windows-mcp.err.log'
$script:AuthLog   = Join-Path $script:ConfigDir 'windows-mcp.auth.out.log'
$script:AuthErrLog = Join-Path $script:ConfigDir 'windows-mcp.auth.err.log'
$script:ResultMarker = '__WINMCP_RESULT__'
# Pinned upstream release. Bump this, run `npm test`, then run the e2e-windows
# dispatch probe to confirm the new version works end-to-end before merging.
# See docs/2026-07-10-action-record-mutex-pinning.md for version history.
$script:WindowsMcpVersion = '0.8.2'

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

function Write-Info  { param([string]$Message) Write-Host "[windows-mcp] $Message" }
function Write-Warn  { param([string]$Message) Write-Host "[windows-mcp] WARNING: $Message" -ForegroundColor Yellow }

function Write-Result {
    <# Emit a machine-readable JSON line that the TypeScript tool layer parses. #>
    param([hashtable]$Data)
    $json = $Data | ConvertTo-Json -Compress -Depth 6
    Write-Host "$script:ResultMarker $json"
}

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Confirm-Action {
    <# Returns $true to proceed. Auto-yes when -NonInteractive. #>
    param([string]$Prompt)
    if ($NonInteractive) { return $true }
    $answer = Read-Host "$Prompt [Y/n]"
    return ($answer -eq '' -or $answer -match '^(y|yes)$')
}

# ---------------------------------------------------------------------------
# Prerequisites & single-instance detection
# ---------------------------------------------------------------------------

function Get-McpUrl {
    $scheme = 'https'   # we always configure TLS in this integration
    $path = if ($Transport -eq 'sse') { '/sse' } else { '/mcp/' }
    # Bracket IPv6 literals (contain ':' and not already bracketed) for the URL.
    $h = if ($BindHost.Contains(':') -and -not $BindHost.StartsWith('[')) { "[$BindHost]" } else { $BindHost }
    return "${scheme}://${h}:${Port}${path}"
}

function Test-PortListening {
    param([int]$TcpPort)
    try {
        $conns = Get-NetTCPConnection -LocalPort $TcpPort -State Listen -ErrorAction Stop
        return [bool]$conns
    } catch {
        # Get-NetTCPConnection throws when there are no matching connections.
        return $false
    }
}

function Get-RunningPid {
    <# Returns the live PID from the lockfile only if it is actually our
       windows-mcp server, else $null. Verifying the command line guards against
       PID reuse: if the tracked process died and the OS recycled its PID for an
       unrelated process, we must not report (or later Stop-Process) it. #>
    if (-not (Test-Path $script:LockFile)) { return $null }
    $raw = (Get-Content $script:LockFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if (-not $raw) { return $null }
    $pidValue = 0
    if (-not [int]::TryParse($raw.Trim(), [ref]$pidValue)) { return $null }
    if (-not (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) { return $null }

    # Confirm identity via the command line before trusting the PID. If the
    # command line can't be read (access denied) or doesn't reference
    # windows-mcp, fail closed and treat it as not-running.
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue" -ErrorAction SilentlyContinue
    if ($cim -and $cim.CommandLine -and ($cim.CommandLine -like '*windows-mcp*')) {
        return $pidValue
    }
    return $null
}

function Test-ServerRunning {
    # Running if either the lockfile PID is alive or the port is being listened on.
    return ($null -ne (Get-RunningPid)) -or (Test-PortListening -TcpPort $Port)
}

function Assert-UvxAvailable {
    if (Test-CommandExists 'uvx') { return $true }
    Write-Warn "'uvx' was not found on PATH. Windows-MCP runs via uv/uvx."
    Write-Warn "Install uv with:  winget install astral-sh.uv   (or: pip install uv)"
    return $false
}

# ---------------------------------------------------------------------------
# mkcert installation (scoop -> winget -> choco -> manual/openssl fallback)
# ---------------------------------------------------------------------------

function Install-Mkcert {
    if (Test-CommandExists 'mkcert') {
        Write-Info 'mkcert is already installed.'
        return $true
    }

    if (Test-CommandExists 'scoop') {
        if (Confirm-Action 'Install mkcert via scoop?') {
            Write-Info 'Installing mkcert via scoop...'
            scoop install mkcert
            if (Test-CommandExists 'mkcert') { return $true }
        }
    } else {
        Write-Info 'scoop not found; trying the next package manager.'
    }

    if (-not (Test-CommandExists 'mkcert') -and (Test-CommandExists 'winget')) {
        if (Confirm-Action 'Install mkcert via winget (FiloSottile.mkcert)?') {
            Write-Info 'Installing mkcert via winget...'
            winget install -e --id FiloSottile.mkcert --accept-source-agreements --accept-package-agreements
            if (Test-CommandExists 'mkcert') { return $true }
        }
    }

    if (-not (Test-CommandExists 'mkcert') -and (Test-CommandExists 'choco')) {
        if (Confirm-Action 'Install mkcert via choco?') {
            Write-Info 'Installing mkcert via choco...'
            choco install mkcert -y
            if (Test-CommandExists 'mkcert') { return $true }
        }
    }

    if (-not (Test-CommandExists 'mkcert')) {
        Write-Warn 'mkcert could not be installed automatically.'
        Write-Warn 'Install it manually for locally-trusted certificates:'
        Write-Warn '    scoop install mkcert   |   winget install FiloSottile.mkcert   |   choco install mkcert'
        Write-Warn 'Continuing: `windows-mcp auth --with-tls` will fall back to an openssl self-signed cert.'
        return $false
    }
    return $true
}

# ---------------------------------------------------------------------------
# Certificate / auth-key setup via Windows-MCP's own `auth` command
# ---------------------------------------------------------------------------

function Invoke-CertSetup {
    # `windows-mcp auth --with-tls` generates an auth key and TLS cert/key,
    # preferring mkcert (locally trusted) over openssl, and saves everything to
    # ~/.windows-mcp/config.toml which `serve` then reads.
    if (-not (Confirm-Action "Set up SSL/TLS certificates and an auth key for Windows-MCP ($Transport on ${BindHost}:${Port})?")) {
        Write-Info 'Skipping certificate setup at user request.'
        return
    }

    New-Item -ItemType Directory -Force -Path $script:ConfigDir | Out-Null
    $authArgs = @("windows-mcp==$($script:WindowsMcpVersion)", 'auth', '--transport', $Transport, '--host', $BindHost, '--port', "$Port", '--with-tls')
    if ($Force) { $authArgs += '--force' }

    # Run under a timeout with stdout/stderr captured to files. `mkcert -install`
    # (invoked inside `windows-mcp auth`) can block on an interactive Windows
    # trust-store dialog in a headless/CI session; without this guard the call
    # hangs indefinitely. On timeout we kill it and print an actionable message.
    Write-Info "Running: uvx $($authArgs -join ' ')"
    Write-Info "  (timeout ${CertSetupTimeoutSec}s; logs: $script:AuthLog , $script:AuthErrLog)"
    $proc = Start-Process -FilePath 'uvx' -ArgumentList $authArgs -PassThru -NoNewWindow `
        -RedirectStandardOutput $script:AuthLog -RedirectStandardError $script:AuthErrLog

    if (-not $proc.WaitForExit($CertSetupTimeoutSec * 1000)) {
        # taskkill /T kills the whole tree (uvx -> python -> mkcert); it is
        # available on all Windows and, unlike Process.Kill([bool]), works on
        # Windows PowerShell 5.1 as well as pwsh 7.
        try { & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null } catch { Write-Warn "taskkill failed: $($_.Exception.Message)" }
        Write-Warn "Certificate setup timed out after ${CertSetupTimeoutSec}s."
        Write-Warn "Most likely 'mkcert -install' is blocked on an interactive Windows trust prompt in a"
        Write-Warn "non-interactive/headless session. Remedies:"
        Write-Warn "  - run this setup interactively once on the target machine, or"
        Write-Warn "  - re-run with -SkipMkcertInstall to use an openssl self-signed cert instead."
        Write-CertSetupLogTail
        throw "windows-mcp auth timed out after ${CertSetupTimeoutSec}s (likely an interactive mkcert -install trust prompt)."
    }
    if ($proc.ExitCode -ne 0) {
        Write-CertSetupLogTail
        throw "windows-mcp auth failed with exit code $($proc.ExitCode). See $script:AuthErrLog"
    }
    Write-Info "Certificate + auth key configured (log: $script:AuthLog)."
    Repair-WindowsMcpConfig
}

function Write-CertSetupLogTail {
    if (Test-Path $script:AuthLog)    { Write-Info "--- auth stdout (tail) ---"; Get-Content $script:AuthLog -Tail 20 -ErrorAction SilentlyContinue }
    if (Test-Path $script:AuthErrLog) { Write-Info "--- auth stderr (tail) ---"; Get-Content $script:AuthErrLog -Tail 20 -ErrorAction SilentlyContinue }
}

function Repair-WindowsMcpConfig {
    # `windows-mcp auth` writes Windows cert paths into TOML *basic* strings
    # (double-quoted) without escaping backslashes, e.g.
    #   ssl_certfile = "C:\Users\me\.windows-mcp\cert.pem"
    # In TOML a basic string treats `\` as an escape, so `\U` (from `\Users`) is
    # read as a \UXXXXXXXX unicode escape and `serve` fails to parse its own
    # config with "Invalid hex value". Rewrite only the ssl_* path lines to use
    # forward slashes — valid in TOML and accepted by Windows file APIs.
    # (Upstream bug surfaced by the live CI probe, 2026-07-09.) Idempotent.
    $cfgPath = Join-Path $env:USERPROFILE '.windows-mcp\config.toml'
    if (-not (Test-Path $cfgPath)) { return }
    $changed = $false
    $out = foreach ($line in (Get-Content -LiteralPath $cfgPath)) {
        if ($line -match '^\s*(ssl_certfile|ssl_keyfile)\s*=' -and $line.Contains('\')) {
            $changed = $true
            $line -replace '\\', '/'
        } else {
            $line
        }
    }
    if ($changed) {
        Set-Content -LiteralPath $cfgPath -Value $out -Encoding utf8
        Write-Info 'Normalised Windows cert paths in config.toml to forward slashes (TOML backslash-escape workaround).'
    }
}

# ---------------------------------------------------------------------------
# Launch (single instance) / stop
# ---------------------------------------------------------------------------

function Start-WindowsMcp {
    New-Item -ItemType Directory -Force -Path $script:ConfigDir | Out-Null
    Repair-WindowsMcpConfig  # defensive: also fix config.toml when launch is run standalone

    # Acquire a machine-wide named mutex to serialise concurrent launch attempts.
    # In a multi-agent swarm (CAMSO / CAICEWAC), parallel agents frequently race
    # to call Start-WindowsMcp simultaneously; without a mutex they each evaluate
    # Test-ServerRunning as $false and spawn two competing server processes on the
    # same port. The Global\ prefix makes the mutex visible across all Windows
    # sessions and processes (elevated and non-elevated).
    $mutex = [System.Threading.Mutex]::new($false, 'Global\ZellijWindowsMCP')
    $mutexAcquired = $false
    try {
        # WaitOne returns true (acquired) or false (timeout). On abandonment (the
        # previous holder was hard-killed) it throws AbandonedMutexException, but
        # the caller gains ownership per the .NET contract, so we treat it as
        # acquired and log a warning rather than propagating the exception.
        try {
            $mutexAcquired = $mutex.WaitOne(30000)
        } catch [System.Threading.AbandonedMutexException] {
            $mutexAcquired = $true  # ownership transfers to us on abandonment
            Write-Warn 'Launch mutex was abandoned (prior holder killed). Taking ownership and proceeding.'
        }
        if (-not $mutexAcquired) {
            # Timeout: another agent has been holding the mutex for > 30 s (unusual;
            # normal startup takes < 25 s). Proceed without the guard, but re-check
            # Test-ServerRunning below — if the concurrent agent succeeded in the
            # meantime the existing-server branch will short-circuit correctly.
            Write-Warn 'Launch mutex not acquired within 30 s; concurrent agent may be launching. Proceeding.'
        }

        if (Test-ServerRunning) {
            $existingPid = Get-RunningPid
            Write-Info "Windows-MCP already running (launch is a no-op). PID=$existingPid"
            Write-Result @{
                action    = 'launch'
                running   = $true
                alreadyUp = $true
                pid       = $existingPid
                host      = $BindHost
                port      = $Port
                transport = $Transport
                tls       = $true
                url       = (Get-McpUrl)
            }
            return
        }

        $serveArgs = @("windows-mcp==$($script:WindowsMcpVersion)", 'serve', '--transport', $Transport, '--host', $BindHost, '--port', "$Port")
        # Explicit overrides take precedence over config.toml when provided.
        if ($AuthKey)     { $serveArgs += @('--auth-key', $AuthKey) }
        if ($IpAllowlist) { $serveArgs += @('--ip-allowlist', $IpAllowlist) }
        if ($CertFile -and $KeyFile) {
            $serveArgs += @('--ssl-certfile', $CertFile, '--ssl-keyfile', $KeyFile)
        }

        Write-Info "Launching: uvx $($serveArgs -join ' ')"
        $proc = Start-Process -FilePath 'uvx' -ArgumentList $serveArgs `
            -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $script:LogOut -RedirectStandardError $script:LogErr

        # Confirm the server actually came up before reporting success. A fast exit
        # (bad config, missing deps — e.g. the config.toml TOML-escape bug) must not
        # be reported as running=true with a stale PID file. Wait up to ~20s for the
        # process to still be alive AND the port to be listening.
        $listening = $false
        foreach ($i in 1..20) {
            Start-Sleep -Seconds 1
            if ($proc.HasExited) { break }
            if (Test-PortListening -TcpPort $Port) { $listening = $true; break }
        }
        if ($proc.HasExited -or -not $listening) {
            Write-Warn "Windows-MCP did not come up (exited=$($proc.HasExited), listening=$listening)."
            if (Test-Path $script:LogErr) { Write-Info '--- serve stderr (tail) ---'; Get-Content $script:LogErr -Tail 25 -ErrorAction SilentlyContinue }
            throw "windows-mcp serve failed to start listening on ${BindHost}:${Port} (see $script:LogErr)."
        }

        # Write the lockfile *inside* the mutex hold so that any waiting agent wakes
        # up, re-evaluates Test-ServerRunning, finds the port listening or the PID
        # file, and short-circuits rather than spawning a duplicate process.
        Set-Content -Path $script:LockFile -Value $proc.Id -Encoding ascii
        Write-Info "Windows-MCP started and listening. PID=$($proc.Id)  URL=$(Get-McpUrl)"
        Write-Info "Logs: $script:LogOut  |  $script:LogErr"

        Write-Result @{
            action    = 'launch'
            running   = $true
            alreadyUp = $false
            pid       = $proc.Id
            host      = $BindHost
            port      = $Port
            transport = $Transport
            tls       = $true
            url       = (Get-McpUrl)
        }
    } finally {
        if ($mutexAcquired) { $mutex.ReleaseMutex() }
        $mutex.Dispose()
    }
}

function Stop-WindowsMcp {
    $pidValue = Get-RunningPid
    if ($pidValue) {
        Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        Write-Info "Stopped Windows-MCP (PID=$pidValue)."
    } else {
        Write-Info 'No tracked Windows-MCP process to stop.'
    }
    if (Test-Path $script:LockFile) { Remove-Item $script:LockFile -Force -ErrorAction SilentlyContinue }
    Write-Result @{ action = 'stop'; running = $false; host = $BindHost; port = $Port }
}

function Get-Status {
    $pidValue = Get-RunningPid
    $listening = Test-PortListening -TcpPort $Port
    $running = ($null -ne $pidValue) -or $listening
    Write-Result @{
        action    = 'status'
        running   = $running
        pid       = $pidValue
        listening = $listening
        host      = $BindHost
        port      = $Port
        transport = $Transport
        tls       = $true
        url       = (Get-McpUrl)
    }
}

function Install-Task {
    if (-not (Assert-UvxAvailable)) { throw 'uvx is required to install the scheduled task.' }
    $taskArgs = @("windows-mcp==$($script:WindowsMcpVersion)", 'install', '--transport', $Transport, '--host', $BindHost, '--port', "$Port")
    if ($Force) { $taskArgs += '--force' }
    Write-Info "Running: uvx $($taskArgs -join ' ')"
    & uvx @taskArgs
    if ($LASTEXITCODE -ne 0) { throw "windows-mcp install failed with exit code $LASTEXITCODE" }
    Write-Result @{ action = 'install-task'; installed = $true; host = $BindHost; port = $Port; transport = $Transport }
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

try {
    switch ($Action) {
        'setup' {
            if (-not (Assert-UvxAvailable)) { throw 'uvx is required. Install uv first, then re-run setup.' }
            if ($SkipMkcertInstall) {
                Write-Info 'Skipping mkcert install (-SkipMkcertInstall); windows-mcp will use an openssl self-signed cert.'
            } else {
                Install-Mkcert | Out-Null
            }
            Invoke-CertSetup
            Start-WindowsMcp
        }
        'launch'       { if (-not (Assert-UvxAvailable)) { throw 'uvx is required to launch Windows-MCP.' }; Start-WindowsMcp }
        'status'       { Get-Status }
        'stop'         { Stop-WindowsMcp }
        'install-task' { Install-Task }
    }
} catch {
    Write-Result @{ action = $Action; running = $false; error = "$($_.Exception.Message)" }
    Write-Error $_
    exit 1
}
