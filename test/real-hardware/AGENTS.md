# AGENTS.md — `test/real-hardware/` real-Windows-hardware test category

Nested guidance for this directory. The root [`AGENTS.md`](../../AGENTS.md) and
[`scripts/windows/AGENTS.md`](../../scripts/windows/AGENTS.md) still apply; this file
adds what an agent editing *this* directory must know. (Placed here — not at root —
because the convention is localized to this directory; see the placement trio in the
root file.)

## What this directory is

Tests in `test/real-hardware/*.test.js` exercise behavior that **only exists on real,
physical Windows hardware** — the interactive `mkcert -install` trust-store dialog,
Windows PowerShell 5.1 (vs. CI's always-`pwsh`-7 runners), real Windows Defender/AV
interference, real monitor topology. GitHub-hosted `windows-latest` CI runners are
headless cloud VMs; they cannot answer a GUI dialog and are tuned in ways that hide
real-world AV interference. These tests exist to close that specific, structural gap.

## Two layers of isolation — do not remove either

1. **Structural (primary).** `package.json`'s `"test"` script glob is
   `"test/*.test.js"` — single-level, does **not** recurse into subdirectories. Files
   here are invisible to `npm test` / CI by construction, with zero glob change
   required. Do not widen that glob to `test/**/*.test.js` without re-reading this file.
2. **Self-guard (defense in depth).** Every file here *also* checks
   `process.env.REQUIRES_REAL_HARDWARE === '1'` and `os.platform() === 'win32'`,
   `{ skip: ... }`-ing otherwise — matching this repo's existing fail-closed-skip ethos
   (see `test/powershell-contract.test.js`). If the structural isolation above is ever
   accidentally widened, these tests degrade to a clean skip, not an unexpected CI
   failure.

## Never add this directory to `.github/workflows/ci.yml`

These tests are invoked manually, by a human, on real hardware, via:

```powershell
$env:REQUIRES_REAL_HARDWARE = '1'
npm run test:real-hardware
```

Some of them (the mkcert trust-dialog test) *depend on a preceding manual, interactive
step* — a human clicking through the Windows trust-store prompt — that cannot be
automated in CI even in principle. Treat any change that would make this directory
runnable unattended in CI as a sign you've misunderstood what these tests are for.

## Files here share live OS state — write order-INDEPENDENT tests, not order-dependent ones

**Node's `node --test` CLI runs multiple matched files CONCURRENTLY by default** — the
documented `--test-concurrency` default is `os.availableParallelism() - 1`, not `1`.
This is a genuinely different default than the `node:test` JS `run()` API's
(`concurrency: false`, sequential) — easy to miss if you only check the API docs page
and not the CLI flags page. Empirically reproduced 2026-07-12; see
`docs/Provenance/Windows-MCP/2026-07-12-test-suite-ordering-hazard.md` for the full
finding, including a real bug it caused (`mkcert-trust.test.js`'s TLS check racing
against `powershell51-compat.test.js`'s `-Action stop`).

Every file in this directory ultimately shares machine-wide, live state: port 8000,
`%LOCALAPPDATA%\zellij-mcp\windows-mcp.pid`, `~/.windows-mcp/config.toml`, the Windows
cert store. Two rules follow, both load-bearing for any new file added here:

1. **If your test needs the server running, make it self-sufficient.** Do not assume
   another file (or a human, in this exact invocation) already launched it and left it
   running — that assumption is exactly what caused the bug above. `-Action launch` is
   idempotent and mutex-guarded (`Global\ZellijWindowsMCP` — `scripts/windows/AGENTS.md`
   lesson 3), so it's safe to call unconditionally at the top of your test. Only
   fall back to `t.skip(...)` for the genuinely non-automatable precondition (a human
   having clicked through the interactive mkcert trust dialog at least once, ever) —
   see `mkcert-trust.test.js` for the pattern.
2. **`test:real-hardware` forces `--test-concurrency=1`** (`package.json`) as
   defense-in-depth on top of rule 1 — do not remove that flag without re-reading this
   section. It is deliberately scoped to this script only; `npm test`'s unit suite has
   zero cross-file shared-state edges (confirmed by dedicated analysis) and gains
   nothing from forced sequencing.

If you genuinely cannot make a new test self-sufficient (e.g. it must observe a
*transition*, not just a steady state), do not rely on filename sort order to sequence
it — that ordering is an **undocumented Node implementation detail**, not a contract.
Say so explicitly in a comment and treat it as a known, accepted limitation, not an
invisible assumption.

## `workspaces/` — CAICEWAC layouts + the SAWEng demo-runner live here

`test/real-hardware/workspaces/` holds this category's Zellij
Workspace-as-Code KDL layouts and their launch tooling, per
[ADR-Workspaces-001](../../docs/ADRs/Workspaces/001-per-test-category-workspaces-directories.md)
(per-category `workspaces/` directories are the foundational, self-documenting
filesystem pattern for future MAIESAW-Engine work — do not consolidate them into
a repo-root directory). Contents:

- `windows-mcp-real-hardware-e2e-v0.0.1.kdl` — the CAMSO-Core-mapped
  real-hardware E2E/demo workspace (leader + recipient tabs, single-writer
  discipline; see its header).
- `sfa_saweng_demo_runner_v1.py` — Single File Agent (uv script-header) runner
  that idempotently launches/inspects/describes/stops that workspace. Invoke via
  `uv run --script <path> <subcommand>`; `doctor` is the preflight,
  `launch` is idempotent by session-name check (same philosophy as the
  `Global\ZellijWindowsMCP` mutex), `describe --ai` optionally self-explains via
  an Anthropic model but always degrades gracefully without a key.

`*.test.js` files matching this directory's parent glob do NOT reach into
`workspaces/` (single-level glob, same isolation as the parent directory enjoys
from `npm test`). A KDL file here is data, not a test — tests/demos consume it.

## Evidence goes in Provenance, not just test output

Each real-hardware test run this directory produces should have a corresponding dated
record under `docs/Provenance/Windows-MCP/` — matching this repo's evidence-in-repo
ethos (see `docs/Assurance/HASE-COMPLIANCE.md`: "Compliant requires evidence in the
repository, not intent"). A green `npm run test:real-hardware` on one machine, one time,
is a data point; the Provenance record is what makes it citable later.
