# 11. Exec control is Modified: the seats exist and cannot yet cite a factory row

Date: 2026-09-15

## Status

Proposed

## Context

The whiteboard's exec control system is domain experts owning factory sub-systems. Measured
2026-09-09 in design-loop: eleven cartridges in advisor-builder, and `workstreams.mjs`'s advisor
column reads UNEVALUABLE — an advisor cannot cite a factory row and the factory cannot ask an advisor.
Since then PD-058 rules that every seat brings one deterministic machine, PD-063 ranks thirteen seats
to hire, and on 2026-09-14 the hire door refuses a ranked seat without a registered machine
(design-loop PR-086 HELD k=3); `seats-hired` reads 0 of 13.

## Decision

Exec control is drawn as one Modified container: eleven domain seats, each answering one question.
Modified because the cartridges are the seat and they exist; the missing interface is the door into
the factory, which PD-058's machines are the mechanism for.

## Consequences

The container's blurb keeps the whiteboard's count of eleven seats; the hiring line's count of hired
seats is a different number and lives in design-loop's own instrument.
