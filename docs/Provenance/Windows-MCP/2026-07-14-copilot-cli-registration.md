# GitHub Copilot CLI Registration + agy-to-Copilot AISP-Triad Hotfix

**Classification:** AI-to-AI Provenance Record — HASEng
**Subject:** Registering `zellij-mcp-server` into GitHub Copilot CLI
(`copilot`), and repositioning it (not `agy`/Google Antigravity CLI) as the
third-AISP leg of the review triad.
**Environment:** `CW-WinDevTablet1`, Windows 10 Pro 19045; `copilot` CLI
**v1.0.70** (confirmed via `copilot --version`); valid as of 2026-07-14 —
re-verify flags/schema after any `copilot update`.

---

## Trigger

Operator directive (2026-07-13): free-tier `agy` (Google Antigravity CLI)
usage limits are low enough (multi-day reset wait) to block the originally
planned use of `agy` as the third AISP in triadic debates/reviews; hotfix to
GitHub Copilot CLI instead, researching its MCP CRUD surface and model
selection empirically (not from memory) before wiring it in.

## Registration — a real defect found and fixed in-band

First attempt (`copilot mcp add zellij-mcp -- node
C:\src\github.com\sebastian-kwinana\zellij-mcp-server\dist\index.js`, escaped
backslashes passed through the Bash tool) silently produced a **corrupted
command**: `copilot mcp get zellij-mcp` showed
`node C:srcgithub.comsebastian-kwinanazellij-mcp-serverdistindex.js` — every
backslash stripped, path unusable. `copilot mcp add`'s own success message
gave no indication of this; only a follow-up `mcp get` surfaced it. Root
cause not fully isolated (a Bash-tool/Git-Bash/`copilot`-argv-parsing
interaction, most likely — not reproduced/blamed on any single layer without
more evidence than gathered here) — worked around, not root-caused, by
switching to a **forward-slash path** (`C:/src/github.com/sebastian-kwinana/
zellij-mcp-server/dist/index.js`; Node accepts these natively on Windows).
Removed the broken entry (`copilot mcp remove zellij-mcp`) and re-registered;
`copilot mcp get zellij-mcp` and `copilot mcp list --json` both now show the
correct, unmangled path. **Lesson recorded in the guide itself** (see below)
so this isn't re-learned the hard way next session.

Final confirmed state (`copilot mcp list --json`):

```json
{
  "mcpServers": {
    "zellij-mcp": {
      "tools": ["*"],
      "type": "local",
      "command": "node",
      "args": ["C:/src/github.com/sebastian-kwinana/zellij-mcp-server/dist/index.js"],
      "source": "user"
    }
  }
}
```

No connectivity probe was run against the registered server this session
(mirrors the 2026-07-11 multi-harness record's note that `grok mcp list`
also doesn't probe connectivity — only `claude mcp list` does, and even that
was a probe-timing false-negative there, not a real failure).

## Deliverable

[`docs/Guides/COPILOT-CLI-REVIEWS.md`](../../Guides/COPILOT-CLI-REVIEWS.md) —
parallel in structure/depth to `GROK-HEADLESS-REVIEWS.md`: confirmed headless
review flags (`-p`/`-s`/`--model`/`--allow-tool`/`--deny-tool`/
`--output-format json`/`--effort`), the same `gh` create/comment-only
guardrails expressed in Copilot's `shell(cmd:*)` allow/deny grammar, the
registration steps + footgun above, and an explicit "Untested" section
(full valid `--model` roster beyond the single `gpt-5.4` example in
`--help`; whether scoped `--allow-tool` alone suffices non-interactively or
`--allow-all-tools` is truly required).

## AISP-triad repositioning (the actual hotfix)

Audited the repo for places that had positioned `agy` as a review-triad leg
needing correction: `docs/Guides/GROK-HEADLESS-REVIEWS.md` already correctly
named "OpenAI-powered GitHub Copilot PR review" as the third leg (written
2026-07-12, before this session) — no edit needed there. The one place that
needed a genuine edit was `docs/GLOSSARY.md`'s AAAH entry, which listed `agy`
without qualification alongside the others; added the rate-limit caveat
there and a new **AISP** glossary entry naming the confirmed triad
(Anthropic / xAI / OpenAI) with `agy` explicitly demoted to "fourth AAAH,
best-effort fallback, not a triad leg." No historical Provenance record
mentioning `agy` as a message *recipient* (e.g. the Phase D KDL's
`60_agy-recipient` tab, the 2026-07-11 multi-harness registration record) was
touched — those are point-in-time evidence of what was tried, not living
planning docs, per standing HASEng discipline.

## Scope note

This validates **registration/reachability** of `zellij-mcp-server` under
`copilot` and documents its headless-review flag surface. It does **not**
constitute a live triadic review run — no `copilot -p ...` review has
actually been executed against this repo yet; that is the natural next step
once the "Untested" items in the guide are cheaply verified.
