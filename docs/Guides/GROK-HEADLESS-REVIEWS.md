# Grok Build CLI as a Rate-Limit-Independent Local Reviewer

**Purpose:** operational guide for using xAI's Grok Build CLI (`grok`) as a
headless, on-device, second-AISP code reviewer for this repo — resilience against
any single AI Service Provider's session/rate limits (empirically motivated: an
Anthropic session limit killed an implementer sub-agent mid-task on 2026-07-12),
and one leg of the three-AISP review triad (Anthropic sub-agents, xAI Grok,
OpenAI-powered GitHub Copilot PR review).

All flags below were empirically confirmed against the installed `grok` v0.2.93
on `CW-WinDevTablet1` (2026-07-12) via `grok --help` / `grok agent --help` —
re-verify with `--help` after upgrades; do not trust this doc over the binary.

## The headless review invocation (confirmed flags)

```powershell
# Single-turn, non-interactive, isolated worktree, output to stdout:
grok --single "<review prompt>" `
     --worktree saweng-review `
     --max-turns 20 `
     --output-format json
```

Key confirmed capabilities:

| Flag | Use |
|---|---|
| `-p, --single <PROMPT>` / `--prompt-file <PATH>` | Headless single-turn; prints response and exits. `--prompt-file` for long review briefs. |
| `-w, --worktree [<NAME>]` (+ `--worktree-ref`) | Runs the session in a fresh git worktree — the reviewer cannot dirty the primary checkout. |
| `--allow <RULE>` / `--deny <RULE>` | Permission rules (Claude Code `--allowedTools` analog) — the mechanism for scoped `gh` authorization (below). |
| `--permission-mode <MODE>` | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`. Prefer `default`+explicit `--allow` rules over broad modes. |
| `--check` | Appends a self-verification loop (headless only) — HASEng-aligned; use for review runs. |
| `--best-of-n <N>` | Runs the task N ways in parallel, picks the best (headless only) — for high-stakes reviews. |
| `--json-schema <SCHEMA>` | Constrains output to a JSON Schema — machine-parseable review findings. |
| `--max-turns <N>` | Bounds agentic tool-use turns. Always set for headless runs. |
| `--rules <RULES>` | Extra system-prompt rules — inject repo conventions (argv-arrays, --repo-explicit gh, etc.). |
| `grok agent stdio\|serve\|headless` | Programmatic embedding: stdio for pipe-driven, `serve` for a local WebSocket server. Future MAIESAW-Engine integration surface. |
| `grok mcp add ...` | Already used: `zellij-mcp` is registered user-scope (2026-07-11). |

## `gh` authorization for reviewer agents (agreed guardrails, 2026-07-12)

Both Grok reviewer runs and Anthropic sub-agents ARE authorized to use the GitHub
CLI to file findings as Issues, under these hard guardrails:

1. **Always `--repo sebastian-kwinana/zellij-mcp-server` explicitly** — `gh`'s
   default-repo resolution silently picked an unrelated fork once already
   (2026-07-11); never rely on repo-context inference.
2. **Create/comment only** — `gh issue create`, `gh issue comment`. Never close,
   edit, transfer, or delete issues; never touch repo settings; never `gh pr merge`.
3. **Always labelled** — at minimum one of `real-hardware`, `windows-mcp`,
   `multi-harness`, `assurance`, plus severity in the title. Milestone
   "Real-Hardware Validation v1" where applicable.
4. **Triage-quality bodies** — file:line references, reproduction, severity
   rationale; a finding that can't cite a location goes in the review summary,
   not an Issue.

Grok example (scoped allow-rules, shape may need adjustment to grok's rule
grammar — verify on first use):

```powershell
grok --single "<review brief instructing triage-to-Issues>" `
     --worktree saweng-review --max-turns 25 --check `
     --allow "Bash(gh issue create:*)" --allow "Bash(gh issue comment:*)" `
     --rules "Always pass --repo sebastian-kwinana/zellij-mcp-server to every gh command. Never close/edit/delete issues."
```

## Sequencing discipline (why reviews come AFTER commits)

Run headless reviewers only against **committed** states (commit-then-review),
so: (a) the reviewed SHA is citable in the finding, (b) any reviewer-side
accident is trivially reversible, (c) parallel reviewers (Anthropic + Grok) see
the identical code. This mirrors the PR#1 review chain's discipline.

## Untested / to verify on first live run

- `/goal` slash-command syntax inside a `--single` prompt (slash commands are a
  TUI concept; headless may treat them as plain text — test cheaply with a
  trivial prompt before relying on it).
- The exact `--allow` rule grammar for scoping `gh` subcommands.
- `--best-of-n` cost/latency profile.
- `grok agent serve` as a persistent local review service (MAIESAW-relevant).
