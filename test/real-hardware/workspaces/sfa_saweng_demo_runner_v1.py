#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "rich>=13.7.0",
# ]
# ///

"""
SAWEng Demo-Runner v1: Idempotent Zellij workspace launcher for CAICEWAC demonstrations.

/// Example Usage

# Check if the workspace exists
uv run sfa_saweng_demo_runner_v1.py status

# Get help on all subcommands
uv run sfa_saweng_demo_runner_v1.py --help

# Launch the workspace interactively
uv run sfa_saweng_demo_runner_v1.py launch

# Launch the workspace in the background
uv run sfa_saweng_demo_runner_v1.py launch --background

# Get a description of the workspace
uv run sfa_saweng_demo_runner_v1.py describe

# Get description with AI explanation (requires ANTHROPIC_API_KEY)
uv run sfa_saweng_demo_runner_v1.py describe --ai

# Run preflight checks
uv run sfa_saweng_demo_runner_v1.py doctor

# Terminate the workspace
uv run sfa_saweng_demo_runner_v1.py stop

# Dry-run any command (print but don't execute)
uv run sfa_saweng_demo_runner_v1.py launch --dry-run

///
"""

import os
import sys
import re
import argparse
import subprocess
from typing import Optional, Tuple, List
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

# =====================================================================
# Framework: CAICEWAC/SAWEng (Cognitive Architecture Inspired Context
#            Engineered Workspaces As Code / Situated Attention Workspace
#            Engineering)
# Ontology: CAMSO-Core (A -> W -> S -> M)
# Lineage: MAIESAW Engine (Metacognitive Agentic Intelligent Entities
#          Situated Attention Workspace; predecessor acronym MAWE)
# Created: 2026-07-12
# PromptVer-TDD Stage: "Make it Boot" v0.1.x
# =====================================================================

console = Console()
DEFAULT_SESSION_NAME = "windows-mcp-real-hardware-e2e-v001"
DEFAULT_LAYOUT_RELATIVE = "windows-mcp-real-hardware-e2e-v0.0.1.kdl"


def get_layout_path(layout_arg: Optional[str]) -> Path:
    """Resolve layout path relative to script's own location."""
    if layout_arg:
        return Path(layout_arg)
    script_dir = Path(__file__).parent
    return script_dir / DEFAULT_LAYOUT_RELATIVE


def strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from text."""
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)


def session_exists(session_name: str) -> bool:
    """Check if a zellij session exists."""
    try:
        result = subprocess.run(
            ["zellij", "list-sessions"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            return False
        # Strip ANSI codes and look for the session name
        clean_output = strip_ansi(result.stdout)
        # Session name appears at start of line
        for line in clean_output.split('\n'):
            if line.strip().startswith(session_name):
                return True
        return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def get_session_status(session_name: str) -> Optional[str]:
    """
    Get session status: 'current', 'exited', or None if not found.
    """
    try:
        result = subprocess.run(
            ["zellij", "list-sessions"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            return None
        clean_output = strip_ansi(result.stdout)
        for line in clean_output.split('\n'):
            if line.strip().startswith(session_name):
                # Check for (current) or (exited) markers
                if "(current)" in line:
                    return "current"
                elif "(exited)" in line:
                    return "exited"
                else:
                    return "running"
        return None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None


def cmd_status(args) -> int:
    """
    Check if the session exists and report its status.
    Exit 0 if exists, 3 if not.
    """
    if args.dry_run:
        console.print("[dim]Would run:[/dim] zellij list-sessions")
        return 0

    if session_exists(args.session_name):
        status = get_session_status(args.session_name)
        if status == "current":
            console.print(f"[green][OK][/green] Session '[bold]{args.session_name}[/bold]' exists and is [bold]current[/bold]")
        elif status == "exited":
            console.print(f"[yellow][!][/yellow] Session '[bold]{args.session_name}[/bold]' exists but is [bold]exited[/bold]")
        else:
            console.print(f"[green][OK][/green] Session '[bold]{args.session_name}[/bold]' exists and is [bold]running[/bold]")
        return 0
    else:
        console.print(f"[red][FAIL][/red] Session '[bold]{args.session_name}[/bold]' does not exist")
        return 3


def cmd_launch(args) -> int:
    """
    Idempotently launch the workspace.
    Mirrors Global\\ZellijWindowsMCP mutex philosophy: if session exists, do nothing.
    Exit 0 on success or if already exists.
    """
    layout_path = get_layout_path(args.layout)

    if not layout_path.exists():
        console.print(f"[red][FAIL][/red] Layout file not found: {layout_path}")
        return 1

    if args.dry_run:
        if args.background:
            cmd = ["zellij", "--layout", str(layout_path), "attach", "-b", args.session_name]
        else:
            cmd = ["zellij", "--layout", str(layout_path), "attach", "-c", args.session_name]
        console.print(f"[dim]Would run:[/dim] {' '.join(cmd)}")
        return 0

    # Idempotent: check if already exists (mirrors mutex philosophy)
    if session_exists(args.session_name):
        console.print(f"[green][OK][/green] Session '[bold]{args.session_name}[/bold]' already exists; skipping creation")
        return 0

    # Create the session.
    #
    # `--layout` is a GLOBAL zellij option (appears in `zellij --help`, NOT in
    # `zellij attach --help`) and must precede the `attach` subcommand; `attach`
    # itself only understands `-b/--create-background` and `-c/--create` for
    # "create if missing". Verified empirically against zellij 0.44.3 on this
    # machine (`zellij --help`, `zellij attach --help`) and matches the
    # canonical invocation documented in the layout file's own header.
    #
    # KNOWN RESIDUAL (--background only, zellij 0.44.3 on this Windows build):
    # `zellij --layout <path> attach -b <name>` can self-terminate a few
    # seconds after creation -- verified via `zellij --debug`, whose log shows
    # `ApplyLayout` repeatedly issuing `QueryTerminalSize` to a client that was
    # never actually attached (that's the entire point of `-b`), each query
    # timing out ("NewTab did not complete within 1s timeout"), until the
    # server exits. Reproduces even with a trivial one-pane custom layout
    # (`--layout-string 'layout { pane; }'`), so it is not specific to this
    # workspace's tab/plugin count -- it is `-b` + ANY custom `--layout`. A
    # bare `attach -b <name>` with NO `--layout` (zellij's built-in default)
    # persists reliably. This looks like an upstream zellij/Windows limitation
    # (ApplyLayout's terminal-size negotiation has no client to answer it in
    # headless mode) rather than an invocation-flag bug -- the flags above are
    # independently verified correct, and are exactly what the layout file's
    # own header prescribes. Not fixable from this wrapper script alone.
    try:
        if args.background:
            # Create detached session in background; process returns once the
            # session is up (does not block for the session's lifetime).
            #
            # Deliberately subprocess.Popen(..., creationflags=...) here, not
            # subprocess.run(): empirically, a plain subprocess.run() child on
            # Windows inherits the INVOKING process's Job Object, and a Job
            # Object with kill-on-close semantics (the norm for CI runners,
            # containers, and agent/automation harnesses -- confirmed on this
            # machine's own tool harness) kills every descendant, including
            # this "detached" zellij session, the moment the invoking
            # process/job tears down. `zellij attach -b` itself reports exit 0
            # and the session is briefly visible in `zellij list-sessions`,
            # then silently vanishes -- so this is not visible from the
            # immediate return code alone. CREATE_BREAKAWAY_FROM_JOB detaches
            # the child from that job (only viable if the job permits
            # breakaway, which it does here); CREATE_NEW_PROCESS_GROUP +
            # CREATE_NO_WINDOW keep it from being tied to this console.
            # Verified by launching, then checking `zellij list-sessions` from
            # a brand-new shell invocation (i.e. after the launching
            # process/job has fully exited) and confirming the session is
            # still present.
            creationflags = 0
            if os.name == "nt":
                creationflags = (
                    subprocess.CREATE_NEW_PROCESS_GROUP
                    | subprocess.CREATE_BREAKAWAY_FROM_JOB
                    | subprocess.CREATE_NO_WINDOW
                )
            proc = subprocess.Popen(
                ["zellij", "--layout", str(layout_path), "attach", "-b", args.session_name],
                creationflags=creationflags,
            )
            try:
                returncode = proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                # The client process handing off to the now-breakaway'd
                # background session can legitimately outlive our wait
                # window; treat as fire-and-forget rather than a failure.
                returncode = 0
            result = subprocess.CompletedProcess(proc.args, returncode)
        else:
            # Create-and-attach interactively. Deliberately subprocess.run()
            # here, not os.execvp(): Windows has no real fork/exec, so
            # CPython emulates os.execvp() as spawn-then-wait-then-exit,
            # which behaves inconsistently across terminal hosts (can spawn
            # a second console window, decouple/lose the child's exit code,
            # and break Ctrl-C forwarding to the child). subprocess.run()
            # blocks deterministically on the child and its returncode is
            # forwarded explicitly below via the normal return path, which is
            # both more predictable on Windows and actually testable
            # (--dry-run can show the exact argv without relying on exec
            # semantics that never return control to this function).
            result = subprocess.run(
                ["zellij", "--layout", str(layout_path), "attach", "-c", args.session_name],
            )

        if result.returncode == 0:
            console.print(f"[green][OK][/green] Workspace launched successfully (session: '[bold]{args.session_name}[/bold]')")
            return 0
        else:
            console.print(f"[red][FAIL][/red] Failed to launch workspace")
            return 1
    except FileNotFoundError:
        console.print("[red][FAIL][/red] zellij not found on PATH")
        return 1
    except Exception as e:
        console.print(f"[red][FAIL][/red] Error launching workspace: {e}")
        return 1


def cmd_describe(args) -> int:
    """
    Self-describe the demo workspace.
    Tier A: Static description from KDL header.
    Tier B: Optional AI explanation if ANTHROPIC_API_KEY set and --ai flag passed.
    """
    layout_path = get_layout_path(args.layout)

    # ===== TIER A: Static description =====
    static_desc = """
