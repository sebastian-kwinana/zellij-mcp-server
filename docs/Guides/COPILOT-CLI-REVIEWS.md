# GitHub Copilot CLI as the Third-AISP Local Reviewer

**Purpose:** operational guide for using GitHub Copilot CLI (`copilot`) as a
headless, on-device, third-AISP code reviewer for this repo — the OpenAI leg of
the three-AISP review triad (Anthropic sub-agents, xAI Grok — see
[`GROK-HEADLESS-REVIEWS.md`](GROK-HEADLESS-REVIEWS.md) — and OpenAI-powered
Copilot). Replaces the originally-planned use of Google Antigravity CLI
(`agy`) for this role: `agy`'s free-tier usage limits are low enough
(multi-day reset wait) to block planned autonomous use, so it is kept
registered and documented as a best-effort fallback recipient only — see the
AAAH/AISP entries in [`../GLOSSARY.md`](../GLOSSARY.md).

All flags below were empirically confirmed against the installed `copilot`
CLI **v1.0.70** on `CW-WinDevTablet1` (2026-07-13/14) via `copilot --help`,
`copilot mcp --help`, and `copilot mcp add --help` — re-verify with `--help`
after upgrades; do not trust this doc over the binary.

## Known footgun: backslash path args get eaten (fix before trusting any Windows path arg)

Registering `zellij-mcp` the first time via a Bash-tool command with escaped
backslashes (`node C:\\src\\github.com\\...\\dist\\index.js`) silently
produced a **mangled command with every backslash stripped**:
`node C:srcgithub.comsebastian-kwinanazellij-mcp-serverdistindex.js` — a
shell/quoting interaction between the Bash tool, Git Bash, and `copilot`'s
own arg parsing, not a `copilot` bug per se, but it fails silently (`mcp add`
reports success either way — the corruption only shows up in `mcp get`).
**Always pass Windows paths to `copilot mcp add` with forward slashes**
(`C:/src/...` — Node accepts these natively on Windows) and always verify
with `copilot mcp get <name>` immediately after adding, not just the `add`
command's own success message.

## MCP registration (confirmed schema + steps actually run)

```
copilot mcp add zellij-mcp -- node C:/src/github.com/sebastian-kwinana/zellij-mcp-server/dist/index.js
copilot mcp get zellij-mcp        # verify — do not trust `add`'s own echo
```

Confirmed config sources (from `copilot mcp --help`), in load order:

| Source | Path |
|---|---|
| User | `~/.copilot/mcp-config.json` |
| Workspace | `.mcp.json` or `.github/mcp.json` |
| Plugin | installed plugins with MCP servers |

`copilot mcp add` syntax (stdio vs. remote):

```
copilot mcp add <name> -- <command> [args...]              # stdio (local)
copilot mcp add --transport http <name> <url>               # remote (HTTP/SSE)
```

Useful `mcp add` flags: `--env KEY=VALUE` (repeatable), `--header "..."`
(repeatable, remote only), `--timeout <ms>`, `--tools <tools>` (`"*"` /
comma-list / `""`, default `"*"`), `--json` (machine-readable add output —
**put this before `--`, not after**, or it leaks into the child command's own
argv, per the footgun above), `--show-secrets`.

Other `mcp` subcommands: `copilot mcp list [--json]`, `copilot mcp get
<name>`, `copilot mcp remove <name>`.

## The headless review invocation (confirmed root flags)

```powershell
copilot -p "<review prompt>" `
        --model gpt-5.4 `
        --allow-tool 'shell(gh issue create:*)' --allow-tool 'shell(gh issue comment:*)' `
        --deny-tool 'shell(gh pr merge:*)' --deny-tool 'shell(gh issue close:*)' --deny-tool 'shell(gh issue delete:*)' `
        --output-format json `
        --silent
