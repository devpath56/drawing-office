/**
 * PERSPECTIVES — the coverage of a layer, and the one shape that is not a layer at all.
 *
 * WHAT A PERSPECTIVE IS, in the book's words. Chapter 12 answers "how do I add ownership without
 * cluttering the diagram" by quoting Woods and Rozanski: "Rather than defining another viewpoint and
 * creating another view, we need some way to modify and enhance our existing views." So ownership
 * becomes "a layer on top of an existing diagram" that the reader toggles — Figure 12-1 for
 * ownership over the landscape, Figure 12-2 for security on the statement store.
 *
 * MEASURED 2026-09-04, because the plan preregistered two ways this claim could be dead: "p does
 * nothing in the static export" and "perspectives need the paid cloud workspace". Neither fired. In
 * the offline static export, `p` opens a picker built from the model — (none), Ownership, Security —
 * and choosing one dims every element without that perspective while the tooltip carries its value.
 *
 * WHY A CHECK, THEN. Because the toggle is the half that works on its own and coverage is the half
 * that does not. When a layer is on, a dimmed element means one of two things a reader cannot tell
 * apart: this element has no owner, or nobody wrote one down. The tool draws both identically. So
 * this reports the DENOMINATOR — how many of a view's elements carry each perspective — rather than
 * a bare verdict, and refuses only the one case that is unambiguous.
 *
 * THE ONE REFUSAL: a perspective on a single element in the whole workspace. Toggling that dims
 * everything except one box, which is a tooltip wearing a layer's clothes. Two is the smallest
 * number that can carry a comparison, which is what a layer is for.
 *
 * WHAT IT DELIBERATELY DOES NOT REFUSE: partial coverage. In the bank's landscape the three people
 * carry no ownership and correctly dim — a person is not owned by an engineering team. A rule
 * demanding every element would refuse the book's own figure. Coverage is reported and judged by a
 * reader, which is the honest split.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

import { elements } from './model.mjs';

export const STATES = Object.freeze(['clean', 'findings', 'ABSENT', 'UNEVALUABLE']);

/* THE WALK IS NOT HERE ANY MORE, and the reason is a defect rather than tidiness: this file, pubsub
   and diagram-key each had one, under three names, and they did not agree — this one never saw a
   deployment node, so a perspective declared on one was invisible to the coverage report while
   diagram-key counted the same element. One reader now, in checks/model.mjs. */

/* THE TOOLTIP IS OFF BY DEFAULT, WHICH MAKES A LAYER SILENT. Measured 2026-09-05 in the exported
   site: structurizr-tooltip.js opens with `var enabled = false`, and structurizr-diagram.js guards
   every hover with `if (tooltip && tooltip.isEnabled())`. So turning a perspective on dims the plate
   and binds nothing — the VALUE in each record, which is the whole payload of the layer and the
   thing ch12 says a tooltip should present, was unreachable. The operator hit this: "nothing renders
   when i hover on any of the 3 observability boxes".

   The renderer reads a per-view property for it, so the fix is a declaration in the model rather
   than a poke into the page from the wrapper — which the next export would have overwritten. */
export const TOOLTIP_PROPERTY = 'structurizr.tooltips';

export const tooltipsOn = (view) => String(view?.properties?.[TOOLTIP_PROPERTY] ?? '') === 'true';

/** Every static view, with the ids it draws — the population a layer is measured against. */
export function viewsOf(ws) {
  const out = [];
  for (const k of ['systemLandscapeViews', 'systemContextViews', 'containerViews', 'componentViews']) {
    for (const v of ws?.views?.[k] ?? []) out.push({ key: v.key, ids: new Set((v.elements ?? []).map((e) => String(e.id))), tooltips: tooltipsOn(v) });
  }
  return out;
}

