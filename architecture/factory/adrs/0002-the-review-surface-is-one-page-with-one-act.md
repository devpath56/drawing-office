# 2. The review surface is one page with one act

Date: 2026-09-07

## Status

Accepted

## Context

The operator asked to see the plan in the drawing office with colour for proposal, modified and built, and for the office to become effective for reviewing the factory. The plates already carry two computed axes, seat (delivery.mjs) and stage (stage.mjs), joined by element-state.mjs. What they lacked was the act: nothing recorded that a checkpoint had been looked at and accepted, and the numbers behind each box lived in stores no plate could show. OSS-039 found that the in-tree overlay leads every axis but one-act approve, which Argos and Lost Pixel carry; OSS-040 ruled option A, the in-tree wrapper plus a live-table surface plus the approve door as a decision row. The operator later added that several sessions run in parallel, so rows must carry the session that owns them.

## Decision

One page, architecture/panel.html, served by the office's own server beside the viewer. It shows the plan's checkpoint rows filtered by session, one tile per factory store with the query that produced its count printed under it, the declared servers with their state, a files strip, and the four reward terms. Its one act is Approve or Reject on a row, which writes a decision row through the factory's ledger door with the row's text sha, the operator and the session. Rows come from the plan files until step P moves them into this model; then the element property drawing-office.session carries the session and the plan file is retired. A tile never shows a number without its query; absence is spelled UNEVALUABLE or ABSENT, never 0.

## Consequences

The panel is a reader over stores and a caller of one door; it owns no state of its own, so a second operator sees the same rows and the same decisions. The source swap at step P is a change in the data module only. The page cannot be honest about a server that is down unless the machines strip probes it, so the strip is part of the page from the first version.
