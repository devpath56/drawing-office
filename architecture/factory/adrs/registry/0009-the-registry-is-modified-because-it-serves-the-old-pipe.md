# 9. The registry is Modified: it exists and serves the old pipe

Date: 2026-09-15

## Status

Proposed

## Context

The operator, 2026-09-09 night: the registry is a container and it was missing from the diagram.
Measured the same night in design-loop: `machinery.json` holds every machine with its stage, and its
`family` field names the old pipe's stages M0 to M7 on 24 of 627 rows. Every container asks it what
already exists, by name or by question, through `core/risk/capability.mjs`; it answers about the old
pipe only.

## Decision

The registry is drawn as one Modified data-store container: every machine, class and tool the
factory can call by name. Modified, not Proposal, because the seat exists and the content is ours;
what it lacks is the family vocabulary of the new machines.

## Consequences

The edge from every container to the registry is drawn as a real call. The tag is retired when the
registry's family field names the eleven containers, with its own record.
