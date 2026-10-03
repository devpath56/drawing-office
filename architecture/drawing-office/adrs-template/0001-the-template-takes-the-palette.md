# 1. The page's template takes its colours from the palette

Date: 2026-10-03

## Status

Proposed

## Context

The page's layout comes from a page already in use for one model: a register of sheets across the top, each view on a dark drawing plate with its key and a title block, the trace's steps in a panel beside it. That page hard-coded one project's palette.

## Decision

tools/page-template.html keeps the layout and the script and carries no colour of its own. tools/page.mjs fills every colour in from theme.json: the accent is the ramp, the delivery states are their own strokes, and a text colour that would not read on its surface is moved toward black or white until it does. A repo that keeps an architecture/page-theme.json (a light and a dark set in the shape of a shadcn or 21st.dev theme) dresses the page around the drawings in it instead. Either way the boxes keep theme.json's colours. The plate follows the reader's light or dark choice: the dark plate is the canvas, and the few drawn colours a white plate swallows (arrows, the system boundary, canvas-filled frames) are restyled per mode, keyed on the exact colours the export writes.

## Consequences

One template serves every repo that adopts drawing-office, each in its own palette, and a contrast fault — in either mode, with or without a page theme — is caught in the page's planted faults rather than by eye. A malformed page theme is refused with the reason, never half-applied.