[bold cyan]CAICEWAC Workspace-as-Code :: windows-mcp-real-hardware-e2e-v0.0.1[/bold cyan]

[bold]Framework:[/bold] CAICEWAC (Cognitive Architecture Inspired Context Engineered Workspaces As Code)

[bold]Ontology:[/bold] CAMSO-Core (A -> W -> S -> M)
  - Agentic System (S): This Zellij session
  - Workspace (W) tier: Each tab hosts Agent(s) (A)
  - Meta-System (M) tier: Claude + human operate here
  - Single-writer discipline enforced for v0.0.1

[bold]Workflow (Tab Order):[/bold] Cognitive flow encoded left -> right
  - [cyan]00_leader-claude-M[/cyan] - Meta-tier lead (Claude Code, this session)
  - [cyan]10_sources-assurance[/cyan] - HASE-COMPLIANCE, CONFIDENCE-RUBRIC, SECOND-OPINION-CST
  - [cyan]20_planning-gfsm[/cyan] - GFSM state tracking, PromptVer-TDD stage notes
  - [cyan]30_windows-mcp-live-hero-test[/cyan] - Windows-MCP setup (interactive mkcert trust dialog)
  - [cyan]40_grok-recipient[/cyan] - Grok agent (start_suspended=true)
  - [cyan]50_claude2-recipient[/cyan] - Claude Code agent (start_suspended=true)
  - [cyan]60_agy-recipient[/cyan] - Agentic framework (start_suspended=true)
  - [cyan]70_monitor-obs[/cyan] - Defender/AV, topology, PowerShell observation
  - [cyan]80_review-provenance[/cyan] - Provenance record writing/review

[bold]Key Principle:[/bold] Recipient tabs (40/50/60) start suspended. Leader deliberately resumes
each one at a time as a controlled probe-never unattended, concurrent launch.

