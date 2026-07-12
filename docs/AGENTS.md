# AGENTS.md — docs taxonomy

Keep the `docs/` root clean: only `README.md`, this file, `GLOSSARY.md`, and
category sub-directories belong here.

## Document placement rules

- Put **durable accepted decisions** in `docs/ADRs/`.
- Put **setup / operator / maintainer guides** in `docs/Guides/`.
- Put **assurance artefacts** (matrices, scoring rubrics, review prompts) in
  `docs/Assurance/`.
- Put **dated provenance records** (action records, adversarial reviews,
  post-incident notes, audit snapshots) in `docs/Provenance/`.
- Put **vision/research notes** (concepts under exploration, not yet accepted
  decisions — e.g. MCP-SAR, the MAIESAW Engine trajectory) in `docs/research/`,
  dated. When a research note's content solidifies, graduate the stable decision
  into an ADR (and, for productization requirements, a future `docs/PRDs/`);
  keep the dated research note as its historical origin.
- Put **cross-cutting terminology** in `docs/GLOSSARY.md` (root — it serves every
  category). Add terms there rather than re-defining them per-document; link with
  relative paths.

## ADR vs provenance

Use an ADR when the document answers: *what decision was made, why, and with
what consequences?*

Use provenance when the document answers: *what happened in a given review or
implementation session, what evidence was gathered, and what changed then?*

If a provenance record contains an enduring architectural decision, extract the
stable decision into an ADR and keep the dated provenance record separately.
