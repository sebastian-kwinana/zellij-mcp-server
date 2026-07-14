# KEPEK×CAMSO Workstream Plan — v0.1.0+2026-07-14.work.dev

**Kernel:** KEPEK v0.4.20260518 (GFSM states `? + _ - ! ~`; PromptVer-TDD stages;
TaskAgent AIOP; homoiconic artifacts). **Ontology:** CAMSO-Core v0.1.20251228
(A→W→S→M; M↺S governance feedback; Axioms A1–A5). **Branch:** `claude/KEPEK-Driven-Planning`.
**Constraint (operator, 2026-07-14): do not overelaborate — days of work in hours.**

## Why KEPEK × CAMSO here

zellij-mcp-server + Windows-MCP *is* a CAMSO instance: each pane-hosted AAAH is an
Agent (A), each Zellij tab / Windows desktop a Workspace (W), a Zellij session +
its MCP mediators a System (S), and the multi-harness leader/recipient ensemble a
Meta-System (M). Phase D empirically satisfied Axiom A4 (recursive orchestration
across ≥2 agentic systems). KEPEK supplies the *goal discipline* (GFSM) and
*maturity gating* (PromptVer-TDD) for growing that instance; CAMSO supplies the
*structure* the goals operate on. Every WS below states its CAMSO tier and its
PromptVer-TDD stage so nobody builds "Make it Good" work on a "Make it Boot" layer.

## Fork decision (recommendation, HoTL to ratify)

**Chosen: double-down on real-world usage, with Windows-MCP scoped to
launch + minimal smoke test only.** Rationale: the repo's differentiator is dated,
real-hardware evidence — not breadth of coverage. Current maturity is honestly
"Make it Work" (v0.1.x–0.2.x); comprehensive test coverage is a "Make it Safe/Good"
(v0.3+) concern, premature per PromptVer-TDD. The Phase D transport works; the
known open problem is the A2A trust model — that, plus PR-readiness of the
existing branch, is where hours buy the most. Comprehensive testing is *shelved
(`-`), not rejected*: it becomes the natural v0.3.x workstream after WS_10 ships.

## Definition of Done — `real-hardware-validation-v1` PR (WS_10 gate)

The branch is PR-ready when ALL of:

1. **Green:** `npm ci && npm test` passes locally (Node ≥21) AND CI is green on
   the branch head (incl. the Linux `dist/` drift gate — LF pinning already in
   `.gitattributes`).
2. **Sized for review:** <300 changed files vs `main` (Copilot auto-review hard
   limit, counted pre-exclusion — CLAUDE.md lesson). Verify with
   `git diff --stat main...HEAD | tail -1` before opening.
3. **Scope honesty:** PR body states what IS validated (real-hardware C.1–C.4
   evidence, SAWEng demo-runner, Phase D transport) and what is NOT (A2A
   authentication — open design item; Windows-MCP comprehensive coverage;
   refusal root-cause — provisional pending Claude-2 introspection).
4. **Evidence linked:** PR body links each Provenance record; no assurance claim
   without a dated record behind it.
5. **Optional-dependency proof:** one committed test/record showing
   zellij-mcp-server works with Windows-MCP absent/down (Phase D transcript
   already shows this de facto — cite it).
6. **Review loop closed:** Copilot auto-review completes; every finding triaged
   fix-or-dismiss-with-rationale as PR comments. Notification: no webhook
   infrastructure exists on this repo — poll via
   `gh api repos/sebastian-kwinana/zellij-mcp-server/pulls/<N>/comments` +
   `.../reviews` on a wakeup cadence (~5 min after open, then as needed).
   A real webhook subscription is out of scope for this DoD.

Explicitly NOT required for this PR: port-collision test (deferred by operator),
A2A auth implementation, comprehensive coverage, KEPEK planning docs (this branch).

## Workstreams (WS_≥10) — GFSM goals + model routing

