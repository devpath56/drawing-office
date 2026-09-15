# 10. Maintainer control is Modified: forty jobs exist and the control system around them does not

Date: 2026-09-15

## Status

Proposed

## Context

The whiteboard's maintainer control system is the VP Eng equivalent: autonomous by default, human
override, the operator sees only health. Measured 2026-09-09 in design-loop: forty rows in
`maintenance_job` with reader, writer, sql and exit_when, and `capability.lookup("maintenance job
health for the operator")` reads ABSENT. There is no orient-equivalent, no health line, no autonomy.

## Decision

Maintainer control is drawn as one Modified container: runs the forty maintenance jobs; the operator
sees only health. Modified because the jobs are the seat and they exist; the missing interface is the
gap the box names.

## Consequences

Forty jobs and no dashboard is forty jobs nobody runs; the box says so until a health line exists.
