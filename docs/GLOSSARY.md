# Glossary

Cross-cutting terminology for the zellij-mcp-server project and its research
lineage. Terms marked *(operator framework)* originate in Sebastian Malcolm's
Kwinana AI Context Engineering specifications (an out-of-tree, production-ready
reference library); they are defined here to the extent needed for this repo's
docs, code comments, and Provenance records to be self-contained.

Convention: each entry gives the expansion, a one-paragraph definition, and where
it is load-bearing in this repo.

---

## AAAH — Agentic AI Agent Harness

Any CLI/runtime that hosts a reasoning AI agent with tool use: Claude Code
(`claude`), xAI Grok Build CLI (`grok`), Google Antigravity CLI (`agy`), GitHub
Copilot agent, etc. Used throughout the multi-harness work (Issue #6): this
project's value proposition includes being loadable, simultaneously, by multiple
AAAHs on one machine.

## AIE — Agentic Intelligent Entity *(operator framework)*

An actor (person, artificial system, or organization) that possesses agency: it
formulates and pursues goals, makes context-sensitive decisions, plans and acts
over time, and adaptively revises strategy from feedback — rather than emitting
fixed responses to stimuli. Both the humans and the AI agents collaborating in a
workspace are AIEs; docs in this repo are deliberately written to be legible to
both.

## CAICEWAC — Cognitive Architecture Inspired Context Engineered Workspaces As Code *(operator framework)*

The practice of defining a complete cognitive/collaborative workspace — its tabs,
panes, running programs, and the left-to-right ordering that encodes a workflow —
as a declarative, git-versionable artifact (concretely: a Zellij KDL layout
file). "Where thinking happens determines what thinking is possible." In this
repo: `test/real-hardware/workspaces/*.kdl`.

## CAMSO-Core — Cognitive-Agentic Meta-Systems Ontology (Core) *(operator framework)*

A four-tier ontology, A → W → S → M: **A**gents participate in **W**orkspaces,
which compose **S**ystems, orchestrated under **M**eta-Systems (with an M↺S
governance feedback loop). Mapping used in this repo: a Zellij pane/tab is a W at
the terminal-multiplexer layer; a Windows virtual desktop/window arrangement is a
W at the OS layer; a Zellij session + zellij-mcp-server + Windows-MCP together
form an S; a multi-harness ensemble of such Systems under a leader is an M.
Load-bearing in the KDL layout headers and the Phase-D single-writer design.

## HASEng — High Assurance Software Engineering

The project's working discipline: claims require evidence in the repository (not
intent), risks are adversarially reviewed (multiple independent AI reviewers +
human), residual risks are documented honestly, and idempotency/ordering claims
are verified empirically (see the 2026-07-12 test-suite-ordering Provenance
record). Anchored by `docs/Assurance/HASE-COMPLIANCE.md`.

## HoTL — Human-on-the-Loop

Supervision model where the human does not gate every action (human-*in*-the-loop)
but retains observability, auditability, and intervention authority over an
otherwise autonomous process. The workspaces in this repo are designed for HoTL
supervision: live panes, `zellij_dump_screen` captures, dated Provenance records.

## KEPEK — [Knowledge] Elite Prompt Engineering Kernel *(operator framework)*

A compact bootstrap of AI-operating protocols: the Goal Finite State Machine
(GFSM, states `? + _ - ! ~`), PromptVer-TDD staged maturity versioning ("Make it
Boot" v0.0.x/v0.1.x → … → "Make it Ship" v1.0.x), and homoiconic
prompts-as-manipulable-data. Referenced in KDL headers and delegation-packet
formats in this repo.

## MAIESAW — Metacognitive Agentic Intelligent Entities Situated Attention Workspace *(vision)*

The target concept for a general "WorkspaceEngine": an engine that designs,
launches, observes, and evolves workspaces in which multiple AIEs collaborate
with situated attention (see MCP-SAR) under HoTL governance. Successor framing to
the prototype-era acronym **MAWE** (Metacognitive Agentic Workspace Engine /
Multi-Agent Workspace Engine). Current concrete stepping stones in this repo: the
per-test-category `workspaces/` directory pattern (ADR-Workspaces-001) and the
SAWEng demo-runner script.

## MCP-SAR — Model Context Protocol: Situated Attention Runtime *(vision — see docs/research/)*

The characterization of what running zellij-mcp-server (plus its OS-specific
integrations, e.g. Windows-MCP on Windows) actually provides: a *runtime* that
extends MCP's core premise (programmatically curating contextually relevant
inputs for model inference) with live *situational awareness* of the operating
environment — terminal state via Zellij, desktop state via the OS integration —
exposed through MCP primitives (Tools, Resources, Prompts, Sampling, Auth). A
given OS + configuration combination is one concrete MCP-SAR *runtime*; porting
to macOS or an Android-AVF Debian VM means swapping the OS-specific integration
(windows-mcp → a platform alternative) while the Zellij layer stays constant.
Full treatment: `docs/research/2026-07-12-mcp-sar-vision.md`.

## SAWEng — Situated Attention Workspace Engineering *(vision)*

The engineering practice of designing and scripting Situated Attention
Workspaces: CAICEWAC-defined, MCP-SAR-providing, idempotently (re)launchable
workspaces for multi-AIE collaboration. First concrete artifact:
`test/real-hardware/workspaces/sfa_saweng_demo_runner_v1.py`.

## SFA — Single File Agent

A software pattern (popularized by IndyDevDan's `disler/single-file-agents`
repo): a single Python file, executable via `uv run --script`, whose PEP 723
inline-metadata header declares its own runtime dependencies — making the file
simultaneously the program, its dependency manifest, and (optionally) a minimal
embedded AI agent. Chosen for SAWEng demo-runners because a demo tool should be
as self-contained and self-describing as the workspaces it launches.

## Situated Attention

An agent's attention grounded in *where it is running*: which pane/tab/session it
occupies, what is on the screens around it, which other agents share the
workspace, what the OS-level desktop state is. Distinct from (and complementary
to) retrieval-based context: situational awareness is live, positional, and
environmental. The zellij tool surface (`zellij_dump_screen`,
`zellij_get_pane_info`, `zellij_write_to_pane`, …) plus Windows-MCP's
UI-Automation tools are this project's situated-attention primitives.
