# Drawing Office

Architecture diagrams as a **versioned model**, where the palette, the step order and the label
collisions are all *checked* rather than eyeballed.

One DSL file per system. From it: a system context view, a container view, component views, and a
feature trace — plus a viewer that navigates between them and three checks that refuse the ways a
diagram quietly goes wrong.

**If you are an agent reading this: do the steps below in order and report the exit codes.**

---

## Two kinds of module, and the directory says which

| directory | contract |
|---|---|
| `checks/` | **refuses.** Exits non-zero when something is wrong, and every one has a `--negative` that plants faults it must catch |
| `tools/` | **produces or recommends.** Writes files, prints suggestions, drives a browser. Never a verdict |
| `bin/` | the command that seeds a repo and tells you when its copy has gone stale |

They were one directory until a review pointed out that one folder was carrying three contracts.

## What it refuses

| check | refuses |
|---|---|
| `diagram-contrast` | a workspace whose colours drifted from `architecture/theme.json` · any text-on-fill or stroke-on-canvas pair under its floor · a lightness ladder that would not survive black-and-white printing · a dynamic view whose steps are not 1..n, contiguous, in DSL order |
| `pubsub` | a message bus modelled as a container · a queue or topic drawn as a plain box · a hop through one drawn as a solid line · "Sends messages to" and other labels that name no message · a channel with only one end drawn · a queue joining two systems with no declared owner |
| `tools/diagram-collisions` | a label lying across a box, across another label, or escaping its own box |
| `tools/trace-suggest` | nothing — it *recommends*. Which features deserve a trace is a product judgement |
| `tools/trace-animate` | nothing — it writes the animation frames the exporter does not |
| `tools/diagram-export` | nothing — it writes one SVG per view, with its diagram key |

Every one of them has a `--negative` that plants faults and must catch all of them. Run it: a check
nobody has seen refuse is a check nobody should trust.

---

## What you need

| tool | why | check |
|---|---|---|
| Node ≥ 18 | runs the checks | `node -v` |
| `structurizr-cli` | DSL → JSON and → the interactive site | `structurizr-cli version` |
| Graphviz | lays the site out; without it the export half-writes, then throws | `dot -V` |
| Playwright | **only** for `diagram-collisions`, which has to render the page to measure it | `npm install` |
| any static server | the viewer fetches JSON, so `file://` will not do | `npm run serve` |

macOS: `brew install structurizr-cli graphviz && npm install && npx playwright install chromium`.

---

## The flow

```
npm run write     # regenerate the DSL's styles block from architecture/theme.json
npm run export    # DSL -> workspace.json, and -> the interactive site
npm run index     # write the project list the viewer reads
npm run check     # palette, ladder, step order, and the controls over tools/
npm run serve     # then open http://localhost:8015/architecture/viewer.html
```

`npm run check:overlap` measures the served page for label collisions. It is separate because it
is the one thing that needs a browser.

**It does not currently return clean on the example, and that is left visible on purpose.** The
container view reports two: one relationship label crossing a box, and the view's own title over its
own description — which is the site's caption block, not the drawing. Raising Graphviz's rank and
node separation does not move either, because the static site lays out in the browser and does not
use those hints. A check shipped green by lowering its bar is worth nothing; this one ships with its
reading showing.

---

## Adding your own system

1. `mkdir architecture/<name>` and write `workspace.dsl` with an empty `styles { }` inside `views`.
2. `node checks/diagram-contrast.mjs --write architecture/<name>/workspace.dsl` — the palette is
   written for you, at whatever indentation your file already uses.
3. Export both formats, `--index`, then `check`.

**Do not edit the styles block.** Edit `architecture/theme.json`; the check refuses any drift
between the two. The colours are yours to change — the floors are what stop you shipping a palette
nobody can read.

### Which feature should you trace?

```
npm run suggest
```

It reads the model, finds the paths that look like features — starting outside the system, ending
where data rests — ranks them (an actor first, then a data store, then length), marks anything
already drawn, and prints DSL you can paste. It reads your `.dsl` for identifiers, so the block
compiles as pasted rather than needing every name translated by hand.

---

## What the picture means

- **Violet is ours** and lightens with depth: system, then container, then component.
- **Green is not ours**: a person, or a system we call rather than build.
- Shape carries what colour must not be asked to carry twice: a store is a cylinder, a person is a
  person.
- In the viewer's rail, a **diamond and a TRACE chip** is a feature trace — a story through the
  structure, not a level of it.

The palette came from a NotebookLM mindmap and then had to earn it: its own fills sit at 1.7–2.9
against its ground, so every element carries a stroke measured against the canvas instead.

---

## Queues and topics

