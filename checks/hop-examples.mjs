/**
 * HOP EXAMPLES — a trace told twice, and the two registers kept whole.
 *
 * WHAT IT IS FOR. A dynamic view's arrow labels are general statements: "a spec of four fields",
 * "the door assigns the id". They say what KIND of thing crosses each hop, and a reader who has
 * never seen one still cannot picture it. The operator's ruling (2026-09-07, on the factory's RAT
 * trace): keep the general statement, and let a key swap every label for the same hop told as one
 * real instance — the values from one run. The first draft was two views, and the rail then showed
 * two rows that said the same nine things.
 *
 * THE CONVENTION, which any workspace can adopt without telling the viewer anything:
 *
 *     dynamic production "RatAttack" "…" {
 *         properties {
 *             "drawing-office.example"   "PR-057 at k=3, 2026-09-07: one attack, 392 ms, FLIP to HELD"
 *             "drawing-office.example.1" "assumption: … · criterion: … · command: … · mode: …"
 *             "drawing-office.example.2" "approve-row-shape.mjs already existed; staged, not scaffolded"
 *         }
 *         agent -> probeDoorway "A spec of four fields: assumption, criterion, command, mode"
 *         …
 *
 * The number after the prefix is the HOP — the arrow's order in the view — because the DSL keeps
 * order unique and does not keep the relationship id unique (one model relationship may appear on a
 * trace twice). The unnumbered property names the instance, and the viewer's strip prints it so the
 * reader knows WHICH run they are looking at.
 *
 * WHY THE PROPERTY AND NOT A SECOND LABEL ON THE ARROW. The DSL refuses a block on a dynamic-view
 * relationship (measured 2026-09-07: `u -> a "general" { properties { … } }` fails to parse as "a
 * relationship … with technology { does not exist"), so a per-arrow property has nowhere to live.
 * View properties survive export and are what the viewer already reads for tooltips.
 *
 * WHAT IT REFUSES, and each is a plate that would lie:
 *   hop-without-arrow  an example numbered for a hop the view does not have: text nobody can reach
 *   hop-not-a-number   a suffix that is not a positive integer: the join is by hop, nothing else
 *   register-mixed     some hops carry an example and some do not: pressing E would show a plate
 *                      that is half instance, half generality, and the reader cannot tell which
 *                      arrows are which
 *   example-unnamed    examples with no drawing-office.example naming the instance: the strip would
 *                      say "told as the example" of nothing in particular
 *
 * WHAT IT REPORTS EITHER WAY: for every dynamic view, hops and examples, so a reader can see which
 * traces have a second register and which are told once. A workspace with no examples anywhere is
 * ABSENT, not clean — the toggle is dark there and this says so.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { projects } from './projects.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'ABSENT', 'UNEVALUABLE']);
export const EXAMPLE_PROPERTY = 'drawing-office.example';
export const EXAMPLE_PREFIX = 'drawing-office.example.';

/** inspect(ws) -> { state, rows, findings }. Pure. */
export function inspect(ws) {
  const rows = [];
  const findings = [];
  for (const v of ws?.views?.dynamicViews ?? []) {
    const hops = new Set((v.relationships ?? []).map((r) => String(r.order)));
    const props = v.properties ?? {};
    const examples = new Map();
    for (const [k, text] of Object.entries(props)) {
      if (!k.startsWith(EXAMPLE_PREFIX)) continue;
      const suffix = k.slice(EXAMPLE_PREFIX.length);
      if (!/^[1-9]\d*$/.test(suffix)) { findings.push({ rule: 'hop-not-a-number', view: v.key, why: `${k} does not end in a hop number` }); continue; }
      examples.set(suffix, String(text));
      if (!hops.has(suffix)) findings.push({ rule: 'hop-without-arrow', view: v.key, why: `${k} names hop ${suffix}, and the view has ${hops.size} hop(s)` });
    }
    const named = Object.prototype.hasOwnProperty.call(props, EXAMPLE_PROPERTY);
    const missing = [...hops].filter((h) => !examples.has(h)).sort((a, b) => Number(a) - Number(b));
    if (examples.size && missing.length) findings.push({ rule: 'register-mixed', view: v.key, why: `${examples.size} of ${hops.size} hops carry an example; hop(s) ${missing.join(', ')} do not` });
    if (examples.size && !named) findings.push({ rule: 'example-unnamed', view: v.key, why: `examples on ${examples.size} hop(s) and no ${EXAMPLE_PROPERTY} naming the instance` });
    rows.push({ view: v.key, hops: hops.size, examples: examples.size, named, name: named ? String(props[EXAMPLE_PROPERTY]) : null });
  }
  const any = rows.some((r) => r.examples > 0);
  if (!any && !findings.length) return { state: 'ABSENT', rows, findings, why: rows.length ? 'no dynamic view carries an example; every trace is told once' : 'no dynamic views' };
  return { state: findings.length ? 'findings' : 'clean', rows, findings };
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
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 300)}`}`); if (pass) ok++; };
    const build = (props) => ({ views: { dynamicViews: [{ key: 'T', properties: props, relationships: [{ id: '1', order: '1' }, { id: '2', order: '2' }, { id: '1', order: '3' }] }] } });
    const rules = (ws) => inspect(ws).findings.map((f) => f.rule);

    say('a trace told once is ABSENT, not clean and not a finding', inspect(build({})).state === 'ABSENT', inspect(build({})));
    const whole = build({ [EXAMPLE_PROPERTY]: 'run 1', [EXAMPLE_PREFIX + '1']: 'a', [EXAMPLE_PREFIX + '2']: 'b', [EXAMPLE_PREFIX + '3']: 'c' });
    say('every hop with an example and the instance named is clean', inspect(whole).state === 'clean', inspect(whole));
    say('the same relationship on two hops is two hops, joined by order', inspect(whole).rows[0].hops === 3, inspect(whole).rows[0]);
    const orphan = build({ [EXAMPLE_PROPERTY]: 'run 1', [EXAMPLE_PREFIX + '1']: 'a', [EXAMPLE_PREFIX + '2']: 'b', [EXAMPLE_PREFIX + '3']: 'c', [EXAMPLE_PREFIX + '9']: 'z' });
    say('an example for a hop no arrow has is caught', rules(orphan).includes('hop-without-arrow'), rules(orphan));
    const mixed = build({ [EXAMPLE_PROPERTY]: 'run 1', [EXAMPLE_PREFIX + '1']: 'a' });
    say('a view where only some hops carry an example is caught, and the missing hops are named', rules(mixed).includes('register-mixed') && /2, 3/.test(inspect(mixed).findings[0].why), inspect(mixed).findings);
    const unnamed = build({ [EXAMPLE_PREFIX + '1']: 'a', [EXAMPLE_PREFIX + '2']: 'b', [EXAMPLE_PREFIX + '3']: 'c' });
    say('examples with no instance named are caught', rules(unnamed).includes('example-unnamed'), rules(unnamed));
    const word = build({ [EXAMPLE_PROPERTY]: 'run 1', [EXAMPLE_PREFIX + 'one']: 'a' });
    say('a suffix that is not a hop number is caught', rules(word).includes('hop-not-a-number'), rules(word));
    console.log(`\n${ok} of 7 held`);
    process.exit(ok === 7 ? 0 : 1);
  }

  const found = projects(root);
  if (found.state !== 'found') { console.log(`${found.state} — ${found.why}`); process.exit(found.state === 'ABSENT' ? 0 : 3); }
  let bad = 0, any = false;
  for (const p of found.list) {
    let ws;
    try { ws = JSON.parse(fs.readFileSync(p.file, 'utf8')); } catch (e) { console.log(`  ${p.name}: UNEVALUABLE — ${e.message}`); bad++; continue; }
    const r = inspect(ws);
    console.log(`\n  ${p.name} · ${r.state}${r.why ? ' — ' + r.why : ''}`);
    for (const row of r.rows) console.log(`    ${row.view.padEnd(24)} ${row.examples ? `${row.examples} of ${row.hops} hops told twice · ${row.name ?? 'UNNAMED'}` : `${row.hops} hop(s), told once`}`);
    for (const f of r.findings) console.log(`    FINDING ${f.rule} · ${f.view} · ${f.why}`);
    if (r.findings.length) bad++;
    if (r.rows.some((x) => x.examples)) any = true;
  }
  console.log(`\n${bad ? `${bad} project(s) with findings` : any ? 'clean' : 'ABSENT — no trace carries an example anywhere; the E key is dark'}`);
  process.exit(bad ? 1 : 0);
}
