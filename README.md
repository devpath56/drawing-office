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
| `test-viewer` | a wrapper whose opening view is a typed-in view key rather than the model's own · a row label written in two places, so a chip reaches only half the rail |
| `diagram-key` | a tag a view draws that the theme never styles, so it renders in the renderer's default and lands on the key unexplained · a palette row no workspace draws · an exported key that omits a style its view uses |
| `derived` | anything the exporter makes that is under version control, and any derived shape .gitignore does not name |
| `delivery` | a box marked as our addition with no decision saying what it adds · one marked in two states at once · one drawn in no view · a declared state the theme does not style |
| `decisions` | a decision with no status, or one outside Nygard's vocabulary · a decision governing an element no view draws · a Superseded record that names no successor |
| `perspectives` | a perspective declared on a single element, which is a tooltip rather than a layer. Coverage per view is reported, never gated |
| `pubsub` | a message bus modelled as a container · a queue or topic drawn as a plain box · a hop through one drawn as a solid line · "Sends messages to" and other labels that name no message · a channel with only one end drawn · a queue joining two systems with no declared owner |
| `tools/reading-aids` | nothing on its own — it *measures* which of the keys the renderer advertises actually do something in your export, and refuses to call a key dead when the embedding was what blocked it |
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

## Layers over a diagram, instead of another diagram

Chapter 12 answers "how do I show ownership without cluttering the diagram" by quoting Woods and
Rozanski: *"Rather than defining another viewpoint and creating another view, we need some way to
modify and enhance our existing views."* Ownership becomes a layer the reader toggles — Figure 12-1
over the landscape, Figure 12-2 for security on the statement store.

**Measured 2026-09-04, against two preregistered ways it could have been dead:** `p` does nothing in
the static export, and perspectives need the paid cloud workspace. **Neither fired.** In the offline
export `p` opens a picker built from the model, choosing one dims every element with no value for it,
and the tooltip carries the value.

```
perspectives {
    "Ownership" "Digital Channels — Internet Banking team"
    "Security"  "Server-side encryption; bucket policy denies public access."
}
```

**The rail lists them**, because a layer nobody can find is not one — a reader who does not know the
key never learns it exists. Clicking the lit layer turns it off.

```bash
npm run perspectives
```

**It reports coverage, and refuses exactly one thing.** When a layer is on, a dimmed element means
either "no owner" or "nobody wrote one down", and the tool draws both identically — so the check
prints the denominator (`Ownership Landscape 4 of 7 lit · dark: …`) and leaves the judgement to a
reader. The one refusal is a perspective on a single element in the whole workspace: toggling that
dims everything but one box, which is a tooltip wearing a layer's clothes. It fired on this repo's
first draft, where Security sat on the statement store alone.

**Partial coverage is deliberately not refused.** In the bank's landscape the three people carry no
ownership and correctly dim; a rule demanding every element would refuse the book's own figure.

**`pubsub` accepts an ownership perspective** as the answer to its cross-system queue rule — chapter
11 asks who owns the queue and chapter 12 says where that answer goes, so demanding a group or a tag
would refuse the model that answers it the way the same book recommends.

## The keys the viewer advertises

The exported site opens with a panel listing nine things to press. That list is the renderer's, not
your workspace's, so it promises the same nine to every repo — and a key can be inert for reasons
that are about your model: nothing for `d` to reveal, no perspectives for `p` to layer.

```bash
npm run serve &        # then, in another shell
npm run aids
```

**Measured by hand on the bank's export, 2026-09-04**, which is where the tool's three states come from:

| key | verdict | reading |
|---|---|---|
| `d` descriptions | **WORKS** | 0 → 12 description texts visible, and back |
| `m` metadata | **WORKS** | 2 → 21 metadata texts visible, and back |
| `Space` quick nav | **INERT** | 682 visible elements before and after; nothing appeared |
| `f` full screen | **UNEVALUABLE** | `requestFullscreen()` throws "Permissions check failed" when called *directly*, so the refusal is the embedding, not the export |
| `t` tooltips | **UNEVALUABLE** | a tooltip was seen rendering in this same export; pressing `t` changed no measurable state |

**The control is what makes `f` honest.** Without calling `requestFullscreen()` directly, a null
`fullscreenElement` after pressing `f` reads as "the export ignores it" — and that would have been
published as a finding about somebody else's software.

**A toggle that latches is UNEVALUABLE, not WORKS.** If `d` turned descriptions on and a second press
did not turn them off, the reader could not get back to the diagram they had.

**The wrapper used to withhold full screen.** An iframe refuses it unless the embedder says so, so a
reader would press the key the welcome panel advertised and conclude the tool was broken when it was
`viewer.html`. `test-viewer` now refuses any iframe that does not pass it through.

## The diagram key

Chapter 10 is unusually direct, and the rule is two-sided in its own words: *"Notation that is used to
differentiate elements and relationships (e.g., shapes, colors, line styles, icons) is described with
a diagram key"*, and *"include any line styles, colors, and arrowheads in your diagram key"*.

**Measured 2026-09-04** against the preregistered ways this could be dead — the key lists shapes the
diagram does not use, or omits ones it does. **Neither fired.** `i` opens a key built per view: the
bank's container view lists Boundary, Container, Container Data Store, Person, Software System
Existing System and one Relationship; the payments container view lists **Container Channel** and
**both** line styles, and does not list Existing System, which that model has none of.

```bash
npm run key
```

So what is left to check is ours — the half the renderer cannot see. The key explains styles that
*exist*; it cannot tell you an element carries a tag your theme never styled.

**It found one on this repo.** Deployment nodes were unstyled, so both deployment plates drew them in
the renderer's default grey, competing with the elements inside them. They are a frame now — no fill,
a light stroke — which also keeps the palette honest: hue means ownership, and where a box runs is
not a claim about who owns it.

