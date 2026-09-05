/**
 * READING AIDS — which of the viewer's advertised keys actually do something in YOUR export.
 *
 * WHY THIS IS A TOOL AND NOT A CLAIM. The exported site opens with a welcome panel listing nine
 * things a reader can press. That list is written by the renderer, not by your workspace, so it
 * promises the same nine to every repo — and a key can be inert here for reasons that have nothing
 * to do with the renderer: a model with no descriptions has nothing for `d` to reveal, a workspace
 * with no perspectives has nothing for `p` to layer. Telling a reader "press t for tooltips" when
 * nothing happens is worse than saying nothing, so this measures rather than repeats.
 *
 * MEASURED BY HAND FIRST, 2026-09-04, on the bank's own export, and the numbers are why the three
 * states below are three rather than two:
 *
 *   d  descriptions  WORKS      · 0 → 12 description texts became visible, and back
 *   m  metadata      WORKS      · 2 → 21 metadata texts became visible, and back
 *   Space quick nav  INERT      · no element appeared, no element changed, 682 visible before and after
 *   f  full screen   UNEVALUABLE· document.fullscreenEnabled is true and requestFullscreen() throws
 *                                 "Permissions check failed" when called DIRECTLY, so the refusal is
 *                                 the embedding, not the export. A probe that cannot distinguish
 *                                 those two must say so.
 *   t  tooltips      UNEVALUABLE· a tooltip was seen rendering in this same export earlier the same
 *                                 session, so it is not inert; but pressing t changed no measurable
 *                                 state here. Not ruled either way.
 *
 * THE CONTROL IS THE PART THAT MAKES `f` HONEST. Without calling requestFullscreen() directly, a
 * null fullscreenElement after pressing f reads as "the export ignores f" — which would have been
 * published as a finding about somebody else's software. Every key that can be blocked by the
 * embedding gets a control that tries the same thing without the key.
 *
 * exit 0 measured · 1 an advertised key is INERT · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['WORKS', 'INERT', 'UNEVALUABLE']);

/**
 * The aids, each with the measurement that decides it. `signal` runs in the page and returns a
 * number or a boolean; the key WORKS when pressing it changes that reading and pressing it again
 * puts it back, which is stricter than "something changed" and rules out a one-way side effect.
 */
export const AIDS = Object.freeze([
  { key: 'd', name: 'descriptions', signal: `visible('structurizrDescription')`, reversible: true },
  { key: 'm', name: 'metadata', signal: `visible('structurizrMetaData')`, reversible: true },
  { key: ' ', name: 'quick navigation', label: 'Space', signal: `shown()`, reversible: false },
  { key: 'i', name: 'diagram key', signal: `shown()`, reversible: false },
  { key: 'f', name: 'full screen', signal: `!!document.fullscreenElement`, reversible: false, blockable: 'fullscreen' },
]);

