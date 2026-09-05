# 1. Checkout validates before it enqueues

Date: 2026-09-04

## Status

Accepted

## Context

A payment instruction can be malformed, and the question is whether Checkout rejects it or the queue
carries it to Settlement to be rejected there.

## Decision

Checkout validates and refuses synchronously. Only instructions that could settle are enqueued.

## Consequences

The cardholder learns about a bad instruction while they are still on the page, rather than through
a notification minutes later.

Payment requested queue never carries a message nobody can act on, so a dead-letter queue is not
needed for this class and does not appear in the model.