**And it found a defect in itself.** The unused-palette-row rule first asked "does any view draw this
tag" of one workspace at a time, which reported the bank's `Existing System` as unused while payments
draws it, and payments' `Channel` and `Asynchronous` as unused while the bank has no queues. Three
findings, all false, all from the right question against the wrong denominator. One theme serves every
workspace, so the tags are unioned across all of them before the palette is judged.

## Why, not just what

Chapter 12 puts it in one sentence: the C4 views *"show the outcome of the decision-making process.
The diagrams don't tell you why those decisions were made."* Its recommendation is a collection of
architecture decision records beside them.

```
!adrs adrs                 # beside the workspace
container "Checkout" {
    !adrs adrs-checkout    # or beside the element it governs
}
```

**Measured 2026-09-04, and this is the checkpoint where a preregistered death FIRED.**

| claim | verdict |
|---|---|
| `!adrs` reaches `workspace.json` | **true** — every record, in full, at both scopes |
| a decision links to the element it governs | **true in the model** — nested under that element, not an `elementId` field |
| `!adrs` content survives the static export | **FALSE** — the site's bundle carries `documentation: {}`, zero decisions at either scope |

So the panel is ours, which the plan preregistered as the fallback. `architecture/viewer.html` reads
the records out of `workspace.json` — the file that still has them — and the rail gains a **Why**
branch. A decision scoped to a container also appears on that container's own row, so the reasoning
is reached from the element it governs rather than from a list.

```bash
npm run why
```

**The check guards what a panel cannot** — whether the decisions are worth reaching. A record with no
status reads as Accepted to anyone skimming; one governing an element no view draws can only be found
by reading the DSL, which is the opposite of putting it beside the diagram; and a `Superseded` record
naming no successor tells a reader the rule is dead but not what replaced it.

## What a pull request shows

A one-line model change should read as a one-line diff. **Measured 2026-09-05**, by renaming one
container in the payments model and re-exporting:

| file | changed | longest line |
|---|---|---|
| `workspace.dsl` | 1 line | 137 chars — readable |
| `workspace.json` | 1 line | 1,942 chars |
| `site/workspace.js` | 1 line | **9,684 chars, the whole file, rewritten end to end** |

**The units matter.** By lines the diff was 3 and the model's own change was one of them. By bytes
the readable part was 137 characters against roughly 11.6 KB of generated churn — the word-diff of
that single bundle line alone runs to 19,588 bytes. A reviewer reads a page, and a page with a
rewritten base64 blob on it is a page nobody reads.

**The fix is not a smaller diff, it is no diff.** 8.3 MB across 68 tracked files — a vendored jQuery,
lodash, backbone, JointJS, bootstrap and eleven font files — all reproduced by one
`structurizr-cli export -f static`. They are ignored and untracked now, and the same rename lands as
**2 files, +2/−2, both readable**.

```bash
npm run check     # includes checks/derived.mjs
```

**`workspace.json` stays tracked on purpose.** It is derived too, but the checks and the wrapper read
it, it is pretty-printed, and its diff is legible. The criterion is not "derived" — it is derived,
unreadable and large — and that judgement lives in one list in `checks/derived.mjs` rather than in a
rule anyone could infer.

**After cloning, export before you serve:** the site is no longer in the repo, and the README's flow
above already builds it.

## Which boxes are the proposal

A diagram of a system you are extending draws two kinds of box identically: the parts that already
ship and the parts you are asking for. A reader cannot tell them apart, so a proposal reads as a
description of something that exists.

```
component "Injection scorer" "..." "dsh-session-telemetry" {
    tags "Modified"          # a rule in an extension point that ships EMPTY
    !adrs adrs-scorer        # and the decision that says so
}
component "Chain invariant" "..." "dsh-invariants" {
    tags "Proposal"          # a component the harness has no seat for
    !adrs adrs-invariant
}
```

**Three states, because two would merge the cheap half into the expensive one.** In MCP-Guard the
OTLP exporter ships unmodified, the injection scorer is a new rule in a waterfall that ships empty,
and the chain invariant is a new companion. Those cost very different amounts to land.

**It is the STROKE, not the fill, and that is a ruling.** ADR 0002 spends hue on ownership, and
ch10's rule is that a colour encodes a dimension the reader cannot already read off the page — a
second meaning in the same channel makes both unreadable. Delivery state took the stroke: one amber
hue so it reads as one dimension, with lightness and width carrying the degree.

| state | stroke | on the canvas | greyscale L |
|---|---|---|---|
| ships as-is | the element's own | — | — |
| `Modified` | `#ffb454` amber, width 4 | 9.06:1 | 0.545 |
| `Proposal` | `#ff2fd0` neon pink, width 6 | 5.00:1 | 0.278 |

**And the box says which in words.** A stroke colour only signals to a reader who has been told what
it means, so a marked element also carries `proposed — hover for details` or `modified — hover for
details` at the head of its description — the one field the renderer prints inside the box. The
wording lives in the theme's `deliveryLabels`, and `delivery` refuses a marked box that does not
carry it.

Both clear the 3.0 floor, and they differ in lightness as well as hue, so the distinction survives
colour vision deficiency and a black-and-white printer the same way the ownership ramp does.

```bash
npm run proposals
```

**The colour is not the rule that matters.** A box marked `Proposal` with nothing saying what it adds
is a claim with no argument, and the diagram is where a reader goes looking — so a marked element
must be governed by a decision, which is ch12's own mechanism and already checked. The vocabulary is
the theme's: a repo that calls its states something else edits `deliveryStates` and both the styling
and the check follow.

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