Chapter 11 opens its message-driven section by naming the mistake everyone makes, in a figure caption:
**Figure 11-19, "incorrectly representing the message bus as a C4 container"**. Figure 11-20 is the
same architecture done right. `checks/pubsub.mjs` exists to tell those two models apart.

The chapter's ruling is short: **a queue or topic is a C4 container; the bus is not.** A container is
an application or a data store, and a bus is neither — but a single queue is "essentially a data store
too … with producers adding data and consumers taking it away". One box per queue, none for the broker.

```bash
npm run pubsub
```

| rule | comes from |
|---|---|
| the bus is not a container | ch11, Figure 11-19 — by its own caption |
| a queue or topic is drawn as a pipe | ch10, "Pipes to represent message queues/topics" |
| a hop through one is drawn dashed | ch10, "solid for synchronous, dashed for asynchronous" |
| the label names the message | ch11, "'Sends messages to' is very generic" |
| a queue crossing two systems declares an owner | ch11, "consider who owns the queues and topics" |
| a channel has both ends drawn | **ours, not the book's**, and it says so in every finding |

**Two of those the book offers rather than requires.** C4 is notation independent and chapter 10 says
so in its first paragraph; the pipe and the dashed line are conventions this repo picks up and then
holds everything to, because a convention nobody enforces buys a reader nothing. They live in
`architecture/theme.json` — change them there, not in the check.

**The arrows may point either way.** Chapter 11 says to flip them to show publisher and subscriber
roles, so the half-open rule counts a channel's *neighbours*, never its inbound against its outbound.
A topic with two subscribers both drawn inward is Figure 11-22 and is clean.

`architecture/payments/` is the worked example: a point-to-point queue and a topic with two
subscribers, on one plate.

## Honest limits

- **The static export carries no animation frames.** A dynamic view's steps are numbered and
  ordered, and the `,` / `.` keys do nothing, because there is nothing to step. The DSL refuses an
  `animation` block inside `dynamic`.
- **A dynamic step reuses a static relationship**, so a step cannot carry a technology the static
  edge does not. Returns are fine: they render as responses without entering the model.
- **The collision check needs a browser**, and there is a reason it cannot be replaced by reading
  the layout: the exported workspace has `x:0, y:0` for every element, because the site lays out in
  the browser at render time. A Graphviz-based check measures a layout nobody sees — it was built,
  measured against the browser, disagreed with it, and was left out of this repo on purpose.
- **The step-order rule catches a renumbering, not an omission.** A trace missing one of its steps
  still reads 1..n and passes. Only a reader catches that; it has already happened once.

---

## Where it came from

Built against *The C4 Model* (Simon Brown, O'Reilly 2026). Two rulings from ch10 are mechanised
rather than quoted: colour must encode a dimension the reader cannot already read off the page, and
a scheme must survive colour-vision deficiency and black-and-white printing — which is a number, so
it is checked. ch07's caution that traces are for interesting interactions, used sparingly, is why
`trace-suggest` recommends and never writes.

The example model is that book's Internet Banking System, so every element can be checked against a
page rather than taken on trust.

---

## Putting it in another repo

```
npx drawing-office init  --root ../your-repo    # writes architecture/theme.json and viewer.html
npx drawing-office check --root ../your-repo    # names every file that has drifted from the package
```

Only those two files are written into your repo: the palette, which you are meant to edit, and the
viewer, which has to be served from your own origin to read your own workspace. Everything else runs
from the package, so a bug has one home.

**`init` never overwrites without `--force`.** Silently replacing an edited palette would be the
worst behaviour for a command whose whole purpose is that copies drift.

**Why this exists.** The machine was distributed by `cp` across three repos. Measured: five modules,
the viewer and the theme identical — and `trace-animate.mjs` simply missing from one of them,
because a hand copy is a step someone has to remember. On its first run against a real repo,
`check` found a stale viewer nobody knew was stale.

## Adding a feature trace

```
npm run suggest   # ranked candidates, with pasteable DSL that compiles as pasted
npm run animate   # write animation frames into the export and the site bundle
```

Then open the trace in the viewer and press **N**. The walk frames each step's two elements, dims
everything not yet reached, and stops at both ends — a kill chain that wrapped would be a lie about
the system. **B** goes back, **Escape** puts the whole picture back.

## Sending a diagram to someone

```
npm run svg       # one SVG per view, plus its diagram key
```

Self-contained, real text rather than outlines, and grounded on the theme's own canvas — a fresh
headless browser reports `prefers-color-scheme: light`, which once baked a white background behind
a palette built for a dark one and dropped the relationship labels to about 1.3:1 in the file people
were sent.