/** Coverage per perspective per view, plus the layer-of-one refusal. */
export function inspect(ws) {
  const els = elements(ws);
  const byId = new Map(els.map((e) => [e.id, e]));
  const names = [...new Set(els.flatMap((e) => e.perspectives.map((p) => p.name)))].sort();
  if (!names.length) return { state: 'ABSENT', names: [], coverage: [], findings: [] };

  const findings = [];
  const coverage = [];
  const reported = new Set();

  for (const name of names) {
    const carriers = els.filter((e) => e.perspectives.some((p) => p.name === name));
    /* THE ONE REFUSAL, and it is counted across the whole workspace rather than per view: a layer
       that exists on one element is not a layer anywhere. */
    if (carriers.length < 2) {
      findings.push({
        rule: 'layer-of-one',
        where: `${name} — only ${carriers[0]?.name ?? 'nothing'}`,
        why: 'toggling this dims every element but one, which is a tooltip wearing a layer\'s clothes; two is the smallest number that can carry a comparison',
        cite: 'ch12 — a perspective is "a layer on top of an existing diagram", not an annotation on one box',
      });
    }
    for (const v of viewsOf(ws)) {
      if (!v.ids.size) continue;
      const drawn = [...v.ids].map((id) => byId.get(id)).filter(Boolean);
      const lit = drawn.filter((e) => e.perspectives.some((p) => p.name === name));
      coverage.push({ perspective: name, view: v.key, lit: lit.length, of: drawn.length, dark: drawn.filter((e) => !lit.includes(e)).map((e) => e.name) });
      /* A LAYER THAT LIGHTS BOXES AND CANNOT BE READ. The dimming works without the tooltip, so this
         view would pass every other rule while carrying nothing a reader can reach. */
      if (lit.length && !v.tooltips && !reported.has(v.key)) {
        reported.add(v.key);
        findings.push({
          rule: 'layer-cannot-be-read',
          where: v.key,
          why: `this view draws elements carrying a perspective and does not set ${TOOLTIP_PROPERTY} true, so turning the layer on dims the plate and shows nobody the value`,
          cite: 'ch12 — "pop-up tooltips could present this additional information", which is the layer\'s whole payload',
        });
      }
    }
  }

  return { state: findings.length ? 'findings' : 'clean', names, coverage, findings };
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
    const own = (v) => [{ name: 'Ownership', description: v }];
    const build = (systems, viewIds) => ({
      model: { people: [{ id: 'p1', name: 'Customer' }], softwareSystems: systems },
      views: { systemLandscapeViews: [{ key: 'Landscape', elements: viewIds.map((id) => ({ id })) }] },
    });

    const none = build([{ id: 's1', name: 'Alpha' }, { id: 's2', name: 'Beta' }], ['p1', 's1', 's2']);
    say('a workspace with no perspective is ABSENT, not clean and not a finding', inspect(none).state === 'ABSENT', inspect(none));

    const one = build([{ id: 's1', name: 'Alpha', perspectives: own('Team A') }, { id: 's2', name: 'Beta' }], ['p1', 's1', 's2']);
    say('a perspective on exactly one element is refused as a layer of one', inspect(one).findings.some((f) => f.rule === 'layer-of-one'), inspect(one).findings);

    const two = build([{ id: 's1', name: 'Alpha', perspectives: own('Team A') }, { id: 's2', name: 'Beta', perspectives: own('Team B') }], ['p1', 's1', 's2']);
    /* THE LAYER-OF-ONE RULE, not every rule: this fixture leaves tooltips off, which is now its own
       finding, so asserting an empty list here would have made the two rules impossible to hold at once. */
    say('two carriers is a layer and is accepted', !inspect(two).findings.some((f) => f.rule === 'layer-of-one'), inspect(two).findings.map((f) => f.rule));

    /* THE BOOK'S OWN FIGURE MUST PASS. In Figure 12-1 the people carry no ownership and correctly
       dim, so a rule demanding full coverage would refuse the diagram it was written from. */
    const cov = inspect(two).coverage.find((c) => c.view === 'Landscape');
    say('a person with no owner is reported as uncovered, never as a finding', cov.lit === 2 && cov.of === 3 && cov.dark.includes('Customer'), cov);

    say('coverage names the denominator, so a reader can tell "no owner" from "not written down"', typeof cov.of === 'number' && cov.of > cov.lit, cov);

    /* THE LAYER MUST BE READABLE. Measured: the renderer's tooltip is off by default, so a view that
       lights boxes and does not turn it on shows the reader a dimming and nothing else. */
    say('a view that lights a layer and leaves tooltips off is caught', inspect(two).findings.some((f) => f.rule === 'layer-cannot-be-read'), inspect(two).findings.map((f) => f.rule));
    const readable = JSON.parse(JSON.stringify(two));
    readable.views.systemLandscapeViews[0].properties = { 'structurizr.tooltips': 'true' };
    say('and one that turns them on is accepted', !inspect(readable).findings.some((f) => f.rule === 'layer-cannot-be-read'), inspect(readable).findings.map((f) => f.rule));
    /* A VIEW THAT LIGHTS NOTHING NEEDS NO TOOLTIP. */
    const nothingLit = JSON.parse(JSON.stringify(two));
    nothingLit.model.softwareSystems.forEach((s) => { delete s.perspectives; });
    say('a view where the layer lights nothing is not asked to enable tooltips', !inspect(nothingLit).findings.some((f) => f.rule === 'layer-cannot-be-read'), inspect(nothingLit).findings.map((f) => f.rule));

    /* Two perspectives are two independent layers and are measured separately. */
    const both = build([
      { id: 's1', name: 'Alpha', perspectives: [{ name: 'Ownership', description: 'Team A' }, { name: 'Security', description: 'encrypted' }] },
      { id: 's2', name: 'Beta', perspectives: [{ name: 'Ownership', description: 'Team B' }, { name: 'Security', description: 'encrypted' }] },
    ], ['p1', 's1', 's2']);
    say('two perspectives are measured as two layers, not merged into one', inspect(both).names.join(',') === 'Ownership,Security' && inspect(both).coverage.length === 2, inspect(both).names);

    const mixed = structuredClone(both);
    delete mixed.model.softwareSystems[1].perspectives[1];
    mixed.model.softwareSystems[1].perspectives = mixed.model.softwareSystems[1].perspectives.filter(Boolean);
    say('a perspective carried by one element while another is carried by two fires on only the first', inspect(mixed).findings.filter((f) => f.rule === 'layer-of-one').length === 1, inspect(mixed).findings);

    console.log(`\n${ok} of 10 held`);
    process.exit(ok === 10 ? 0 : 1);
  }

  const dir = path.join(root, 'architecture');
  const targets = fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())
        .map((d) => path.join(dir, d.name, 'workspace.json')).filter((f) => fs.existsSync(f))
    : [];
  if (!targets.length) { console.log('UNEVALUABLE — no exported workspace.json found; export the DSL first'); process.exit(3); }

  /* --write STAMPS THE PROPERTY, because I typed it into six views by hand today and the seventh is
     where it gets forgotten. checks/diagram-contrast.mjs already owns this pattern for the palette:
     the check refuses drift and the writer removes the reason anyone would hand-edit. The property
     name has one home, TOOLTIP_PROPERTY, and both the reader and the writer take it from there. */
  if (argv.includes('--write')) {
    const dsl = flag('--write', null);
    if (!dsl || !fs.existsSync(dsl)) { console.error('usage: node checks/perspectives.mjs --write <workspace.dsl>'); process.exit(2); }
    let src = fs.readFileSync(dsl, 'utf8');
    /* A view header is a keyword, an optional scope, a quoted key and an opening brace. The property
       block goes on the line after it, at the header's own indent plus four. */
    const HEAD = /^([ \t]*)(systemLandscape|systemContext|container|component)\b[^\n{]*\{[ \t]*$/gm;
    const already = new RegExp(TOOLTIP_PROPERTY.replace('.', '\\.'));
    let added = 0, out = '', at = 0;
    for (const m of src.matchAll(HEAD)) {
      const lineEnd = src.indexOf('\n', m.index + m[0].length) + 1;
      /* Look only as far as this view's own block, so a property on the NEXT view is not mistaken
         for one on this one. */
      const window = src.slice(lineEnd, lineEnd + 400);
      if (already.test(window)) continue;
      const pad = m[1] + '    ';
      out += src.slice(at, lineEnd) + `${pad}properties {\n${pad}    "${TOOLTIP_PROPERTY}" "true"\n${pad}}\n`;
      at = lineEnd;
      added++;
    }
    out += src.slice(at);
    if (added) fs.writeFileSync(dsl, out);
    console.log(`${added} view(s) gained ${TOOLTIP_PROPERTY} in ${path.relative(process.cwd(), dsl)}${added ? ' — re-export before checking' : ' (all of them already had it)'}`);
    process.exit(0);
  }

  let bad = 0;
  for (const f of targets) {
    let ws;
    try { ws = JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) { console.log(`UNEVALUABLE — ${f} does not parse: ${e.message}`); process.exit(3); }
    const r = inspect(ws);
    console.log(`\n  perspectives · ${path.relative(process.cwd(), f)}`);
    if (r.state === 'ABSENT') { console.log('    ABSENT — this workspace declares no perspective, which is an answer, not a pass'); continue; }
    for (const c of r.coverage) {
      console.log(`    ${c.perspective.padEnd(12)} ${c.view.padEnd(16)} ${c.lit} of ${c.of} lit${c.dark.length ? ` · dark: ${c.dark.join(', ')}` : ''}`);
    }
    for (const x of r.findings) { bad++; console.log(`    FAIL ${x.rule}\n         ${x.where}\n         ${x.why}\n         ${x.cite}`); }
  }
  console.log(`\n  ${bad} finding(s) · a dark element means "no perspective written down", which the viewer draws the same as "not applicable"`);
  process.exit(bad ? 1 : 0);
}
