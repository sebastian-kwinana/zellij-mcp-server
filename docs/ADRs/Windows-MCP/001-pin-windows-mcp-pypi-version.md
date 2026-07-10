# ADR-001: Pin the `windows-mcp` PyPI version

- **Status:** Accepted
- **Date:** 2026-07-10
- **Scope:** Windows-MCP launcher integration
- **Supersedes:** Floating `uvx windows-mcp` invocations
- **Related provenance:** [`../../Provenance/Windows-MCP/2026-07-10-action-record-mutex-pinning.md`](../../Provenance/Windows-MCP/2026-07-10-action-record-mutex-pinning.md)

The linked action record remains shared provenance because the version pinning
and mutex work were implemented, tested, and attested in the same 2026-07-10
session.

## Context

The Windows-MCP launcher used `uvx windows-mcp` for `auth`, `serve`, and
`install`. That meant every invocation fetched whatever release was current on
PyPI at the time of launch.

A breaking upstream release could silently change sub-command names, CLI flags,
output format, or Python compatibility and break users' next launch with no
change in this repository. The TypeScript layer hard-codes the marker protocol
and command structure, so silent dependency drift is a real operational risk.

## Decision

Pin the upstream package through a single PowerShell variable,
`$script:WindowsMcpVersion`, and use a versioned specifier in every `uvx`
invocation.

The initial accepted version is `0.8.2`, the release validated by the live
Windows CI probe on 2026-07-09/10.

## Consequences

### Positive

- Upstream change becomes an explicit repository change instead of silent drift.
- The upgrade path is auditable and reviewable.
- Contract tests can pin the presence of the version variable and versioned
  specifier.

### Negative / trade-offs

- Upgrades now require a deliberate maintenance step.
- The repository must carry and document version history.

## Operational follow-up

To upgrade:

1. Bump `$script:WindowsMcpVersion` in `scripts/windows/windows-mcp.ps1`.
2. Run `npm test`.
3. Run the `e2e-windows` dispatch probe.
4. Update the version history in the linked provenance record.
