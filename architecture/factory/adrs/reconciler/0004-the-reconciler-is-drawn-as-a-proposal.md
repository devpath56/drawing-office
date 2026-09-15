# 4. The reconciler is drawn as a Proposal beside the modules that exist

Date: 2026-09-15

## Status

Accepted

## Context

Machine 1 of the whiteboard is orient, the reconciler, the ask handler and the session conclusion.
Orient, the fan-out, the session close and the ask hook exist as modules; the reconciler does not.
design-loop measures its gap: `plan-file.mjs` reads a plan and nothing tracks today's plan against a
multi-day commitment or re-cuts it when a session surfaces new work; the no-leak pass of 2026-09-09
ran by hand in four commands and found four leaked asks and seven plans with no file. Session-close
step 6 (every plan's assumptions reconciled into the risk store and put through the falsifier) is the
one piece that exists, and it reconciles assumptions, not asks.

## Decision

The reconciler is a component of the operator control container tagged Proposal, described as such,
with this record beside it. Its declared job is the one the no-leak pass measured: hold the operator's
asks against the plan set, name what fell through, re-cut a plan when a session surfaces new work.
Step 6 is drawn as part of session close, not of the reconciler. design-loop PD-078 is the ruling
(operator, 2026-09-15: "Draw the reconciler as a Proposal", with the decision recorded first).

## Consequences

The operator control container reads Modified rather than complete, which is the true state. When a
reconciler module lands with an implementation pointer and a preregistered fault set, the Proposal tag
is retired in the same commit and this record is superseded by the one that names the module.
