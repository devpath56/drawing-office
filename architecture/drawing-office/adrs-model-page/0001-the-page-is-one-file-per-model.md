# 1. The page is one file per model, opened from anywhere

Date: 2026-10-03

## Status

Proposed

## Context

A reviewer reads a model once, often away from the repo: from a link, an attachment or a shared drive. A page that needs a server or a network call fails exactly there.

## Decision

Each model gets one HTML file with every drawing inlined as SVG and the model inlined as JSON. It declares UTF-8 before any text, requests no fonts or scripts, and takes its colours from the repo's theme.json (or its page theme, when it keeps one), so a repo that adopts drawing-office gets a page in its own palette.

## Consequences

The file is a few hundred kilobytes and is rewritten whole by any change to the model, which is why it is never committed. Rebuilding it is `npm run page`.
