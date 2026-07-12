# MCP-SAR: Model Context Protocol — Situated Attention Runtime

**Classification:** Research / vision note (not yet an accepted decision — graduate
stable decisions into `docs/ADRs/` and productization requirements into a future
`docs/PRDs/` as they solidify).
**Author of the concept:** Sebastian Malcolm (operator), 2026-07-12, this repo's
development session on `CW-WinDevTablet1`.
**Status:** Captured verbatim-in-spirit from the operator's direction; terms
cross-referenced in [`docs/GLOSSARY.md`](../GLOSSARY.md).

---

## The claim

Running zellij-mcp-server — with its managed, HTTPS-secured, mutex-guarded
(re)launching of OS-specific integrations such as Windows-MCP — within a specific
combination of operating system and environment configuration can be described,
loosely or precisely, as providing a **"Model Context Protocol — Situated Attention
Runtime" (MCP-SAR)**.

MCP's core premise is programmatic curation of contextually relevant inputs for an
AI model's inference compute. MCP-SAR extends that premise with **live situational
awareness of the operating environment itself**:

- **Terminal-multiplexer layer** (cross-platform, constant): Zellij
  sessions/tabs/panes as observable, writable, versionable workspace state —
  `zellij_dump_screen`, `zellij_get_pane_info`, `zellij_write_to_pane`,
  layout-as-KDL snapshots.
- **OS layer** (per-runtime, swappable module): on Windows, CursorTouch/Windows-MCP
  provides UI-Automation-based screen inspection and targeted-window keyboard
  input ("Computer Use" that in some respects exceeds a human's precision). On
  macOS or an Android-AVF-hosted Debian VM, this module would be swapped for an
  OS-appropriate alternative — the Zellij layer and the MCP protocol surface stay
  constant. **Each OS + configuration combination is one concrete MCP-SAR
  runtime.**

The full MCP primitive set is in scope for carrying this awareness: **Tools,
Resources, Prompts, Sampling, and Authentication/Authorization** — today the
implementation is Tools-heavy; Resources/Prompts/Sampling are open design space
(e.g., a pane's live content as an MCP Resource; workspace-launch recipes as MCP
Prompts).

## Why HASEng is a precondition, not decoration

The claim only has value if the runtime is trustworthy. That is why this
repository's path to MCP-SAR ran through: 3 rounds of AI code review + an
independent cross-vendor adversarial review; a mutex-guarded single-instance
launcher; a pinned supply chain (`windows-mcp==0.8.2`); real-physical-hardware
E2E evidence (mkcert OS-trust, PowerShell 5.1 floor, Defender observation,
multi-monitor topology); and empirical test-suite ordering verification. A
situated-attention runtime that cannot be trusted is a liability amplifier — the
same awareness that helps an agent collaborate is an attack/failure surface if
the engineering underneath is soft.

## The engine trajectory: SAWEng → MAIESAW

- **Now (v0.0.x–v0.1.x, "Make it Boot/Work"):** hand-authored CAICEWAC KDL
  workspaces per test category (`test/real-hardware/workspaces/`), launched
  idempotently by a lightweight SAWEng demo-runner (Single File Agent pattern) —
  just intelligent enough to self-describe the demo it runs.
- **Next:** demonstrations become idempotently re-runnable evidence — for humans
  and AIEs alike — of the value-add of each modular integration, with HoTL
  observability/auditability/provenance built in (dated Provenance records, git
  history, live panes).
- **Target:** the **MAIESAW Engine** ("Metacognitive Agentic Intelligent Entities
  Situated Attention Workspace" Engine; predecessor prototype acronym MAWE) — an
  engine that *designs* multi-AIE collaborative workspaces, not just launches
  them: choosing tab/pane topologies per task, placing agents, wiring their
  situated-attention feeds, and evolving the workspace as the work evolves,
  with the human on the loop.

## Strategic framing (operator's own words, condensed)

Idempotently scripting Situated Attention Workspaces that provide MCP-SAR for any
AAAH running within their windows/tabs/panes is the foundation for software
trusted enough to (1) build open-source reputation, (2) generate research value,
and (3) generate commercial value — toward zellij-mcp-server + Windows-MCP
becoming self-sustaining open-source projects.

## Open questions (deliberately unresolved here)

1. Which MCP primitive should carry live pane content — Resource (pull) vs
   Sampling-mediated summaries (push-ish)? Cost/staleness trade-offs untested.
2. Where does the per-OS module boundary land exactly — is `scripts/windows/`'s
   launcher pattern (mutex, pin, TLS, repair) the template each OS module must
   re-implement, or does a shared cross-platform launcher core get extracted?
3. What does the MAIESAW Engine's own state store look like (KDL alone? KDL +
   database? Zellij's own 1-second session-serialization cache as a source)?
4. Multi-writer coordination for `zellij_write_to_pane` (the focus-switch TOCTOU
   documented 2026-07-11) — named-mutex reuse vs a Zellij plugin with an
   addressed-pane write primitive upstream.
5. PRD threshold: at what maturity does this vision note graduate to a
   `docs/PRDs/` product requirements document with measurable acceptance
   criteria?
