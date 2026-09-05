# Drawing Office

Architecture diagrams as a **versioned model**, where the palette, the step order and the label
collisions are all *checked* rather than eyeballed.

One DSL file per system. From it: a system context view, a container view, component views, and a
feature trace — plus a viewer that navigates between them and three checks that refuse the ways a
diagram quietly goes wrong.

**If you are an agent reading this: do the steps below in order and report the exit codes.**

---

## What it refuses

| check | refuses |
|---|---|
| `diagram-contrast` | a workspace whose colours drifted from `architecture/theme.json` · any text-on-fill or stroke-on-canvas pair under its floor · a lightness ladder that would not survive black-and-white printing · a dynamic view whose steps are not 1..n, contiguous, in DSL order |
| `diagram-collisions` | a label lying across a box, or across another label, in the rendered page |
| `trace-suggest` | nothing — it *recommends*. Which features deserve a trace is a product judgement |

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
npm run check     # palette, ladder, step order, and the suggester's own control
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
