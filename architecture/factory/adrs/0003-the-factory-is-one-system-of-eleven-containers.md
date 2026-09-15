# 3. The factory is one system of eleven containers inside one governance boundary

Date: 2026-09-15

## Status

Accepted

Supersedes 1 (the three departments as deep modules).

## Context

ADR 1 drew three repositories as three software systems. The operator's whiteboard of 2026-09-09
(design-loop `core/plans/plan-factory-architecture.md`, "The C4 container view — ruled 2026-09-09")
rules differently: the factory is the SYSTEM and each machine is a CONTAINER. The four control
systems stay four containers so each one's missing interface stays visible as its own gap; the plugin
layer is two things — governance and RBAC wrap every container as a boundary, while context and
inference are containers the machines call. On 2026-09-15 the operator chose this framing over
adding a fourth department, knowing it re-scopes both existing feature traces.

## Decision

One software system, "The Factory", holds eleven containers inside a `governance-rbac` group drawn as
a frame: operator control, maintainer control, exec control, feedback control, discovery, delivery,
distribution, stores, registry, context plugin, inference plugin. Delivery state is the plan's table:
the four control containers and the registry are Modified (they exist and are missing their
interface), delivery, distribution and the two plugins are Proposals, discovery and stores ship as-is.
The operator control container is drawn to component level — the modules as they run — because the
operator asked to double-click orient and see inside it. The RAT attack trace is re-scoped to the
discovery container's components; the inter-department loop of ADR 1 is retired with this framing,
because two of its three systems are no longer boxes.

## Consequences

Every box that is Modified or a Proposal carries a decision beside it, or sits under a parent whose
marked child does, so `checks/delivery.mjs` can refuse an unstated claim. Learn-verify-kit is no
longer a box; its operator half lives in feedback control's description and its return is a later
drawing. Component boxes name their module in the technology field and carry no `implementation`
property, because the stage check reads git in this repository and the modules live in design-loop;
the stage of those boxes is therefore reported as not claimed, never as built.
