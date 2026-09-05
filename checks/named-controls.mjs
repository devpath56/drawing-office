/**
 * NAMED-CONTROLS — a control the prose promises must exist in the model.
 *
 * MEASURED 2026-09-05. The No-Leak-MCP proposal names three controls and calls one of them "the kill
 * point": an injection-signal scorer, a payload-compose guard, and an exfiltration-chain invariant.
 * The model drew TWO. The guard — the only one that stops anything, the one the whole defence rests
 * on — existed as a phrase inside a container's description and nowhere else. Eight checks were
 * green: every one of them judges what IS drawn, and none asks whether what was PROMISED is.
 *
 * The operator found it by looking at the deployment view and asking where the guard was.
 *
 * SO THE POPULATION IS THE PROSE, WHICH IS THE WHOLE IDEA. Every other check in this repo takes the
 * model as its universe and can therefore only ever find faults INSIDE it. A promise made in a
 * document and never modelled is invisible to all of them by construction — the diagram is complete
 * with respect to itself. This one reads the document.
 *
 * HOW A CONTROL IS RECOGNISED, and it is deliberately narrow: a markdown table row whose first cell
 * is bold. That is the shape proposals in this family use for a control table, it is cheap to write
 * on purpose, and a looser rule — every bold phrase, say — would drown the finding in prose. A
 * document with no such table is ABSENT, not clean.
 *
 * WHAT IT CANNOT DO, stated rather than discovered: it matches on NAME. A control renamed between
 * the prose and the model reads as missing, and a control modelled under a different name reads as
 * missing too. That is a false positive a human resolves in one edit, and the alternative — fuzzy
 * matching — turns a precise question into a guess.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE · ABSENT when the document names no controls
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { elements as modelElements } from './model.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'ABSENT', 'UNEVALUABLE']);

/** A bold first cell in a markdown table row is a named thing the document is promising. */
export const ROW = /^\s*\|\s*\*\*([^*|]+)\*\*\s*\|/gm;

/** A table whose HEADER names a Control column. Any other table is about something else. */
export const CONTROL_HEADER = /^\s*\|[^|\n]*\bcontrols?\b/i;

/**
 * THE POPULATION IS A CONTROL TABLE, NOT EVERY TABLE, and the first draft did not say so.
 *
 * Run against the live proposal it reported "Delivery + hosting" and "Realtime state" as unmodelled
 * controls. They are rows of the three-sponsor plane table — a different table, about which vendor
 * carries which plane, with bold first cells because that is how markdown emphasises a column. The
 * finding was true of the regex and false of the document.
 *
 * A table qualifies when its header row names a Control column. That is how a proposal in this
 * family writes one, it is one line to satisfy deliberately, and the alternative — every bold cell
 * in the file — buries a real omission under prose formatting.
 */
