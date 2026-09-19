# 1. The model's text is stubbed; every TrueForge object stays real

Date: 2026-09-19

## Status

Accepted

## Context

The auditor is about provenance, not about what a judge says. Its claim is that a span can be traced
to the run that produced it, and nothing in that claim depends on the judge's wording being good —
or on it costing money, or on it being available during a demo.

But a stub can quietly hollow out a demo. If the sessions, the turns, the events, the SSE stream or
the replay were stubbed, the audit would be reading fixtures it also wrote, and the whole result
would be circular in exactly the way this project exists to catch.

## Decision

`tools/stub_model.py` is a deterministic OpenAI-compatible endpoint that stubs **the model's text
and nothing else**. Every TrueForge object the auditor reads — sessions, turns, events, the SSE
stream, replay — is real. The swap to a real provider is a configuration change: point the provider
at a real API instead of the stub.

The box is marked `Modified` rather than `Proposal` because TrueForge's model-provider seam already
ships. This is our content in somebody else's extension point, which is what that state means; a
`Proposal` would claim the platform has no seat for it, and it plainly does.

## Consequences

The demo runs offline, deterministically, and for free, while the property under test stays honest.

The README labels this a LABELED FALLBACK, and the diagram now says the same thing in the one field
the renderer prints inside the box, so a reader looking at the picture is not told a different story
from a reader looking at the prose.

The limit is worth stating: this model says nothing about judge quality. An eval whose judge is
wrong will produce a confidently wrong verdict that this auditor will happily certify as SCORED,
because every span in it belongs to the run. Provenance is not correctness.

This record governs `stubModel`.
