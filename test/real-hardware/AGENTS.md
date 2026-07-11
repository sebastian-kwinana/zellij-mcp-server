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

## Evidence goes in Provenance, not just test output

Each real-hardware test run this directory produces should have a corresponding dated
record under `docs/Provenance/Windows-MCP/` — matching this repo's evidence-in-repo
ethos (see `docs/Assurance/HASE-COMPLIANCE.md`: "Compliant requires evidence in the
repository, not intent"). A green `npm run test:real-hardware` on one machine, one time,
is a data point; the Provenance record is what makes it citable later.
