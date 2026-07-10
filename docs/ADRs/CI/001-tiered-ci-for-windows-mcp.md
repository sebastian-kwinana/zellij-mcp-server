# ADR-001: Tiered CI for the Windows-MCP changeset

**Status**: Accepted, implemented in `.github/workflows/ci.yml` (this PR).
**Date**: 2026-07-08. **Decision drivers**: HASE gap #10 (no CI) and the "ship with
documented follow-ups" verdict in [CONFIDENCE-RUBRIC.md](../../Assurance/CONFIDENCE-RUBRIC.md); imminent
automated (Copilot) and independent second-opinion reviews that weight CI presence heavily.

**Context**: PR #1 needed a CI posture that continuously re-verified the Windows-MCP
assurance claims without creating a flaky or over-ambitious blocking gate.


**Options considered**
- **A** — no CI (defer to a later PR)
- **B** — single `ubuntu-latest` build-and-test job
- **C** — tiered CI: build+test matrix (ubuntu + windows), quality gates (dist-drift,
  PSScriptAnalyzer, dependency audit), plus a **dispatch-only** live Windows E2E probe
- **D** — option C but with the live Windows E2E as a **blocking** PR gate
- All options: **no CD** (nothing to deploy — this is a source-distributed MCP server;
  a release/publish pipeline is a separate future decision)

**Decision: Option C.** The frameworks below converge on it independently.

---

## 1. MoSCoW

