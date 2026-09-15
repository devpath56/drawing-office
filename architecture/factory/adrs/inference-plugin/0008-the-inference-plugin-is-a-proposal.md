# 8. The inference plugin is a Proposal every machine calls

Date: 2026-09-15

## Status

Proposed

## Context

Every machine in the factory runs on a model, and today the model is the agent in the session: no API
key sits in any tree, and the LLM work happens in the window the operator opened. The operator's
ruling of 2026-09-09 makes the model a container the machines call, so a target company can supply its
own, and names DeepSeek's open-source packages as the unsearched candidate.

## Decision

The inference plugin is drawn as one Proposal container with technology "DeepSeek OSS, unsearched".
The agent in session stays an external system that talks to the plugin, so the picture shows where
inference sits today and where it is proposed to sit.

## Consequences

The tag is retired when a package is ruled through the OSS doors and a machine calls it rather than
the session, with its own record.