[bold]Reference:[/bold] docs/Provenance/Windows-MCP/2026-07-11-multi-harness-registration-demo.md
    """

    console.print(Panel(static_desc.strip(), title="[bold]SAWEng Demo Description[/bold]", expand=False))

    # ===== TIER B: Optional AI explanation =====
    if args.ai:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            console.print("\n[yellow][!][/yellow] [dim]--ai flag set but ANTHROPIC_API_KEY not found in environment; skipping AI tier[/dim]")
            return 0

        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=api_key)

            if not layout_path.exists():
                console.print(f"[yellow][!][/yellow] [dim]Layout file not found; skipping AI tier[/dim]")
                return 0

            kdl_content = layout_path.read_text(encoding='utf-8')

            console.print("\n[dim]Querying Claude for AI explanation...[/dim]")

            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Here is a Zellij workspace layout file (KDL format).
Explain concisely in plain language what this workspace demonstrates and why it matters.
Keep your explanation brief but insightful.

---
{kdl_content}
---"""
                    }
                ]
            )

            ai_text = response.content[0].text
            console.print(Panel(ai_text, title="[bold]AI Explanation[/bold]", expand=False))

        except ImportError:
            console.print("\n[yellow][!][/yellow] [dim]anthropic library not available; skipping AI tier[/dim]")
            return 0
        except Exception as e:
            console.print(f"\n[yellow][!][/yellow] [dim]AI tier failed (non-fatal): {e}[/dim]")
            return 0

    return 0


def cmd_stop(args) -> int:
    """
    Stop the workspace (idempotent).
    Only kill if session exists.
    Exit 0 in all cases.
    """
    if args.dry_run:
        if session_exists(args.session_name):
            console.print(f"[dim]Would run:[/dim] zellij kill-session {args.session_name}")
        else:
            console.print(f"[dim]Session does not exist; nothing to do[/dim]")
        return 0

    if not session_exists(args.session_name):
        console.print(f"[green][OK][/green] Session '[bold]{args.session_name}[/bold]' not found; nothing to stop")
        return 0

    try:
        result = subprocess.run(
            ["zellij", "kill-session", args.session_name],
            timeout=5
        )
        if result.returncode == 0:
            console.print(f"[green][OK][/green] Workspace stopped (session: '[bold]{args.session_name}[/bold]')")
            return 0
        else:
            console.print(f"[red][FAIL][/red] Failed to stop workspace")
            return 1
    except FileNotFoundError:
        console.print("[red][FAIL][/red] zellij not found on PATH")
        return 1
    except Exception as e:
        console.print(f"[red][FAIL][/red] Error stopping workspace: {e}")
        return 1


