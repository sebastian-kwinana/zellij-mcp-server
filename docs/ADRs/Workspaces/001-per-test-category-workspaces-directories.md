# ADR-Workspaces-001: Store workspace layouts in per-category `workspaces/` directories

**Status:** Accepted (2026-07-12, operator decision)
**Context category:** Workspaces / CAICEWAC / future MAIESAW Engine

## Decision

Zellij workspace layout files (CAICEWAC KDL "Workspaces-as-Code") live in a
`workspaces/` subdirectory **of the category that uses them** — e.g.
`test/real-hardware/workspaces/` for real-hardware E2E testing/demonstration
workspaces — **not** in a single project-root or test-suite-root `workspaces/`
directory.

The first instance of this pattern is
`test/real-hardware/workspaces/windows-mcp-real-hardware-e2e-v0.0.1.kdl`
(moved in-repo 2026-07-12 from the operator's out-of-tree specifications library,
which is reserved for production-ready reusable reference specifications, not
in-development files).

## Rationale

1. **Self-documenting paths.** The full path answers "what is this workspace
   for?" without opening the file: `test/real-hardware/workspaces/…` is a
   real-hardware test/demo workspace, by construction. A flat top-level
   `workspaces/` would need naming conventions or a manifest to carry the same
   information.
2. **Foundational for the MAIESAW Engine.** The planned workspace engine
   ("Metacognitive Agentic Intelligent Entities Situated Attention Workspace"
   Engine; prototype-era acronym MAWE) will need to discover, categorize, and
   launch workspaces programmatically. Category-scoped directories make the
   category machine-readable from the filesystem itself — the same
   nearest-common-ancestor placement philosophy this repo already applies to its
   nested `AGENTS.md` files.
3. **Cohesion with what the workspace exercises.** A test-category's workspace
   sits next to the tests it serves and the nested `AGENTS.md` that governs both;
   they version, review, and move together.

## Consequences

- Future categories add their own `workspaces/` as needed (e.g. a hypothetical
  `demos/multi-harness/workspaces/`); do not consolidate them.
- Launch/demo tooling (the SAWEng demo-runner pattern,
  `sfa_saweng_demo_runner_v1.py`) resolves layouts relative to its own location
  inside the same `workspaces/` directory, keeping each category's tooling +
  layouts self-contained and relocatable as a unit.
- The operator's out-of-tree specifications library remains the home for
  *production-ready, reusable, cross-project* reference workspaces only;
  in-development, project-specific workspaces belong in-repo under this pattern.
