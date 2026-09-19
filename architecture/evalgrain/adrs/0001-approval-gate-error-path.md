# 1. A contaminated eval closes through TrueForge's own approval gate, not a refusal UI of ours

Date: 2026-09-19

## Status

Accepted

## Context

The auditor's whole value is in the path where it says no. CF-262 is the bug it exists for: an eval
grouped replayed spans by a repeated label — "LLM call 9" — and scored another session's spans as
this run's, so one run's artifacts were credited to another. The Membership Checker catches that by
testing every claimed span against the Trace-Ownership Registry, and the question this record
answers is what happens next.

A refusal has to reach a person, and it has to stop the scoring rather than annotate it. The obvious
build is ours: a refusal screen, a queue of blocked claims, a button. That is a second gate beside
one that already exists, and a hackathon v0 that builds its own approval flow has spent its time on
the half that was already solved.

TrueForge is not ours. It is the local single-process platform the harness already runs on, and it
ships a native approval gate: scoring pauses, a human decides, nothing proceeds without the
decision. The auditor already talks to TrueForge to fingerprint live events, so the edge exists.

## Decision

A contaminated eval closes as UNEVALUABLE through TrueForge's native approval gate.

The Receipt Writer logs UNEVALUABLE durably — every foreign span, each with its true owner IDs —
and then pauses scoring at the gate. The Eval Operator approves or rejects there. Nothing scores
without that decision.

UNEVALUABLE is a verdict about the claim and not a score of it. It is deliberately not a failing
score: a run whose membership cannot be established has not been judged badly, it has not been
judged at all, and recording a number for it would be the same error CF-262 made one level up.

## Consequences

The error path is demonstrable without a line of gate code. The demo is TrueForge pausing, a human
rejecting, and no score being written — "I didn't build a gate, I borrowed theirs."

The refusal is durable and stays out of model history. The receipt is the artifact; the paused claim
is TrueForge's own record.

The cost is a dependency. The graceful error path now requires that TrueForge's gate is configured
and reachable, and an auditor deployed against a platform with no approval mechanism would have
nothing to pause on — it would still write the UNEVALUABLE receipt, and the stopping would be
missing. That trade is taken knowingly for v0, where the platform is a fixed local process.

This record governs `evalgrain`, the Eval-Grain Auditor (I).
