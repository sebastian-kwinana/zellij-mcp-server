# Test-Suite Execution-Order Hazard: `node --test` Defaults to Concurrent File Execution

**Classification:** AI-to-AI Provenance Record — HASEng
**Subject:** `test/real-hardware/*.test.js` execution-order safety
**Trigger:** user-raised HASEng question — "is idempotency of the test suite formally
robust if order-of-operations hasn't been verified?" — following a manually-observed
symptom the day before (the C.1 re-verification needed a manual `-Action launch`
after C.3's `-Action stop` had run in the same `npm run test:real-hardware`
invocation).

---

## Headline finding

This was not a theoretical "could break someday if file order changes" risk. It is a
**live, currently-active race**, empirically confirmed: **Node's `node --test` CLI
defaults to running multiple matched test files concurrently, in separate child
processes** — not sequentially. Neither `package.json`'s `test` nor (pre-fix)
`test:real-hardware` script passed `--test-concurrency`, so both inherited this
default.

**Citation:** Node's own CLI docs (`doc/api/cli.md`, `v22.x` branch — matching
`.github/workflows/ci.yml`'s `actions/setup-node@v4` `node-version: 22` pin),
`--test-concurrency`, added v21.0.0/v20.10.0/v18.19.0:
> "The maximum number of test files that the test runner CLI will execute
> concurrently. ... concurrency defaults to `os.availableParallelism() - 1`."

This is a genuinely different default from the `node:test` JS `run()` API's own
documented `concurrency` option (`false`, sequential) — a discrepancy easy to miss if
only the `test()`/`run()` API page is checked, not the separate CLI-flags page.

**Empirically reproduced** (2026-07-12): 4 dummy `node:test` files, each logging PID +
timestamp with a 500ms delay, run via `node --test "*.test.js"` with no concurrency
flag on a 4-core sandbox (`os.availableParallelism()` = 4 → default concurrency = 3):
3 separate child processes started within 15ms of each other under **different PIDs**;
the 4th waited for a free slot. Re-run with `--test-concurrency=1`: strictly
sequential start/end pairs. Node's docs additionally do **not** guarantee matched-file
processing order (alphabetical/lexical or otherwise) — that's an unstated
implementation detail, not a contract.

## The real bug this caused

`test/real-hardware/mkcert-trust.test.js`'s TLS-handshake check (verifies a TLS
handshake to `https://127.0.0.1:8000/mcp/` succeeds without `-SkipCertificateCheck`)
implicitly depended on a windows-mcp server already being up — either from a prior
manual `-Action setup`, or from having "run after" another file that launched one.
`test/real-hardware/powershell51-compat.test.js`'s second test calls `-Action stop`,
which kills the tracked server as its whole point (proving the stop action itself
works correctly under PowerShell 5.1).

The **documented intended order** at the time
(`defender-check.test.js`'s original header comment: "Run first in the
C.4→C.2→C.3→C.1 sequence") was itself unsafe — C.3 (`powershell51-compat.test.js`,
which stops the server) was scheduled to run *before* C.1 (`mkcert-trust.test.js`,
which needs it running). Only an accident of alphabetical glob sort
(`defender-check < mkcert-trust < monitor-topology < powershell51-compat`) combined
with an *incorrect* assumption of sequential execution avoided the bug in the one real
run performed (see `2026-07-11-real-hardware-test-results.md`) — and even that
protection was never guaranteed, since concurrent execution was the actual default the
whole time. The operator had to manually re-run `-Action launch -NonInteractive`
before C.1's TLS check would pass, which in hindsight is best explained by this race,
not merely "ran the files in the wrong order."

## Fix applied (2026-07-12)

1. **`mkcert-trust.test.js` self-provisions its own precondition.** The TLS-handshake
   test now calls `-Action launch -NonInteractive` unconditionally before checking
   whether the port is listening — safe because `-Action launch` is idempotent and
   mutex-guarded (`Global\ZellijWindowsMCP`, adversarially reviewed as part of PR #1's
   Windows-MCP integration). This removes the dependency on any other file's side
   effects or on execution order entirely. The genuinely non-automatable precondition
   (a human having clicked through the interactive mkcert trust dialog *at least
   once, ever*) remains a correct `t.skip`.
2. **`package.json`'s `test:real-hardware` script now passes `--test-concurrency=1`**
   as defense-in-depth on top of fix 1 — deliberately scoped to this script only, not
   `npm test`: the unit suite (`test/*.test.js`) has zero cross-file shared-state
   edges (confirmed by a dedicated dependency-graph analysis of every file in both
   suites) and gains nothing from forced sequencing; CI stays exactly as fast as
   before.
3. **Misleading order comments corrected** in `defender-check.test.js` (removed the
   "run first in this sequence" framing that was itself the unsafe order) and a
   cross-reference note added in `powershell51-compat.test.js` for future editors.
4. **`test/real-hardware/AGENTS.md`** now states this as a standing rule for any
   future file added to the directory: self-provision preconditions, don't rely on
   file order; the `--test-concurrency=1` flag is a second layer, not a substitute for
   rule 1.

## What was deliberately NOT changed

`npm test` (the CI-facing unit suite) does **not** get `--test-concurrency=1`. A
dedicated analysis of every file under `test/*.test.js` found zero cross-file shared
mutable state: `config.test.js` mutates a module-level cache singleton and
`process.env`, but fully saves/restores both in `beforeEach`/`afterEach`, and under
Node's default per-file process isolation this can't leak across files regardless.
Forcing sequential execution here would slow CI for no correctness benefit.

## Full dependency-graph analysis

Available on request / in this session's transcript — not reproduced in full here to
keep this record focused on the finding and the fix. Headline structure: the unit
suite (`test/*.test.js`, 5 files) has no cross-file edges at all; the real-hardware
suite's only hazardous edge was the one described above (now removed at the source).
