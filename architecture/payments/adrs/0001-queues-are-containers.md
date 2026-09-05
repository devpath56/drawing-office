# 1. Each queue and topic is a container; the message bus is not

Date: 2026-09-04

## Status

Accepted

## Context

A message-driven architecture has to be drawn somehow, and the obvious drawing puts one box in the
middle labelled with the broker. Chapter 11 of *The C4 Model* shows that drawing as Figure 11-19 and
captions it "incorrectly representing the message bus as a C4 container".

The chapter's reasoning is structural rather than aesthetic. A C4 container is an application or a
data store, and a message bus is neither. Worse, the hub-and-spoke shape obscures the real story: the
coupling is between a specific producer and a specific consumer, and a single bus box hides which
pairs are coupled to which.

## Decision

Every queue and topic is modelled as its own container, tagged `Channel`. The broker is not modelled
at all; it appears only as the technology on the channel that happens to be hosted there.

A channel's technology may name the broker — "Amazon SQS", "Apache Kafka topic" — and that is how a
reader learns where it runs without the bus becoming a box.

## Consequences

The container view shows point-to-point coupling directly: Checkout to Payment requested queue to
Settlement is three boxes and two hops, and nothing is hidden behind an intermediary.

Fan-out reads correctly too. Statement events topic has one publisher and two subscribers, which on a
hub-and-spoke drawing would have been four arrows into one box.

`checks/pubsub.mjs` enforces this: an element whose name or technology carries broker words and no
channel word is refused as `bus-as-container`, citing the figure.

The cost is more boxes. A platform with twenty queues draws twenty containers, and chapter 11 offers
the alternative of omitting them and moving their names onto the arrows. We have not taken it,
because the explicitness is the reason we drew them.
