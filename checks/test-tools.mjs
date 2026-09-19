/**
 * CONTROL for the modules in tools/ that have no control of their own.
 *
 * WHY ONE FILE FOR FOUR MODULES. prongs/deep-check.mjs recognises a control by IMPORT or by a quoted
 * path, deliberately not by a `test-<basename>` convention, precisely so one control may guard
 * several modules. Run against these four it returned exit 3 four times — twice "NO CONTROL FILE"
 * and twice "ZERO PRODUCTION importers and no entry point — exists and cannot fire" — and a census
 * that refuses to be evidence is the correct answer to an untested module, not a formality.
 *
 * WHAT IT ASSERTS, and what it deliberately does not. Every module here has its own --negative with
 * its own planted faults; restating those would be two homes for one fixture. This runs each of them
 * as a subprocess and asserts the exit code, then adds the assertions that need an import: the
 * declared states, and the pure functions that have no browser in them.
 *
 * THE TWO BROWSER MODULES ARE NOT DRIVEN HERE. diagram-export and diagram-collisions render a page,
 * so a control that ran them would need a server and a browser and would fail for reasons that are
 * about the machine rather than the code. What is asserted instead is the half that is pure — the
 * ground rewrite, the slug, the state vocabulary — and the fact that each REFUSES legibly when
 * playwright is absent, which is the failure a new repo actually hits.
 *
 * exit 0 all held · 1 something did not
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as animate from '../tools/trace-animate.mjs';
import * as suggest from '../tools/trace-suggest.mjs';
import { STATES as EXPORT_STATES, ground, canvasOf, slug } from '../tools/diagram-export.mjs';
import * as key from '../checks/diagram-key.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let bad = 0;
const ok = (n, c, saw) => { console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${c || saw === undefined ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 200)}`}`); if (!c) bad++; };

/* Each module's own planted faults, run through its own CLI so this cannot drift from them. */
const negative = (rel) => {
  try { return { code: 0, out: execFileSync('node', [path.join(ROOT, rel), '--negative'], { encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};
/* A THIRD VERDICT, BECAUSE A MISSING BROWSER IS NOT A FAILING MODULE. diagram-collisions plants
   its faults in a rendered page, so on a machine without playwright it exits 3 and says so — and
   this control called that FAIL, which would have taught its reader that a working check was broken.
   NOT-CHECKED is printed, counted separately, and never mistaken for a pass. */
let notChecked = 0;
for (const rel of ['tools/build.mjs', 'tools/trace-suggest.mjs', 'tools/trace-animate.mjs', 'tools/diagram-collisions.mjs', 'tools/reading-aids.mjs', 'checks/pubsub.mjs', 'checks/perspectives.mjs', 'checks/diagram-key.mjs', 'checks/decisions.mjs', 'checks/derived.mjs', 'checks/delivery.mjs', 'checks/test-viewer.mjs']) {
  const r = negative(rel);
  if (r.code === 3 && /playwright/i.test(r.out)) {
    notChecked++;
    console.log(`  NOT-CHECKED ${rel} — it renders a page and playwright is not installed here`);
    continue;
  }
  /* N of N, compared to itself: pinning a number turns a green control red the day a case is added. */
  ok(`${rel} holds every case it plants`, r.code === 0 && /(\d+) of \1 (held|refused)/.test(r.out), r.out.trim().split('\n').pop());
}

/* ── the pure halves ─────────────────────────────────────────────────────────────────────────── */

ok('trace-animate declares the states it returns', animate.STATES.includes('written') && animate.STATES.includes('ABSENT') && animate.STATES.includes('UNEVALUABLE'), animate.STATES);

const frames = animate.framesFor(
  { relationships: [{ id: 'r1', order: '1' }, { id: 'r2', order: '2' }] },
  new Map([['r1', { source: 'a', destination: 'b' }], ['r2', { source: 'b', destination: 'c' }]]),
);
ok('a frame reveals only what is new at its step', JSON.stringify(frames.frames.map((f) => f.elements)) === JSON.stringify([['a', 'b'], ['c']]), frames.frames);

const empty = suggest.suggest({ model: {}, views: {} });
ok('trace-suggest reports ABSENT on an empty model, never a silent pass', empty.state === 'ABSENT', empty);

/* THE GROUND REWRITE IS THE DEFECT THAT SHIPPED, so it is pinned. A fresh headless browser reports
   prefers-color-scheme: light, and the export baked background:#ffffff into a palette built for a
   dark canvas — the relationship labels went from 11.5:1 to about 1.3:1 in the file people were
   sent, while looking correct on screen. */
const white = '<svg xmlns="http://www.w3.org/2000/svg" style="background: #ffffff"><g/></svg>';
ok('an exported drawing is re-grounded on the theme canvas', /background: #1F2226/.test(ground(white, '#1F2226')), ground(white, '#1F2226').slice(0, 80));
ok('a drawing with no style attribute is left alone rather than corrupted', ground('<svg><g/></svg>', '#1F2226') === '<svg><g/></svg>', ground('<svg><g/></svg>', '#1F2226'));
ok('the canvas is read from the theme, and says where it came from', canvasOf(ROOT).from === 'architecture/theme.json' && /^#/.test(canvasOf(ROOT).canvas), canvasOf(ROOT));
ok('diagram-export declares the states it returns', EXPORT_STATES.includes('written') && EXPORT_STATES.includes('UNEVALUABLE'), EXPORT_STATES);

/* A DECLARED STATE NOTHING RETURNS IS DECORATION. diagram-key declared four and returned none until
   the review that added this row; the assertion is that the vocabulary and the code agree. */
ok('diagram-key returns a state from its own declared vocabulary', key.STATES.includes(key.inspect({ model: {}, views: {} }, { elements: [], relationships: [] }).state), key.inspect({ model: {}, views: {} }, { elements: [], relationships: [] }).state);

/* THE FILE NAME IS ONE DECISION. diagram-key reads the key SVGs diagram-export writes, and it kept
   its own copy of the naming rule which had already drifted by one replace — so a view key with a
   leading separator was written under one name and looked for under another. */
ok('the exported file name has one home, and a leading separator survives the round trip', slug('-Live') === key.keyFileSlug('-Live'), { writer: slug('-Live'), reader: key.keyFileSlug('-Live') });

/* ── the browser modules refuse legibly ──────────────────────────────────────────────────────── */

/* TWO ABSENCES, AND UNTIL 2026-09-19 THIS PLANTED ONLY ONE OF THEM.
   A renderer fails for the PACKAGE being missing, or for the BROWSER BINARY being missing. Different
   states, different fixes, and only the first was planted here — copy the module somewhere the
   package cannot resolve. This row was GREEN while `npm run check` on the very machine running it
   died mid-suite with "browserType.launch: Executable doesn't exist at …/chrome-headless-shell"
   over a Node stack trace, because tools/ guarded the import and left every launch bare.

   THE SECOND IS THE COMMON ONE. `npm install` brings the package; `npx playwright install chromium`
   is a separate step, so package-present-browser-absent is the state of every fresh clone — and the
   NOT-CHECKED branch above, written for exactly that machine, could never be reached because the
   module threw before it could exit 3. A declared state nothing can reach is not a state.

   IT IS PLANTED WITH PLAYWRIGHT'S OWN SWITCH. PLAYWRIGHT_BROWSERS_PATH is where it looks for
   binaries, so an empty directory is a machine with the package and no browser. Nothing is deleted
   and the outcome does not depend on what this machine happens to have installed. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'do-control-'));
const noBrowsers = fs.mkdtempSync(path.join(os.tmpdir(), 'do-no-browsers-'));
const render = (file, env) => {
  try { return { code: 0, out: execFileSync('node', [file, 'http://127.0.0.1:1/x.html'], { encoding: 'utf8', env: { ...process.env, ...env } }) }; }
  catch (e) { return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};
/* LEGIBLE IS ONE DEFINITION FOR BOTH ROWS: exit 3, the word playwright, and no stack trace. The
   third clause is the one that matters — a module can exit 3 AFTER printing a trace, and a reader
   who sees the trace has already concluded the check is broken. */
const legible = (r) => r.code === 3 && /playwright/i.test(r.out) && !/at Object\.|ERR_MODULE_NOT_FOUND|Node\.js v/.test(r.out);

for (const rel of ['tools/diagram-collisions.mjs', 'tools/diagram-export.mjs']) {
  /* tools/browser.mjs travels with it. It is where the answer lives, and a copy without it would
     fail for a missing relative import — a third thing, wearing the first one's clothes. */
  for (const f of [rel, 'tools/browser.mjs']) fs.copyFileSync(path.join(ROOT, f), path.join(tmp, path.basename(f)));
  const noPackage = render(path.join(tmp, path.basename(rel)));
  ok(`${rel} names the missing PACKAGE instead of throwing`,
     legible(noPackage) && /npm i -D playwright/.test(noPackage.out), noPackage.out.trim().split('\n')[0]);

  const noBinary = render(path.join(ROOT, rel), { PLAYWRIGHT_BROWSERS_PATH: noBrowsers });
  ok(`${rel} names the missing BROWSER instead of throwing`,
     legible(noBinary) && /installed but its browser is not/.test(noBinary.out), noBinary.out.trim().split('\n')[0]);
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.rmSync(noBrowsers, { recursive: true, force: true });

console.log(`\n${bad ? `${bad} FAIL` : 'all ok'}${notChecked ? ` · ${notChecked} NOT-CHECKED` : ''}`);
process.exit(bad ? 1 : 0);
