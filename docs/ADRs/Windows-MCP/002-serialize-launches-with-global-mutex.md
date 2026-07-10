# ADR-002: Serialize Windows-MCP launches with a global mutex

- **Status:** Accepted
- **Date:** 2026-07-10
- **Scope:** Windows-MCP launcher integration
- **Related provenance:** [`../../Provenance/Windows-MCP/2026-07-10-action-record-mutex-pinning.md`](../../Provenance/Windows-MCP/2026-07-10-action-record-mutex-pinning.md), [`../../Provenance/Windows-MCP/2026-07-10-adversarial-sitrep-v2.md`](../../Provenance/Windows-MCP/2026-07-10-adversarial-sitrep-v2.md)

## Context

`Start-WindowsMcp` previously checked whether the server was already running and
then called `Start-Process` without any cross-process synchronisation.

In multi-agent or multi-session use, two concurrent launch requests could both
observe "not running" and each spawn a competing `windows-mcp serve` process on
the same port. The losing process could exit quickly and leave behind a stale
PID lockfile, which in turn degrades later `status` and `stop` behaviour.

## Decision

Wrap the critical section from `Test-ServerRunning` through writing the PID
lockfile in a named .NET mutex: `Global\ZellijWindowsMCP`.

The implementation waits up to 30 seconds to acquire the mutex. If the wait
times out, the launcher fails open for availability and performs the normal
status check again before continuing.

## Consequences

### Positive

- Concurrent launch requests are serialised across Windows processes and
  sessions.
- The single-instance promise matches multi-agent reality rather than a serial
  startup assumption.
- PID lockfile writes happen only inside the protected region.

### Negative / trade-offs

- The mutex introduces a bounded wait on concurrent launches.
- The implementation deliberately fails open after a 30-second timeout to avoid
  deadlock from a stuck holder.

## Residual risk

- A timed-out wait proceeds without the mutex guard, though it still re-checks
  whether the server is already up.
- Availability is favoured over strict serialisation in the timeout case.
