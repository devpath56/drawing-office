# 2. Hue says who owns it; lightness says how deep it sits

Date: 2026-09-04

## Status

Accepted

## Context

Chapter 10 of *The C4 Model* calls the familiar blue-and-grey C4 palette a misconception rather than
a standard: the model is notation independent. So a palette is a choice this repo makes and has to
defend, and the chapter sets the bar for defending it — colour must encode a dimension the reader
cannot already read off the page, and any scheme must survive colour vision deficiency and
black-and-white printing.

Two candidate dimensions were on the table: ownership (do we build this, or does it already exist)
and depth (system, container, component). Encoding both in one channel would make them collide.

## Decision

Hue carries ownership and lightness carries depth. Violet is ours and lightens as the reader
descends — system, then container, then component. Muted green is not ours, sits outside the ramp,
and is darker than all of it.

The two cannot collide because one is hue and the other is value, and the greyscale distance between
adjacent ramp steps is checked rather than assumed.

## Consequences

A reader with no colour vision still reads depth, because the ramp is a lightness ladder. A printed
page still reads ownership, because not-ours is darker than the whole ramp.

Shape carries what colour must not be asked to carry twice: a store is a cylinder, a queue or topic
is a pipe, a person is a person, and a deployment node is a frame with no fill — because where a
container runs is not a claim about who owns it.

`checks/diagram-contrast.mjs` measures every declared pair against its floor and refuses a ramp that
stops lightening. `checks/diagram-key.mjs` refuses a palette row no workspace draws.