| Priority | Item |
|----------|------|
| **Must** | `npm ci && npm test && npm run test:integration` on `ubuntu-latest` **and** `windows-latest` (the changeset is Windows-targeted; a Linux-only pipeline never executes the PowerShell parser gate on its native platform) |
| **Must** | Dependency audit blocking at high/critical (this branch just fixed 2 high advisories; the gate prevents regression) |
| **Should** | `dist/` drift gate (HASE #15); PSScriptAnalyzer at Error severity (verified 0 errors pre-ship) |
| **Could** | Live Windows E2E — **as a manually-dispatched, non-blocking probe** |
| **Won't (now)** | CD/release pipeline; coverage-percentage gates (33 tests but no coverage tooling — a threshold now would be theatre); blocking live E2E (see Cynefin/pre-mortem) |

## 2. Eight-plus Whys (root-purpose analysis)

1. Why add CI? → So the test suite runs on every change, not only when someone remembers.
2. Why must it run on every change? → Because the suite encodes the security contract (injection rejection, fail-closed guard, TS↔PowerShell interface) and silent contract drift is the main regression risk.
3. Why is contract drift the main risk? → The change spans two languages; nothing but the contract tests binds `windows-mcp.ts` to `windows-mcp.ps1`.
4. Why does that binding matter? → A drifted parameter name fails only at runtime **on Windows**, which the maintainer may not be running.
5. Why won't the maintainer catch it? → Development happens on Linux; the Windows path is exactly the one local runs exercise least. CI's `windows-latest` runner is the only routinely-available Windows executor.
6. Why does routine Windows execution matter beyond correctness? → The published claims (HASE matrix, rubric) cite tests as evidence; unexecuted evidence decays into fiction.
7. Why do the published claims matter? → Independent reviewers (Copilot, a second-opinion frontier model) will verify them; the repository owner's professional reputation rides on every push.
8. Why does reputation ride on CI specifically? → A public branch with assurance documents but no pipeline is self-refuting — it *documents* rigor while *demonstrating* its absence.
9. **Root purpose**: CI is the mechanism that converts this branch's assurance claims from assertions into continuously re-verified evidence. → Ship it in the same PR as the claims.

## 3. Bezos Type-1 / Type-2 reversibility

- Adding workflow file(s): **Type-2** (one file, deletable, no lock-in, no secrets) → decide fast, ship now.
- Making the live E2E a **blocking** gate: reputationally closer to **Type-1** — public red ✗ on a flaky untested gate is remembered, and unwinding a required status check needs settings changes. → Take the Type-2 form (dispatch-only probe), defer the Type-1 commitment until the probe proves stable.
- Conclusion: C now; D only after evidence.

## 4. Wardley mapping (evolution positioning)

Anchor: a maintainer/reviewer needing *trustworthy merges*. Value chain: trustworthy merge ← continuously executed tests ← test runner ← CI service ← compute.
- CI service & compute: **commodity/utility** (GitHub Actions) — consume, never build.
- Test runner: **product/commodity** (`node --test`, PSScriptAnalyzer) — consume.
- The Windows live-E2E harness: **genesis/custom-built** — novel, uncertain, still evolving.
Wardley doctrine: industrialised components should be adopted as-is; genesis components should be *explored cheaply*, not load-bearing. → Standard actions and runners as blocking gates; the genesis E2E as a non-blocking probe. Again option C.

## 5. Cynefin domains

- "Should a public OSS repo run its tests in CI?" — **Clear/Obvious** (best practice: sense–categorise–respond). Just do it; further deliberation is waste.
- "Will a live `uvx`→PyPI→Python-3.13→mkcert→TLS launch be stable on a hosted runner?" — **Complex** (unknowable a priori; runner images, network, and package managers shift). Correct move: **probe–sense–respond** — a safe-to-fail, manually-dispatched job whose failures inform without harming. The `e2e-windows` job *is* that probe, literally.

## 6. Pre-mortem (Klein) → hardening applied

"It is six months later and the CI made the repository look worse. What happened?"

| Imagined failure | Countermeasure shipped |
|---|---|
| Flaky Windows E2E blocked every PR with public red ✗ | E2E is `workflow_dispatch`-only; never a PR gate |
| A blocking step failed on day one because it was never executed anywhere | Every blocking step was executed in the authoring environment first (cold `npm ci` → 33/33 + 19/19; dist-drift = zero; PSSA = 0 errors); the only unexecutable step is the non-blocking probe |
| Compromised third-party action exfiltrated the token | Only official `actions/*`, pinned major; `permissions: contents: read` |
| Hung job burned minutes for days | `timeout-minutes` on every job; `concurrency` cancels superseded runs |
| One OS leg failing masked the other's result | `fail-fast: false` on the matrix |
| New dependency advisory landed silently | `npm audit --audit-level=high` blocks |

## 7. Inversion (Munger)

"How would we *guarantee* reputational damage?" — Ship an untested blocking pipeline; gate on style warnings so every PR opens red; use unpinned community actions with a writable token; let vendored dependencies rot while the lockfile claims health. Each inverted item is either countered above or was fixed on this branch (the vendored-`node_modules` removal — see §9).

## 8. Cost of Delay / real options

CD3-style: cost of delay is front-loaded — the Copilot review and the second-opinion review happen *now*, and both will (correctly) discount unexecuted test suites; implementation cost is ~1 hour and falls to zero reuse-value later. High delay-cost ÷ short duration → do immediately. The dispatch-only E2E is a cheap **real option**: purchased now (job exists, documented), exercised when wanted, promotable to a required check only when evidence supports it.

## 9. Chesterton's Fence (both directions)

- **Fence kept**: committed `dist/` predates this work and plausibly serves run-from-clone use. Rather than tearing it out inside an unrelated PR, the drift gate makes the convention safe (HASE #15 ✅).
- **Fence removed — after examination**: committed `node_modules/` (2,267 files, 96% of the tracked tree) had its purpose fully superseded by `package-lock.json` + `npm ci`, and was shown *actively harmful* on this very branch: the audit fix patched the lockfile while the vendored vulnerable copies would have shipped on. Removed in its own commit.

## 10. Weighted decision matrix (Pugh-style)

Weights reflect the stated priority: professional signal under imminent independent review, without self-inflicted flakiness. Scores 1–5.

| Criterion (weight) | A: none | B: linux-only | **C: tiered** | D: C + blocking E2E |
|---|---|---|---|---|
| Assurance value (0.30) | 1 | 3 | **5** | 5 |
| Flake/maintenance risk, inverted (0.25) | 5 | 4 | **4** | 1 |
| Reviewer/reputation signal (0.20) | 1 | 3 | **5** | 3 |
| Time-to-ship (0.15) | 5 | 4 | **4** | 2 |
| Future leverage (0.10) | 1 | 3 | **5** | 5 |
| **Weighted total** | **2.60** | **3.45** | **4.55** | **3.10** |

## Consequences

- Every PR now executes the full suite on both OSes plus quality gates; the assurance docs' evidence is continuously re-verified.
- The Windows live path gains a one-click probe (`Actions → CI → Run workflow`), the designated route to eventually retiring HASE #9's "manual checklist" caveat.
- First execution of this pipeline is on PR #1 itself; HASE #10 is promoted to ✅ only after that run is observed green (see matrix note).
- Revisit: promote `e2e-windows` toward required status after ~5 consecutive clean dispatched runs; consider a release/publish (CD) decision record only when distribution is actually needed.
