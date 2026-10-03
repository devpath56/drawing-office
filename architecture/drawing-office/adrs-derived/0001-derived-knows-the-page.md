# 1. The derived check is modified to know the page

Date: 2026-10-03

## Status

Proposed

## Context

checks/derived.mjs refuses anything the exporter makes that is under version control, and any derived shape .gitignore does not name. The proposal adds two derived shapes: the page itself, and the scratch directory a failed run can leave behind.

## Decision

Register `architecture/*/page.html` and `architecture/*/.page/` as derived rows, each with the command that rebuilds it, and plant both in the check's negative cases. The negative now counts its own cases rather than comparing with a hard-coded total, which was the line the new cases broke.

## Consequences

A committed page is refused the way a committed site is. Adding a derived row no longer needs a second edit to a number.
