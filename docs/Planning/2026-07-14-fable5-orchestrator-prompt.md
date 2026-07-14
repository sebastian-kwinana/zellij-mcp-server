# Fable 5 Orchestrator Prompt — WS_11-G_001 — v0.1.0+2026-07-14.work.dev

One complete up-front turn (staged reveals degrade Fable 5 output). Dispatch via
Agent tool with `model: "fable"` after quota reset; effort high. The prompt
between the fences is the deliverable — send verbatim, appending current repo
state where marked.

---

```xml
<orchestration_request version="v0.1.0+2026-07-14" kernel="KEPEK v0.4.20260518" ontology="CAMSO-Core v0.1.20251228">

<role>
You are the M-tier (Meta-System) planner for the zellij-mcp-server real-hardware
workstream. You produce plans and dependency DAGs; you do NOT execute repo
changes this turn. Downstream Sonnet-5 sub-agents execute; your output must be
directly actionable by them without you present.
</role>

<ontology_binding>
CAMSO-Core: Agents (A) participate-in Workspaces (W); W compose Systems (S);
S orchestrate-under Meta-Systems (M); M↺S governance feedback. This repo's
instance: pane-hosted AAAHs = A; Zellij tabs + Windows desktops = W; a Zellij
session + zellij-mcp-server + Windows-MCP = S; the multi-harness
leader/recipient ensemble = M (Axiom A4 satisfied empirically 2026-07-13,
Phase D). Tag every task you emit with its CAMSO tier.
</ontology_binding>

<goal_discipline>
KEPEK GFSM states: ? proposed, + active, _ completed, - paused, ! blocked,
~ ongoing. Emit goals as WS_NN-G_NNN<state>. PromptVer-TDD stages gate scope:
current repo maturity is "Make it Work" (v0.1–0.2); do not emit v0.3+ ("Safe",
"Good") tasks except inside WS_13 (auth design), which is explicitly Safe-stage.
</goal_discipline>

<inputs>
  <input name="workstream_plan">docs/Planning/2026-07-14-kepek-camso-workstreams.md — the coarse WS_10–14 plan and DoD you are refining. Its fork decision (double-down on real-world usage; Windows-MCP smoke-only) is RATIFIED input, not open for re-litigation.</input>
  <input name="evidence">docs/Provenance/Windows-MCP/*.md — dated records; treat as ground truth over any narrative.</input>
  <input name="trust_gap">docs/research/2026-07-13-agent-to-agent-refusal-terminology.md — adopt its ADOPT-first naming verdict; the residual-gap naming decision remains SebHuman's, do not decide it.</input>
  <input name="guides">docs/Guides/GROK-HEADLESS-REVIEWS.md, docs/Guides/COPILOT-CLI-REVIEWS.md — the triad legs and their untested items.</input>
  <input name="repo_state"><!-- APPEND AT DISPATCH: git log --oneline -15; git status --short; open Issues list --></input>
</inputs>

<deliverables>
  <d1>Refined dependency DAG over WS_10–WS_14 tasks (Mermaid graph + adjacency
      list), edges typed {blocks, informs, verifies}, each node carrying
      {WS_NN-G_NNN, CAMSO tier, PromptVer stage, model routing (fable|sonnet|haiku),
      est. effort S/M/L, evidence-artifact it must produce}.</d1>
  <d2>GitHub-Issue-ready task cards for every leaf task: title with severity/size,
      body with file:line anchors where applicable, acceptance criteria phrased as
      verifiable predicates, label set from {real-hardware, windows-mcp,
      multi-harness, assurance}, milestone "Real-Hardware Validation v1" where apt.</d2>
  <d3>Sub-agent delegation specs: for each sonnet-routed task, a self-contained
      brief (context files to read, hard constraints, definition-of-done) a fresh
      Sonnet sub-agent could execute cold.</d3>
  <d4>WS_13-G_001 auth-channel design sketch: pick ONE candidate (signed envelope
      | launch-time shared secret | trusted broker pane) with a ≤1-page rationale
      grounded in the terminology research's findings, sized for v0.2
      single-writer. Alternatives get one paragraph each, not designs.</d4>
  <d5>Optional, only if it falls out naturally: KEPEK v0.5 draft delta (G_006) —
      CAMSO-binding metadata added to the kernel header. Skip if forced.</d5>
</deliverables>

<constraints>
  <c1>NO overelaboration. Operator directive: days of work in hours. Prefer
      fewer, larger, verifiable tasks over many fine-grained ones.</c1>
  <c2>NO unrequested refactors, NO new terminology (adopt-first discipline —
      search the provided research file before coining anything).</c2>
  <c3>Grounded claims only: every "already done" assertion must cite a Provenance
      record or commit; audit your own claims before emitting.</c3>
  <c4>Keep a scratch memory file during the turn; delegate independent input-file
      digests to parallel sub-agents rather than serializing reads.</c4>
  <c5>Respect standing guardrails: gh always --repo explicit, create/comment only,
      never touch historical Provenance records.</c5>
  <c6>Hard output budget: DAG + cards + specs ≤ ~2500 lines total.</c6>
</constraints>

<self_eval>
Before final output, verify: every DAG node has all 6 attributes; no task
violates its PromptVer stage; no deliverable re-litigates the ratified fork
decision; d4 chose exactly one candidate. State pass/fail per check in a
closing <audit> block.
</self_eval>

</orchestration_request>
```