def cmd_doctor(args) -> int:
    """
    Preflight checks.
    Exit 0 if all HARD checks pass, 4 if any HARD check fails.

    Checks 1-3 (zellij present, layout exists, braces balanced) are HARD
    requirements and must ALL pass. Checks 4-5 (session existence, API key)
    are purely informational/optional and never count toward pass/fail --
    a fresh-checkout doctor run with no session yet created and no API key
    set is still a healthy result.
    """
    hard_checks_passed = 0
    hard_checks_total = 3

    # Check 1 (HARD): zellij on PATH + version
    try:
        result = subprocess.run(["zellij", "--version"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            version = strip_ansi(result.stdout).strip()
            console.print(f"[green][OK][/green] zellij found: {version}")
            hard_checks_passed += 1
        else:
            console.print("[red][FAIL][/red] zellij --version failed")
    except FileNotFoundError:
        console.print("[red][FAIL][/red] zellij not found on PATH")
    except Exception as e:
        console.print(f"[red][FAIL][/red] zellij version check failed: {e}")

    # Check 2 (HARD): layout file exists
    layout_path = get_layout_path(args.layout)
    if layout_path.exists():
        console.print(f"[green][OK][/green] Layout file exists: {layout_path}")
        hard_checks_passed += 1
    else:
        console.print(f"[red][FAIL][/red] Layout file not found: {layout_path}")

    # Check 3 (HARD): layout file has balanced braces
    if layout_path.exists():
        try:
            content = layout_path.read_text(encoding='utf-8')
            open_count = content.count('{')
            close_count = content.count('}')
            if open_count == close_count:
                console.print(f"[green][OK][/green] Layout file braces balanced ({open_count} pairs)")
                hard_checks_passed += 1
            else:
                console.print(f"[red][FAIL][/red] Layout file braces unbalanced: {open_count} {{ vs {close_count} }}")
        except Exception as e:
            console.print(f"[red][FAIL][/red] Failed to check layout file: {e}")
    else:
        console.print("[red][FAIL][/red] Skipping brace-balance check; layout file missing")

    # Check 4 (INFORMATIONAL): session existence -- never affects pass/fail
    if session_exists(args.session_name):
        status = get_session_status(args.session_name)
        console.print(f"[yellow][INFO][/yellow] Session '[bold]{args.session_name}[/bold]' exists ({status})")
    else:
        console.print(f"[yellow][INFO][/yellow] Session '[bold]{args.session_name}[/bold]' does not exist (expected on first run)")

    # Check 5 (INFORMATIONAL): ANTHROPIC_API_KEY presence -- never affects pass/fail
    if os.environ.get("ANTHROPIC_API_KEY"):
        console.print("[green][OK][/green] ANTHROPIC_API_KEY is set")
    else:
        console.print("[yellow][INFO][/yellow] ANTHROPIC_API_KEY not set (AI features will be unavailable)")

    # Final summary
    console.print()
    if hard_checks_passed >= hard_checks_total:
        console.print("[green][OK][/green] [bold]Preflight checks passed[/bold]")
        return 0
    else:
        console.print(f"[red][FAIL][/red] [bold]Preflight checks failed[/bold] ({hard_checks_passed}/{hard_checks_total} hard checks passed)")
        return 4


def main():
    # `--layout`/`--session-name`/`--dry-run` are shared by every subcommand.
    # They live ONLY on a `parents=[]` template (add_help=False to avoid a
    # duplicate -h/--help) attached to each subparser -- deliberately NOT
    # also attached to the top-level `parser`. Putting the same dest on both
    # the main parser and a subparser is an argparse footgun: argparse's
    # `_SubParsersAction.__call__` parses the subcommand's arguments into a
    # *fresh* namespace and then unconditionally `setattr`s every one of its
    # attributes onto the shared namespace -- including its own defaults --
    # so `prog --layout X doctor` would have its `--layout X` SILENTLY
    # clobbered back to the subparser's `default=None`. Confirmed empirically
    # on this machine: that exact invocation returned exit 0 ("passed") while
    # actually still reading the DEFAULT layout file, not the nonexistent one
    # the caller asked to check. Restricting the flags to subparsers only
    # means every invocation must place them after the subcommand
    # (`prog launch --dry-run`, `prog doctor --layout X`), which matches this
    # script's own docstring examples and is unambiguous -- there is no
    # global-only invocation form left to silently misparse.
    common_parser = argparse.ArgumentParser(add_help=False)
    common_parser.add_argument(
        "--layout",
        type=str,
        default=None,
        help=f"Path to layout file (default: {DEFAULT_LAYOUT_RELATIVE} relative to script location)"
    )
    common_parser.add_argument(
        "--session-name",
        type=str,
        default=DEFAULT_SESSION_NAME,
        help=f"Zellij session name (default: {DEFAULT_SESSION_NAME})"
    )
    common_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print commands but do not execute"
    )

    parser = argparse.ArgumentParser(
        description="SAWEng Demo-Runner: Idempotent Zellij workspace launcher for CAICEWAC demonstrations"
    )

    subparsers = parser.add_subparsers(dest="command", help="Subcommand to run")

    # status subcommand
    subparsers.add_parser("status", help="Check if session exists and report status", parents=[common_parser])

    # launch subcommand
    launch_parser = subparsers.add_parser("launch", help="Idempotently launch the workspace", parents=[common_parser])
    launch_parser.add_argument(
        "--background",
        action="store_true",
        help="Launch in background (detached) without attaching"
    )

    # describe subcommand
    describe_parser = subparsers.add_parser("describe", help="Describe the workspace", parents=[common_parser])
    describe_parser.add_argument(
        "--ai",
        action="store_true",
        help="Include AI-generated explanation (requires ANTHROPIC_API_KEY)"
    )

    # stop subcommand
    subparsers.add_parser("stop", help="Stop the workspace (idempotent)", parents=[common_parser])

    # doctor subcommand
    subparsers.add_parser("doctor", help="Run preflight checks", parents=[common_parser])

    args = parser.parse_args()

    # Dispatch to subcommand
    if args.command == "status":
        return cmd_status(args)
    elif args.command == "launch":
        return cmd_launch(args)
    elif args.command == "describe":
        return cmd_describe(args)
    elif args.command == "stop":
        return cmd_stop(args)
    elif args.command == "doctor":
        return cmd_doctor(args)
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())