```

Key confirmed capabilities:

| Flag | Use |
|---|---|
| `-p, --prompt <text>` | Non-interactive single-turn; exits after completion (Grok's `--single` analog). |
| `-s, --silent` | Agent response only, no stats — for scripting/log-parsing. |
| `--model <model>` | Selects the AI model — this is *the* flag that makes Copilot the non-Claude, non-xAI triad leg. `auto` lets Copilot pick. Only `gpt-5.4` is confirmed from the `--help` examples; the full valid-model list is **not yet empirically confirmed** (see Untested, below). |
| `--allow-tool[=tools...]` / `--deny-tool[=tools...]` | Scoped permission rules, e.g. `--allow-tool='shell(gh issue create:*)'`, `--deny-tool='shell(git push)'` — the Copilot analog of Grok's `--allow`/`--deny`. Prefer this over `--allow-all-tools`/`--allow-all`/`--yolo` for reviewer runs, same "scoped over broad" principle as the Grok guide. |
| `--allow-all-tools` | Blanket auto-approval; help text says it's "required for non-interactive mode" if no scoped `--allow-tool` rules cover every tool the run needs — confirm whether scoped rules alone suffice before relying on it (untested, below). |
| `--output-format <format>` | `text` (default) or `json` (JSONL, one object per line) — machine-parseable review findings. |
| `--effort, --reasoning-effort <level>` | `none`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max` — depth/cost dial for a review run. |
| `--add-dir <directory>` | Extend file-access allowlist beyond cwd (repeatable). |
| `--additional-mcp-config <json-or-@file>` | Augment MCP servers for just this session, without touching `~/.copilot/mcp-config.json`. |
| `--no-custom-instructions` | Disable auto-loading `AGENTS.md`/`CLAUDE.md`-family files — useful for a "review with fresh eyes, no repo-primed context" run; default (loaded) is normal use. |
| `--secret-env-vars[=vars...]` | Strip/redact named env vars from shell + MCP environments and from output. |
| `--share[=path]` / `--share-gist` | Export the session transcript to a markdown file or secret gist after a non-interactive run — an audit-trail option Grok's CLI doesn't have. |
| `-C <directory>` | Change working directory before anything else — set to the repo root explicitly rather than relying on invocation cwd. |
| `--log-level <level>` / `--log-dir <dir>` | `none`/`error`/`warning`/`info`/`debug`/`all`/`default`; logs default to `~/.copilot/logs/`. |

## `gh` authorization for reviewer agents (same guardrails as Grok, adapted syntax)

Identical policy to [`GROK-HEADLESS-REVIEWS.md`](GROK-HEADLESS-REVIEWS.md#gh-authorization-for-reviewer-agents-agreed-guardrails-2026-07-12),
expressed in Copilot's `--allow-tool`/`--deny-tool` grammar:

1. **Always `--repo sebastian-kwinana/zellij-mcp-server` explicitly** in every
   `gh` invocation the prompt instructs the agent to run — never rely on
   repo-context inference.
2. **Create/comment only** — allow only `shell(gh issue create:*)` and
   `shell(gh issue comment:*)`; explicitly `--deny-tool` merge/close/delete/edit
   variants rather than relying on them simply not being mentioned, since
   `--allow-tool='shell'` (bare) or `--allow-all-tools` would otherwise open
   the whole shell tool.
3. **Always labelled** — at minimum one of `real-hardware`, `windows-mcp`,
   `multi-harness`, `assurance`, plus severity in the title. Milestone
   "Real-Hardware Validation v1" where applicable.
4. **Triage-quality bodies** — file:line references, reproduction, severity
   rationale; a finding that can't cite a location goes in the review summary,
   not an Issue.

```powershell
copilot -p "<review brief instructing triage-to-Issues, with the guardrails above repeated in-prompt>" `
        --model gpt-5.4 --effort high `
        --allow-tool 'shell(gh issue create:*)' --allow-tool 'shell(gh issue comment:*)' `
        --deny-tool 'shell(gh issue close:*)' --deny-tool 'shell(gh issue delete:*)' `
        --deny-tool 'shell(gh pr merge:*)' --deny-tool 'shell(gh repo:*)' `
        --output-format json --silent --share
```

## Sequencing discipline (why reviews come AFTER commits)

Unchanged from the Grok guide: run headless reviewers only against
**committed** states (commit-then-review), so (a) the reviewed SHA is citable
in the finding, (b) any reviewer-side accident is trivially reversible, (c)
all three AISP reviewers see the identical code.

## Untested / to verify on first live run

- **Full valid `--model` list.** Only `gpt-5.4` is confirmed (from the
  `--help` examples block); confirm the actual roster (e.g. via the
  interactive `/model` picker, or `copilot help providers` for BYOK models)
  before scripting a specific model name into CI-adjacent tooling.
- Whether scoped `--allow-tool` rules alone are sufficient for a fully
  non-interactive `-p` run, or whether `--allow-all-tools` (or a superset
  `--allow-tool='shell'`) is actually required as the help text's "required
  for non-interactive mode" note implies — test with a trivial prompt using
  *only* the two scoped `gh` rules above before trusting it for a real review.
- `--additional-mcp-config` as a way to hand a reviewer run a scoped,
  session-only view of `zellij-mcp` (or a subset of its tools via
  `--tools`) without touching the persisted `~/.copilot/mcp-config.json` —
  potentially preferable to the persisted registration above for one-off
  review runs.
- `--acp` (Agent Client Protocol server mode) and `--connect[=sessionId]` —
  MAIESAW-Engine-relevant programmatic embedding surface, analogous to
  `grok agent stdio/serve`; not yet exercised.
- `copilot init` (repo instruction bootstrapping) — not yet run against this
  repo; unclear whether it would generate a `.github/copilot-instructions.md`
  that should be reviewed/committed or left uninstantiated.