/* One page-side helper set, injected once, so every signal is measured the same way. */
export const PROBE = `
  window.visible = (cls) => {
    let n = 0;
    for (const t of document.querySelectorAll('svg text.' + cls)) {
      try { if (getComputedStyle(t).display !== 'none' && t.getBBox().width > 0) n++; } catch {}
    }
    return n;
  };
  /* HOW MANY THINGS ARE ON SCREEN. A key that opens a panel changes this; one that does nothing
     does not. Counted rather than looked for by name, because a panel's id is the renderer's
     business and would be one more thing this file claims to know about somebody else's code. */
  window.shown = () => [...document.querySelectorAll('body *')].filter((e) => e.offsetParent !== null).length;
`;

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

  if (argv.includes('--negative')) {
    /* NO BROWSER IS NEEDED TO PLANT THESE. What can go wrong in this file, as against in the page
       it drives, is the JUDGEMENT: turning three readings into one of three words. So the verdict
       is a pure function and the faults are planted against it. */
    let ok = 0;
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)}`}`); if (pass) ok++; };

    say('a reading that moves and comes back is WORKS', rule({ before: 0, after: 12, back: 0, reversible: true }) === 'WORKS', rule({ before: 0, after: 12, back: 0, reversible: true }));
    say('a reading that never moves is INERT', rule({ before: 682, after: 682, back: 682, reversible: false }) === 'INERT', rule({ before: 682, after: 682, back: 682, reversible: false }));
    say('a one-way change is WORKS when the aid is not a toggle', rule({ before: 682, after: 700, back: 700, reversible: false }) === 'WORKS', rule({ before: 682, after: 700, back: 700, reversible: false }));
    /* A TOGGLE THAT LATCHES IS NOT A WORKING TOGGLE, and calling it WORKS would hide a real defect:
       the reader presses it twice and cannot get back to the diagram they had. */
    say('a toggle that changes and does not come back is UNEVALUABLE, not WORKS', rule({ before: 0, after: 12, back: 12, reversible: true }) === 'UNEVALUABLE', rule({ before: 0, after: 12, back: 12, reversible: true }));
    /* THE ONE THAT MATTERS MOST: a key the embedding forbids is not a key the export ignores. */
    say('a key the embedding blocks is UNEVALUABLE, never INERT', rule({ before: false, after: false, back: false, reversible: false, blocked: true }) === 'UNEVALUABLE', rule({ before: false, after: false, back: false, reversible: false, blocked: true }));
    say('the same nothing WITHOUT a block is INERT', rule({ before: false, after: false, back: false, reversible: false, blocked: false }) === 'INERT', rule({ before: false, after: false, back: false, reversible: false, blocked: false }));

    console.log(`\n${ok} of 6 held`);
    process.exit(ok === 6 ? 0 : 1);
  }

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch {
    console.log('UNEVALUABLE — this measures a rendered page and playwright is not installed.');
    console.log('  npm i -D playwright && npx playwright install chromium');
    process.exit(3);
  }

  const target = argv.find((a) => !a.startsWith('--'));
  if (!target) { console.error('usage: node tools/reading-aids.mjs <http url to the site> [--view <key>]'); process.exit(2); }
  const view = flag('--view', null);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(view ? `${target}#${view}` : target, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(PROBE);

  console.log(`\n  reading aids · ${target}${view ? '#' + view : ''}`);
  let inert = 0;
  for (const aid of AIDS) {
    /* EVERY AID STARTS FROM THE SAME PLACE. State accumulates across key presses — measured the
       hard way by hand, where a d pressed earlier made a later reading meaningless — so the page is
       reloaded between aids rather than trusted to be where it was left. */
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(PROBE);
    await page.mouse.click(20, 20);

    const read = () => page.evaluate(`(() => (${aid.signal}))()`);
    const before = await read();
    await page.keyboard.press(aid.key === ' ' ? 'Space' : aid.key);
    await page.waitForTimeout(700);
    const after = await read();
    await page.keyboard.press(aid.key === ' ' ? 'Space' : aid.key);
    await page.waitForTimeout(700);
    const back = await read();

    /* THE CONTROL FOR A BLOCKABLE KEY, asked of the page directly. */
    let blocked = false;
    if (aid.blockable === 'fullscreen') {
      blocked = await page.evaluate(`(async () => {
        try { await document.documentElement.requestFullscreen(); } catch (e) { return true; }
        if (document.fullscreenElement) { await document.exitFullscreen(); return false; }
        return true;
      })()`);
    }

    const state = rule({ before, after, back, reversible: aid.reversible, blocked });
    if (state === 'INERT') inert++;
    const label = (aid.label || aid.key).padEnd(6);
    console.log(`    ${state.padEnd(12)} ${label} ${aid.name.padEnd(18)} ${JSON.stringify(before)} → ${JSON.stringify(after)} → ${JSON.stringify(back)}${blocked ? ' · the embedding refuses it, so this says nothing about the export' : ''}`);
  }

  await browser.close();
  console.log(`\n  ${inert} advertised key(s) do nothing here`);
  console.log('  UNEVALUABLE is not a failure: it means this probe could not separate "the export ignores it" from "the page was not allowed to"');
  process.exit(inert ? 1 : 0);
}

/**
 * THE JUDGEMENT, kept out of the browser so it can be planted against. Three readings in, one of
 * three words out.
 */
export function rule({ before, after, back, reversible, blocked = false }) {
  if (blocked) return 'UNEVALUABLE';
  const moved = JSON.stringify(after) !== JSON.stringify(before);
  if (!moved) return 'INERT';
  if (!reversible) return 'WORKS';
  return JSON.stringify(back) === JSON.stringify(before) ? 'WORKS' : 'UNEVALUABLE';
}
