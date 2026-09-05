#!/usr/bin/env node
/* diagram-collisions — a rendered diagram whose labels overprint each other, or cross a box they do
 * not belong to, is refused. Counted on the RENDERED SVG, never inferred from source.
 *
 *   node checks/diagram-collisions.mjs <file.html> [--json] [--allow <n>]
 *
 * WHY THIS EXISTS. 2026-09-03: a mermaid C4 sheet rendered with 6 label-over-label collisions and 3
 * labels crossing boxes, and mermaid-lint reported it clean. The lint reads grammar; nothing in the
 * loop read the picture. The operator saw it before any instrument did. This is the instrument.
 *
 * WHAT IT COUNTS, per drawing:
 *   textOverText     pairs of visible text boxes whose rectangles intersect
 *   textCrossingBox  a text that is neither inside any box nor clear of every box — it straddles an edge
 * A drawing with no text is UNEVALUABLE, never clean: an unrendered sheet must not pass by being empty.
 *
 * Exit 0 clean · 1 collisions above --allow (default 0) · 2 usage · 3 UNEVALUABLE (no drawing rendered) */
/* THE ONE MODULE OF THIS SET WITH A DEPENDENCY, and it says so rather than crashing. The palette
   check, the trace suggester and the viewer are node builtins and plain HTML; this one has to
   RENDER, so it needs a browser. Copied into a fresh repo it used to die with
   "Cannot find package 'playwright'" and a stack trace — which reads as the check being broken
   rather than as a missing install. A dynamic import turns that into an answer.

   IT ALSO DOES NOT NEED TO BE COPIED AT ALL: it takes a url, so one install can measure any repo's
   served site from wherever it already lives. */
let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  console.log('UNEVALUABLE — this check renders the page, so it needs playwright: npm i -D playwright && npx playwright install chromium');
  console.log('             or run it from a checkout that already has it — it accepts a url, so it does not have to live in this repo');
  process.exit(3);
}
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const flags = { json: false, allow: 0 };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') flags.json = true;
  else if (a === '--allow') flags.allow = Number(argv[++i] ?? 0);
  else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  else positional.push(a);
}
const target = positional[0];
/* A SERVED DIAGRAM IS A DIAGRAM. This took a local file only, which was right when the subject was
   a self-contained mermaid page and wrong the moment the subject became a Structurizr site: that
   site fetches its own workspace.js, so opening index.html from disk draws nothing and the honest
   verdict would have been UNEVALUABLE forever. A url is passed through untouched. */
const isUrl = /^https?:\/\//.test(String(target ?? ''));
if (!target || (!isUrl && !fs.existsSync(target))) { console.error('usage: node checks/diagram-collisions.mjs <file.html | http url> [--json] [--allow <n>]'); process.exit(2); }

export const STATES = Object.freeze(['clean', 'COLLIDES', 'UNEVALUABLE']);

/** Runs inside the page. Returns one row per `.drawing svg`, or per `svg` when the page has none. */
const MEASURE = () => {
  const inter = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const contains = (o, i) => i.left >= o.left && i.right <= o.right && i.top >= o.top && i.bottom <= o.bottom;
  const svgs = [...document.querySelectorAll('.drawing svg')];
  const pool = svgs.length ? svgs : [...document.querySelectorAll('svg')];
  return pool.map((svg, n) => {
    const texts = [...svg.querySelectorAll('text, foreignObject')].map((t) => ({ r: t.getBoundingClientRect(), s: (t.textContent || '').trim() })).filter((t) => t.r.width > 0 && t.s);
    const rects = [...svg.querySelectorAll('rect, path[data-shape], .node path')].map((r) => r.getBoundingClientRect()).filter((r) => r.width > 40 && r.height > 20);
    let textOverText = 0, textCrossingBox = 0; const examples = [];
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      /* TWO LABELS INSIDE ONE BOX ARE NOT A COLLISION. Measured 2026-09-04 against a Structurizr
         plate: 11 of 17 reported collisions were an element's NAME against its own [Type] line —
         two text nodes stacked inside the same rectangle, which is the notation working, not
         failing. A detector that cries on every element teaches its reader to ignore it, and the
         six real ones — a step label straddling a box edge — were sitting underneath that noise. */
      const shared = rects.find((b) => contains(b, texts[i].r) && contains(b, texts[j].r));
      if (!shared && inter(texts[i].r, texts[j].r)) { textOverText++; if (examples.length < 5) examples.push(`${texts[i].s.slice(0, 30)} × ${texts[j].s.slice(0, 30)}`); }
    }
    for (const t of texts) {
      const inside = rects.some((r) => contains(r, t.r));
      const crossing = rects.some((r) => inter(r, t.r) && !contains(r, t.r));
      if (!inside && crossing) { textCrossingBox++; if (examples.length < 8) examples.push(`crosses a box: ${t.s.slice(0, 40)}`); }
    }
    return { sheet: n + 1, texts: texts.length, boxes: rects.length, textOverText, textCrossingBox, examples };
  });
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(isUrl ? target : pathToFileURL(path.resolve(target)).href, { waitUntil: 'networkidle' });
/* The sheets render after a script loads mermaid from a CDN. Wait for a rendered state or give up
 * after 20s and report UNEVALUABLE — a page that never drew is not a clean page. */
/* Two renderers, two ready signals: the mermaid pages mark themselves rendered, and a Structurizr
   site simply has an svg inside #diagram-canvas once its layout has run. Waiting for either keeps
   one instrument over both rather than a second module for the second grammar. */
try { await page.waitForSelector('[data-state="rendered"] svg, .drawing svg, #diagram-canvas svg', { timeout: 20_000 }); } catch { /* fall through to the empty check */ }
await page.waitForTimeout(900);
const rows = await page.evaluate(MEASURE);
await browser.close();

const drawn = rows.filter((r) => r.texts > 0);
const total = drawn.reduce((n, r) => n + r.textOverText + r.textCrossingBox, 0);
const state = !drawn.length ? 'UNEVALUABLE' : total > flags.allow ? 'COLLIDES' : 'clean';

if (flags.json) { console.log(JSON.stringify({ state, target, allow: flags.allow, total, rows }, null, 2)); }
else {
  console.log(`\n  diagram-collisions · ${target}`);
  for (const r of rows) console.log(`    sheet ${r.sheet}  ${String(r.texts).padStart(4)} texts · ${String(r.boxes).padStart(3)} boxes · ${r.textOverText} over text · ${r.textCrossingBox} crossing a box${r.examples.length ? '\n      ' + r.examples.join('\n      ') : ''}`);
  console.log(`\n  ${state}${state === 'UNEVALUABLE' ? ' — no drawing rendered any text; an empty sheet is not a clean one' : ` — ${total} collision(s), allowed ${flags.allow}`}`);
}
process.exit(state === 'clean' ? 0 : state === 'COLLIDES' ? 1 : 3);