export function named(text) {
  const lines = String(text ?? '').split('\n');
  const out = [];
  let inControlTable = false;
  for (const line of lines) {
    const isRow = /^\s*\|/.test(line);
    if (!isRow) { inControlTable = false; continue; }
    if (CONTROL_HEADER.test(line)) { inControlTable = true; continue; }
    if (!inControlTable) continue;
    const m = /^\s*\|\s*\*\*([^*|]+)\*\*\s*\|/.exec(line);
    const n = m?.[1]?.trim();
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * THE HEAD NOUN IS THE MATCH, and a substring was not enough.
 *
 * The first draft asked whether either name contained the other, and reported all three live
 * controls as missing: the proposal writes "Injection-Signal scorer" and the model says "Injection
 * scorer"; "Exfiltration-Chain invariant" against "Chain invariant". Neither contains the other, and
 * both pairs plainly name one thing. A rule that reports three false findings on a correct model is
 * a rule nobody runs twice.
 *
 * So the comparison is on the last word — scorer, guard, invariant — which is the noun a control
 * family is actually named by, with the whole-string containment kept as the stronger path.
 *
 * THE TRADE, stated: two controls sharing a head noun ("compose guard", "egress guard") are
 * indistinguishable here, and one modelled satisfies both. That is a miss. It is the right way round
 * against the alternative — a stricter rule fires on correct models until it is switched off, and
 * takes its true positives with it.
 */
export const head = (s) => String(s ?? '').toLowerCase().trim().split(/[\s\-·]+/).filter(Boolean).pop() ?? '';

export function inspect(controls, elements) {
  if (!controls.length) return { state: 'ABSENT', why: 'the document names no controls in a table', findings: [], controls: 0 };
  /* AN UNNAMED ELEMENT MATCHES NOTHING, and leaving it in made this check answer "clean" to every
     question ever asked of it. Deployment instances carry no name of their own, so the list held
     empty strings, and `promised.includes('')` is TRUE for every promise. The red proof caught it:
     run against the model from BEFORE the guard was added, the check said clean about the very
     defect it was written for. A filter that admits the empty string is not a filter. */
  const names = elements.map((e) => String(e.name ?? '').toLowerCase().trim()).filter(Boolean);
  const findings = [];
  for (const c of controls) {
    const want = c.toLowerCase();
    const noun = head(c);
    if (names.some((n) => n.includes(want) || want.includes(n) || (noun && n.includes(noun)))) continue;
    findings.push({
      rule: 'promised-and-not-modelled',
      where: c,
      why: 'the document names this control and no element in the model carries the name, so every check '
         + 'in this repo passes over a thing the project says it is building — the diagram is complete '
         + 'with respect to itself and silent about the promise',
    });
  }
  return { state: findings.length ? 'findings' : 'clean', findings, controls: controls.length };
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  const root = flag('--root', HERE);

  if (argv.includes('--negative')) {
    let ok = 0;
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 220)}`}`); if (pass) ok++; };
    const doc = [
      '| Control | dsh seam | Catches |',
      '|---|---|---|',
      '| **Injection-Signal scorer** | telemetry | patterns |',
      '| **Payload-Compose guard** | ctx.tools.guard | the kill point |',
      '| **Exfiltration-Chain invariant** | dsh-invariants | secret in a later URL |',
      '',
      '| Plane | Sponsor | Track |',
      '|---|---|---|',
      '| **Delivery + hosting** | Render | workflows |',
      '| **Realtime state** | Convex | multiplayer |',
    ].join('\n');
    const els = (...ns) => ns.map((n, i) => ({ id: String(i), name: n }));

    /* BOTH OF THESE WERE FOUND BY THE RED PROOF, not by reading. Run against the model from before
       the guard was added, the first draft said CLEAN about the very defect it was written for. */

    /* ONE: an unnamed element matched everything. Deployment instances carry no name, so the list
       held empty strings and `promised.includes('')` is true for every promise. */
    say('an unnamed element matches nothing — an empty name is not a match for every control',
      inspect(['Payload-Compose guard'], [{ id: '1', name: null }, { id: '2', name: '' }]).findings.length === 1,
      inspect(['Payload-Compose guard'], [{ id: '1', name: null }]).findings.map((f) => f.where));

    /* TWO: every bold first cell was read as a control, so the sponsor-plane table became three
       false findings about a document that never promised them as controls. */
    say('only a table whose header names a Control column is read',
      JSON.stringify(named(doc)) === JSON.stringify(['Injection-Signal scorer', 'Payload-Compose guard', 'Exfiltration-Chain invariant']), named(doc));
    say('a second table with bold first cells is not mistaken for controls',
      !named(doc).includes('Delivery + hosting'), named(doc));

    say('a document naming three controls finds three', named(doc).length === 3, named(doc));
    say('and it reads the bold cell, not the whole row',
      named(doc)[1] === 'Payload-Compose guard', named(doc));

    /* THE DEFECT, REPLAYED: the model drew the scorer and the invariant and not the guard. */
    const two = els('Injection scorer', 'Chain invariant', 'OTLP exporter');
    say('the incident fires — a control named in the prose and absent from the model',
      inspect(named(doc), two).findings.some((f) => /guard/i.test(f.where)), inspect(named(doc), two).findings.map((f) => f.where));
    say('and it names ONLY the missing one, not the two that are there',
      inspect(named(doc), two).findings.length === 1, inspect(named(doc), two).findings.map((f) => f.where));

    const three = els('Injection scorer', 'Payload-compose guard', 'Chain invariant');
    say('with all three modelled it is clean', inspect(named(doc), three).state === 'clean', inspect(named(doc), three).findings);

    /* THE MATCH IS ON NAME AND IS DELIBERATELY LOOSE IN ONE DIRECTION: the model may say more. */
    say('a model element whose name CONTAINS the promised control counts',
      inspect(['guard'], els('Payload-compose guard')).state === 'clean', 'contains');
    say('and a promised name that contains the element name counts too, so a shortened box is not a miss',
      inspect(['Payload-Compose guard'], els('guard')).state === 'clean', 'contained');
    say('case does not decide it', inspect(['PAYLOAD-COMPOSE GUARD'], els('payload-compose guard')).state === 'clean', 'case');

    /* THE TWO NON-ANSWERS. */
    say('a document with no control table is ABSENT, not clean',
      inspect(named('# just prose\n\nno tables here'), three).state === 'ABSENT', named('# just prose'));
    say('a bold cell that is not first in its row is not a control',
      named('| seam | **bold second** | x |').length === 0, named('| seam | **bold second** | x |'));
    say('and the report says how many controls it judged, so clean is not empty',
      inspect(named(doc), three).controls === 3, inspect(named(doc), three).controls);

    console.log(`\n${ok} of 14 held`);
    process.exit(ok === 14 ? 0 : 1);
  }

  /* THE DOCUMENT: any markdown at the root of the inspected tree that carries a control table. */
  const docs = fs.existsSync(root)
    ? fs.readdirSync(root).filter((f) => f.endsWith('.md')).map((f) => path.join(root, f))
    : [];
  const dir = path.join(root, 'architecture');
  const models = fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())
        .map((d) => path.join(dir, d.name, 'workspace.json')).filter((f) => fs.existsSync(f))
    : [];
  if (!models.length) { console.log('UNEVALUABLE — no exported workspace.json found; export the DSL first'); process.exit(3); }

  const elements = [];
  for (const f of models) {
    try { elements.push(...modelElements(JSON.parse(fs.readFileSync(f, 'utf8')))); }
    catch (e) { console.log(`UNEVALUABLE — ${f} does not parse: ${e.message}`); process.exit(3); }
  }

  let bad = 0, judged = 0;
  for (const d of docs) {
    const controls = named(fs.readFileSync(d, 'utf8'));
    if (!controls.length) continue;
    judged++;
    const r = inspect(controls, elements);
    console.log(`\n  named-controls · ${path.basename(d)} · ${r.controls} promised`);
    for (const f of r.findings) { bad++; console.log(`    FAIL ${f.rule}\n         ${f.where}\n         ${f.why}`); }
    if (!r.findings.length) console.log('    every control the document names exists in the model');
  }
  if (!judged) { console.log('\n  named-controls · ABSENT — no markdown at this root carries a control table, so there is no promise to check'); process.exit(0); }
  console.log(`\n  ${bad} finding(s)`);
  process.exit(bad ? 1 : 0);
}
