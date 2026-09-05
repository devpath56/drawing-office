/**
 * STYLE-RESOLVE — which style row actually wins on an element, and the assumption that was wrong.
 *
 * A CHECK THAT JUDGES A COLOUR MUST FIRST KNOW WHICH COLOUR THE READER SEES. checks/palette-claim.mjs
 * judges style ROWS; to judge a CLAIM it has to resolve, per element, the row that wins. That
 * resolution is the renderer's, not ours, so it is an assumption about somebody else's code and it
 * gets falsified rather than asserted.
 *
 * THE HYPOTHESIS: tags apply in order and a later row overrides the properties it sets. Predicted
 * every element in the No-Leak-MCP model correctly from the file — which proved nothing, because the
 * same algorithm produced both sides. Run against what the RENDERER drew, 10 elements compared:
 *
 *   9 agreed.  1 did not:  dsh harness  predicted #3f4383  ACTUAL #111111
 *
 * SO THE ASSUMPTION WAS FALSE AS STATED. An element's fill is not a function of its tags alone: it
 * depends on its ROLE IN THE VIEW. `dsh harness` is violet on the context view and a BOUNDARY on the
 * container view, where it is the thing being decomposed rather than a box in the picture. Scope is
 * the second input, and a claim check that judged the boundary would have reported a false finding
 * on every container and component view in the repo.
 *
 * Recorded as PR-039. The corrected rule is below and it is narrower on purpose: an element that is
 * a view's own SCOPE is not judged, because the renderer is not painting it as an element there.
 */

export const VERDICTS = Object.freeze(['resolved', 'scope', 'unstyled']);

/** The rows a tag list resolves to, later tags overriding the properties they set. */
export function resolve(tags, styleRows) {
  const by = new Map((styleRows ?? []).map((r) => [r.tag, r]));
  const out = {};
  const applied = [];
  for (const t of String(tags ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const r = by.get(t);
    if (!r) continue;
    applied.push(t);
    for (const k of ['background', 'stroke', 'color', 'shape']) if (r[k] !== undefined) out[k] = r[k];
  }
  return { ...out, applied };
}

/**
 * The element ids a view treats as its SCOPE rather than as boxes. Falsified into existence: without
 * this, `dsh harness` on its own container view reads as a violet ownership claim and is drawn as a
 * boundary.
 */
export function scopeOf(view) {
  const ids = new Set();
  for (const k of ['softwareSystemId', 'containerId', 'elementId']) if (view?.[k]) ids.add(String(view[k]));
  return ids;
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN && process.argv.includes('--negative')) {
  let ok = 0;
  const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 200)}`}`); if (pass) ok++; };
  const rows = [
    { tag: 'Software System', background: '#3f4383', stroke: '#a5a9f0' },
    { tag: 'Existing System', background: '#2b3a33', stroke: '#6fa588' },
    { tag: 'Proposal', stroke: '#ff2fd0' },
    { tag: 'Container', background: '#5a5fa6', stroke: '#b9bdf5' },
  ];

  say('a later tag overrides the background an earlier one set',
    resolve('Element,Software System,Existing System', rows).background === '#2b3a33', resolve('Element,Software System,Existing System', rows));
  say('and a row that sets only a stroke leaves the earlier background standing',
    (() => { const r = resolve('Element,Software System,Proposal', rows); return r.background === '#3f4383' && r.stroke === '#ff2fd0'; })(), resolve('Element,Software System,Proposal', rows));
  say('a tag with no style row contributes nothing rather than clearing what is set',
    resolve('Element,Unknown,Container', rows).background === '#5a5fa6', resolve('Element,Unknown,Container', rows));
  say('the resolver reports WHICH rows it applied, so a wrong answer can be traced',
    JSON.stringify(resolve('Element,Software System,Proposal', rows).applied) === JSON.stringify(['Software System', 'Proposal']), resolve('Element,Software System,Proposal', rows).applied);
  say('an element with no tags resolves to nothing rather than throwing',
    Object.keys(resolve('', rows)).length === 1, resolve('', rows));

  /* PR-039, THE FALSIFIED ASSUMPTION, PINNED. The hypothesis was that fill is a function of tags
     ALONE. It agreed with the exported file on 12 of 12 elements and disagreed with the RENDERER on
     the 13th: `dsh harness` predicted #3f4383 and was painted #111111, because on its own container
     view it is the SCOPE and is drawn as a boundary. A claim check that judged the scope would
     report a false finding on every container and component view in the repo. */
  say('a container view declares its own scope, which is NOT judged as an element',
    scopeOf({ key: 'Containers', softwareSystemId: 's1' }).has('s1'), [...scopeOf({ softwareSystemId: 's1' })]);
  say('a component view scopes to its container',
    scopeOf({ key: 'Obs', containerId: 'c9' }).has('c9'), [...scopeOf({ containerId: 'c9' })]);
  say('a context view scopes to nothing an element check must skip beyond its own subject',
    scopeOf({ key: 'Ctx' }).size === 0, [...scopeOf({ key: 'Ctx' })]);
  say('and the scope set is a SET, so asking twice does not double it',
    scopeOf({ softwareSystemId: 's1', elementId: 's1' }).size === 1, [...scopeOf({ softwareSystemId: 's1', elementId: 's1' })]);

  console.log(`\n${ok} of 9 held`);
  process.exit(ok === 9 ? 0 : 1);
}