Routing rule: **Fable 5** (≤2026-07-19, ~40% quota) only for work that is
synthesis/design over many interacting constraints — plan/DAG generation,
protocol design. **Sonnet 5 / sub-agents** for everything mechanical or
single-file. Never spend Fable on execution.

### WS_10 — PR-readiness + open PR for `real-hardware-validation-v1`
CAMSO: S-tier · Stage: Make it Work · **Model: Sonnet** (mechanical)
- WS_10-G_001+ = Execute DoD checklist 1–5 above; fix anything red.
- WS_10-G_002+ = Open PR (`gh pr create --repo sebastian-kwinana/zellij-mcp-server`),
  body per DoD 3–4; label + milestone per standing guardrails.
- WS_10-G_003+ = Poll Copilot review comments; triage each fix-or-dismiss.
- WS_10-G_004? = Untracked-plan-file hygiene: decide commit-vs-ignore for
  `.claude/plans/*` strays before opening (they must not leak into the PR diff).

### WS_11 — Fable-5 master plan + dependency DAG (this plan's successor)
CAMSO: M-tier · Stage: planning for v0.2→0.3 · **Model: Fable 5** (one turn)
- WS_11-G_001+ = Dispatch the prepared orchestrator prompt
  (`2026-07-14-fable5-orchestrator-prompt.md`) as ONE complete turn; output =
  refined WS DAG + GitHub-Issue-ready task cards + sub-agent delegation specs.
- WS_11-G_002+ = HoTL review of Fable output; file accepted tasks as Issues
  (create/comment only, labelled, milestoned).
- WS_11-G_003? = KEPEK G_006 self-improvement: emit KEPEK v0.5 draft with
  CAMSO-binding metadata (only if Fable's output naturally yields it — do not
  force).

### WS_12 — Real-world usage hardening (the chosen fork direction)
CAMSO: W/S-tier · Stage: Make it Work→Safe · **Model: Sonnet + sub-agents**
- WS_12-G_001+ = Windows-MCP managed secure provisioning smoke test: guarded
  launcher up → ONE desktop-awareness call (e.g. `windows_mcp_status` +
  a minimal UIA read) → down. Provenance record. No comprehensive coverage.
- WS_12-G_002+ = Repoint/disable the bypassing `WinMCPstdio` direct-`uvx` MCP
  configs at the guarded launcher (standing recommendation since 2026-07-11).
- WS_12-G_003- = Port-collision test (operator-deferred; unshelve when KDL rerun
  is next scheduled).

### WS_13 — A2A authentication design (Phase D trust gap)
CAMSO: M-tier · Stage: Make it Safe · **Model: Fable 5 design, Sonnet impl**
- WS_13-G_001+ = Fable designs the minimal auth channel for single-writer v0.2
  messaging (candidates already researched: signed envelopes, launch-time shared
  secret, broker pane; adopt A2A/AgentCard patterns — don't invent).
- WS_13-G_002- = Implementation (blocked-by design; Sonnet work).
- WS_13-G_003! = Refusal root-cause isolation testing — blocked on Claude-2's
  introspection (operator action) before designing replays.

### WS_14 — Triadic review, first live run
CAMSO: M-tier · Stage: Make it Work · **Model: Sonnet** (drives externals)
- WS_14-G_001+ = First live `copilot -p` review of a committed SHA; burn down the
  guide's "Untested" list (model roster, scoped `--allow-tool` sufficiency).
- WS_14-G_002? = Full triad on one artifact (Anthropic + Grok + Copilot on the
  WS_10 PR diff) — becomes the reusable review pattern.

## Sequencing DAG (coarse — Fable refines in WS_11)

```
WS_10 (PR open) ──► WS_14-G_002 (triad reviews the PR)
WS_11 (Fable plan) ──► refines/reorders everything below it
WS_12 independent; WS_13-G_002 blocked-by WS_13-G_001; WS_13-G_003 blocked-by operator
```

Hours-scale path: WS_10 today (Sonnet, mostly checklist), WS_11 immediately after
quota reset (one Fable turn), WS_12/13/14 as Fable's DAG orders them.
