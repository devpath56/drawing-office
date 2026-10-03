# 1. The control over tools runs the page's planted faults

Date: 2026-10-03

## Status

Proposed

## Context

checks/test-tools.mjs is the control for the modules in tools/ that have none of their own: it runs each one's --negative and fails if any planted fault is missed. A new tool that is not on its list is never run by `npm run check`.

## Decision

Add tools/page.mjs to the list, beside build, trace-suggest and trace-animate.

## Consequences

`npm run check` runs the page's planted faults: the drill targets, the breadcrumb, the seams, the label escaping, the key and the palette.
