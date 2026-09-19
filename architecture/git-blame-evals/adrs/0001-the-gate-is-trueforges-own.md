# 1. Scoring is an MCP tool, so the platform's own gate can pause it

Date: 2026-09-19

## Status

Accepted

## Context

The auditor's value is in the path where it says no. When a claim carries spans the target run does
not own, the verdict is UNEVALUABLE and the scoring must not happen.

The obvious build is a refusal of our own: a screen, a queue of blocked claims, a button. That is a
second gate beside one that already exists, and it has a worse property than mere duplication — a
gate we invent is a gate we can be talked past, because the thing it guards still runs through a
code path we also own.

TrueForge already has a native tool-approval flow: it pauses a turn on a tool call, surfaces the
call to a human, and resumes on a decision.

## Decision

Scoring is implemented as an MCP tool, `score_eval`, served by `tools/score_mcp.py` and registered
as a remote MCP server that TrueForge discovers through its own MCP client. The agent attaches it
with `require_approval_for_tools: ["score_eval"]`, so a call emits `tool.approval_required` and the
turn pauses. The resume is a `user.tool_approval` input carrying allow or deny.

**Enforcement lives in the tool, not in the gate.** `score_eval` scores `owned_event_ids` only. An
approval therefore permits scoring of the owned subset and cannot widen it to a foreign span.

## Consequences

The refusal cannot be routed around by anything the UI does, because the UI is not where the rule
is. A human who approves a contaminated run gets the owned subset scored and no more.

`src/gate.py` never decides on its own — it prompts and blocks, and with no TTY and no explicit flag
it refuses to proceed rather than choosing. `AUDITOR_AUTO_DECISION` exists for unattended runs and
is recorded as `decision_source: "auto"`, against `"human"` for a typed answer, so a receipt never
claims a human decided when nobody did.

Exactly one decision is recorded per run, written to the receipt and the ledger from the same value
that was displayed, so the two cannot diverge. Deciding twice on one receipt is refused.

The cost is a dependency: the graceful path needs TrueForge's gate configured and reachable. An
auditor deployed against a platform with no approval mechanism would still write the UNEVALUABLE
receipt, and the stopping would be missing.

This record governs `gitBlameEvals`.
