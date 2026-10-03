# 1. A page per model is drawn as a Proposal

Date: 2026-10-03

## Status

Proposed

## Context

The viewer is the working surface and it needs the exported site beside it: a vendored renderer, a base64 workspace and a static server, because it fetches JSON and `file://` will not do. That suits the person drawing the model. The person it is drawn for usually has neither, so showing a reviewer a model has meant sending a folder and a command.

## Decision

Add tools/page.mjs: one self-contained page per model, `architecture/<name>/page.html`, that opens from anywhere and asks the network for nothing. A reader can walk a feature trace or play it, with the hop in play magnified and centred; click a system or container to open the view inside it; click any other box for its details and every trace that passes through it; and switch between light and dark. Everything on it is derived from workspace.json: drill targets are the views' own softwareSystemId and containerId, steps are the dynamic views' own order. The drawings are Graphviz from structurizr-cli's DOT export, so positions differ from the viewer's browser layout while the boxes and arrows are the same.

## Consequences

The page needs structurizr-cli and Graphviz, as the build does, and no browser, so it builds in CI. It checks its own joins before it writes: a trace step with no arrow, a box with no element, or a view with no drawing leaves that model's page unwritten (exit 1). It is derived, so it is git-ignored and registered in checks/derived.mjs.
