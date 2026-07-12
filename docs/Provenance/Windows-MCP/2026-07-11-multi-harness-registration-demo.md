# Multi-Harness Registration: Claude Code + grok + agy (best-effort)

**Classification:** AI-to-AI Provenance Record — HASEng
**Subject:** Registering `zellij-mcp-server` (this repo's own MCP server,
`dist/index.js`, stdio transport) into 3 independent AI agent CLI harnesses.
**Environment:** see
[2026-07-11-real-hardware-followon-tracking.md](2026-07-11-real-hardware-followon-tracking.md).

---

## Scope note (read this first)

This record validates **harness registration/reachability** of `zellij-mcp-server`
itself. It does **not** validate the launcher/mutex design that PR #1 was
adversarially reviewed for (that was scoped to same-binary `Start-WindowsMcp` races,
not N external MCP clients) — nor does it depend on Windows-MCP being up (Windows-MCP
registration under `claude`/`grok` pre-exists this session, independently, and remains
unconnected pending the C.1 mkcert step; see
[2026-07-11-real-hardware-test-results.md](2026-07-11-real-hardware-test-results.md)).

## v0.0.1 design decision: single-writer discipline

Per the triadic decision-framework debate resolved during planning: `zellij_write_to_pane`
operates on the **currently-focused** Zellij pane, not an addressed target — a
focus-switch TOCTOU race if multiple agents drove it concurrently, structurally the
same bug class PR #1's `Global\ZellijWindowsMCP` mutex already fixed once for a
different resource. For v0.0.1, only the leader (this Claude Code session, CAMSO
M-tier) drives `zellij_go_to_tab_name`/`zellij_write_to_pane`; `grok`/`agy`/a second
`claude` are message *recipients* only this round. Multi-writer is a natural v0.3+
escalation reusing the same, already-reviewed mutex pattern.

## Registration results

| Harness | Command | Result |
|---|---|---|
| Claude Code | `claude mcp add zellij-mcp -- node ...\dist\index.js` (local/project scope, default) | Registered. `claude mcp list` reports "✘ Failed to connect" — **investigated, not a functional defect**: a direct raw JSON-RPC `initialize` request piped to the same binary returned a correct, well-formed response (`protocolVersion 2024-11-05`, `serverInfo zellij-mcp-server v2.0.0`). Most likely a health-check timing/probe quirk in `claude mcp list`'s connectivity check against a stdio server that holds its pipe open, not an actual reachability failure. Not further chased down given the direct protocol-level evidence already obtained. |
| `grok` (xAI Grok Build CLI) | `grok mcp add zellij-mcp -t stdio -s user -- node ...\dist\index.js` | Registered cleanly to `~/.grok/config.toml` (user scope). `grok mcp list` shows it alongside a pre-existing `windows-mcp` entry (untouched). No connectivity probe run by `grok mcp list` itself, so no equivalent "Failed to connect" signal either way. |
| `agy` (Google Antigravity CLI) | Hand-written `.agents/mcp_config.json` (project-local), schema per the user-supplied cheatsheet (`command`/`args` shape inferred — only `serverUrl` for *remote* servers was confirmed as the renamed key; stdio shape not shown in the source cheatsheet) | **Written, not empirically verified.** `agy --help` exposes no `mcp` subcommand or flag (confirmed again this session); the only documented verification path is `agy`'s interactive `/mcp` TUI manager, which this session did not launch — same class of risk as the mkcert trust dialog (an interactive surface this session has no tool to drive), and explicitly scoped as best-effort/not-hard-gated per the approved plan. |

### A pre-existing, unrelated finding worth a follow-up ticket (not fixed here)

`src/index.ts:1646`'s startup banner (`Features: ${Object.keys(this).length} tools, ...`)
counts the server class instance's own enumerable properties, not registered MCP
tools — currently logs "1 tools" regardless of the real tool count (60+, per the
README). Cosmetic, pre-existing (not introduced by this workstream), out of scope for
this record; noted here because it was surfaced while diagnosing the "Failed to
connect" line above and should not be confused with a real registration defect.

## What remains before the live cross-agent messaging round trip

**Update:** C.1's mkcert trust step is now ✅ complete (human-executed by Sebastian,
7/7 real-hardware tests pass) — see the test-results Provenance record.

**Correction to this record's original framing:** it turns out this session was
*already* running inside an active Zellij session the whole time
(`BizOps_FY2025-2026`) — the original "not inside a Zellij session" diagnosis was
wrong. The real, remaining blocker is more specific: **this session's own MCP tool
set was fixed at session start** and does not include `zellij-mcp` (or any
`zellij_*` tool) at all — confirmed via `ToolSearch` returning zero matches for any
zellij-related query, regardless of terms tried. `claude mcp add zellij-mcp -- ...`
(run earlier in this same session) updates the *persistent* CLI config for
future/reconnected sessions; it does not retroactively inject the tool into an
already-running one. So the live cross-agent messaging round trip still needs a
session reload of some kind — not because of a Zellij-context requirement (that part
is already satisfied), but because of MCP-tool-set loading. The approved plan's
relaunch step (which was going to be needed anyway, for the dedicated
CAMSO-mapped KDL layout) resolves this as a side effect. The user relaunches via
   `zellij --layout test/real-hardware/workspaces/windows-mcp-real-hardware-e2e-v0.0.1.kdl attach -c windows-mcp-real-hardware-e2e-v001`
   (layout moved in-repo on 2026-07-12 to `test/real-hardware/workspaces/` — see the
   tracking record for the path-pattern rationale; the SAWEng demo-runner script in
   that same directory is the preferred idempotent launcher), after which this
   becomes tab `00_leader-claude-M` and the live single-writer message/reply round
   trip to a recipient tab becomes attemptable.
