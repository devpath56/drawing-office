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

/**
 * STAMP `structurizr.tooltips` ON EVERY VIEW THAT LACKS IT. Returns { added, views }.
 *
 * EXPORTED BECAUSE IT WAS NOT, and that is why its defect survived. The writer lived inline in the
 * CLI block, so nothing could call it and no planted fault could reach it — while the READER beside
 * it had fourteen. Measured 2026-09-05: it sliced a FIXED 400 characters after each view's head
 * line to ask "does this view already have the property", so a view shorter than that read its
 * NEIGHBOUR's answer. On the No-Leak-MCP model it reported "all of them already had it" while
 * SystemContext sat bare, and the check failed on that very view — the writer and the reader
 * disagreeing about one file, with only the reader under test.
 *
 * The window is now the view's own block, counted by brace depth so a nested `properties` block
 * does not end it early.
 */
export function stampTooltips(dsl, { read = fs, write = fs } = {}) {
  const src = read.readFileSync(dsl, 'utf8');
  const HEAD = /^([ \t]*)(systemLandscape|systemContext|container|component|dynamic|deployment)\b[^\n{]*\{[ \t]*$/gm;
  const blockEnd = (s, open) => {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}' && --depth === 0) return i;
    }
    return s.length;
  };
  const already = new RegExp(TOOLTIP_PROPERTY.replace('.', '\\.'));
  let added = 0, out = '', at = 0;
  const views = [];
  for (const m of src.matchAll(HEAD)) {
    const lineEnd = src.indexOf('\n', m.index + m[0].length) + 1;
    const window = src.slice(lineEnd, blockEnd(src, src.indexOf('{', m.index)));
    views.push(m[0].trim());
    if (already.test(window)) continue;
    const pad = m[1] + '    ';
    out += src.slice(at, lineEnd) + `${pad}properties {\n${pad}    "${TOOLTIP_PROPERTY}" "true"\n${pad}}\n`;
    at = lineEnd;
    added++;
  }
  out += src.slice(at);
  if (added) write.writeFileSync(dsl, out);
  return { added, views: views.length };
}

/** Every static view, with the ids it draws — the population a layer is measured against. */
export function viewsOf(ws) {
  const out = [];
  for (const k of ['systemLandscapeViews', 'systemContextViews', 'containerViews', 'componentViews']) {
    for (const v of ws?.views?.[k] ?? []) out.push({ key: v.key, ids: new Set((v.elements ?? []).map((e) => String(e.id))), tooltips: tooltipsOn(v) });
  }
  return out;
}

/**
 * HOW MANY CHARACTERS FIT ON ONE LINE OF THE TOOLTIP, read from the wrapper rather than guessed.
 *
 * The operator's rule is that a bullet should not wrap. Whether it wraps is decided by two numbers
 * that live in architecture/viewer.html — the tooltip's max-width and its font-size — so this reads
 * them out of that file instead of keeping a second copy that drifts the first time either changes.
 *
 * The character estimate is honest about being one: SVG and HTML have no measuring without a
 * renderer, so this uses the average advance of a proportional face at that size, 0.5em, and says so.
 * It is deliberately GENEROUS — an over-wide estimate lets a borderline bullet through, and a
 * false finding on a line that fits would teach its reader to ignore the rule.
 *
 * AND IT MEASURES THE MAXIMUM, WHICH IS NOT ALWAYS THE ACTUAL. The renderer places the tooltip at the
 * cursor and squeezes it against the viewport edge, so a bullet inside this budget can still wrap on
 * a box near the right-hand side. Measured 2026-09-05: two 95- and 101-character bullets fitted the
 * budget and wrapped in place. The rule is a floor on legibility, not a promise about placement, and
 * the practical advice it cannot enforce is to write the bullet shorter than the number says.
 */
export function lineBudget(root = HERE) {
  try {
    const src = fs.readFileSync(path.join(root, 'architecture', 'viewer.html'), 'utf8');
    const width = Number(src.match(/max-width:\s*(\d+)px\s*!important/)?.[1]);
    const size = Number(src.match(/font-size:\s*(\d+)px\s*!important/)?.[1]);
    if (!width || !size) return null;
    const PADDING = 32;                       // 16px each side, from the same rule
    return { width, size, chars: Math.floor((width - PADDING) / (size * 0.5)) };
  } catch { return null; }
}

/** Coverage per perspective per view, plus the layer-of-one refusal. */
export function inspect(ws, { root = HERE } = {}) {
  const els = elements(ws);
  const byId = new Map(els.map((e) => [e.id, e]));
  const names = [...new Set(els.flatMap((e) => e.perspectives.map((p) => p.name)))].sort();
  if (!names.length) return { state: 'ABSENT', names: [], coverage: [], findings: [] };

  const findings = [];
  const coverage = [];
  const reported = new Set();
  const budget = lineBudget(root);

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
      /* A BULLET THAT WRAPS IS A BULLET THAT STOPS SCANNING. The operator's rule, and it is
         enforceable because the tooltip's width and type size are declared in one place. A heading
         line is exempt: it carries no bullet marker and is meant to be short anyway. */
      for (const e of lit) {
        for (const p of e.perspectives.filter((x) => x.name === name)) {
          for (const line of String(p.description ?? '').split('\n')) {
            const text = line.trim();
            if (!text.startsWith('·') || !budget || text.length <= budget.chars) continue;
            const key = `${e.name}|${text}`;
            if (reported.has(key)) continue;
            reported.add(key);
            findings.push({
              rule: 'bullet-wraps',
              where: `${e.name} · ${text.slice(0, 56)}…`,
              why: `${text.length} characters against a ${budget.chars}-character line — ${budget.width}px at ${budget.size}px, read from architecture/viewer.html — so it wraps and stops being scannable`,
              cite: 'ours — a hover is read at a glance or not at all',
            });
          }
        }
      }

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

    /* A BULLET THAT WRAPS. The budget is read from the wrapper's own CSS, so these cases build a
       fake one rather than pinning a number that moves the day the tooltip is resized. */
    const wide = { ...inspect(two), }; void wide;
    const budget = lineBudget();
    say('the line budget is derived from the wrapper, not typed here', budget && budget.chars > 40 && budget.width > 0, budget);
    const longOne = JSON.parse(JSON.stringify(two));
    longOne.model.softwareSystems[0].perspectives = [{ name: 'Ownership', description: '· ' + 'x'.repeat((budget?.chars ?? 100) + 20) }];
    longOne.views.systemLandscapeViews[0].properties = { 'structurizr.tooltips': 'true' };
    say('a bullet longer than one line is caught', inspect(longOne).findings.some((f) => f.rule === 'bullet-wraps'), inspect(longOne).findings.map((f) => f.rule));
    const shortOne = JSON.parse(JSON.stringify(longOne));
    shortOne.model.softwareSystems[0].perspectives = [{ name: 'Ownership', description: '· ' + 'x'.repeat(20) }];
    say('one that fits is accepted', !inspect(shortOne).findings.some((f) => f.rule === 'bullet-wraps'), inspect(shortOne).findings.map((f) => f.rule));
    /* A HEADING IS NOT A BULLET. It carries no marker and is meant to be short; refusing a long one
       would be measuring the wrong line. */
    const heading = JSON.parse(JSON.stringify(longOne));
    heading.model.softwareSystems[0].perspectives = [{ name: 'Ownership', description: 'x'.repeat((budget?.chars ?? 100) + 20) }];
    say('a heading line is exempt, because it carries no bullet marker', !inspect(heading).findings.some((f) => f.rule === 'bullet-wraps'), inspect(heading).findings.map((f) => f.rule));

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

    /* ── THE WRITER'S OWN WINDOW ──────────────────────────────────────────────────────────────
       A SHORT VIEW FOLLOWED BY A STAMPED ONE. The first draft sliced a fixed 400 characters after
       the head line, so a view shorter than that read its NEIGHBOUR's property and was skipped.
       Measured on the No-Leak-MCP model: --write reported "all of them already had it" while
       SystemContext sat bare and the check failed on that same view. The fixture below is that
       shape, in miniature, and it is the writer that is under test rather than the reader. */
    const twoViews = [
      '    views {',
      '        systemContext dsh "Short" {',
      '            include *',
      '        }',
      '        container dsh "Stamped" {',
      '            properties {',
      '                "structurizr.tooltips" "true"',
      '            }',
      '            include *',
      '        }',
      '    }',
    ].join('\n');
    const tmp = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'persp-')), 'w.dsl');
    fs.writeFileSync(tmp, twoViews);
    const before = fs.readFileSync(tmp, 'utf8');
    stampTooltips(tmp);
    const after = fs.readFileSync(tmp, 'utf8');
    const stampsIn = (s) => (s.match(/structurizr\.tooltips/g) ?? []).length;
    say('a view shorter than the old fixed window still gets stamped, rather than reading its neighbour',
      stampsIn(after) === 2 && stampsIn(before) === 1, { before: stampsIn(before), after: stampsIn(after) });
    say('and the view that already had it is not stamped twice',
      (after.match(/"structurizr\.tooltips" "true"/g) ?? []).length === 2, after.slice(0, 200));

    console.log(`\n${ok} of 16 held`);
    process.exit(ok === 16 ? 0 : 1);
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
    /* EVERY VIEW KIND, because the first cut matched only the four static ones and left the
       operator hovering a dynamic view with tooltips off — which reads exactly like the tooltip
       being broken rather than being disabled on that view. A trace is where a reader most wants
       to hover: the steps are numbered and the boxes are dimmed. */
    const r = stampTooltips(dsl);
    console.log(`${r.added} view(s) gained ${TOOLTIP_PROPERTY} in ${path.relative(process.cwd(), dsl)}${r.added ? ' — re-export before checking' : ' (all of them already had it)'}`);
    process.exit(0);
  }

  let bad = 0;
  for (const f of targets) {
    let ws;
    try { ws = JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) { console.log(`UNEVALUABLE — ${f} does not parse: ${e.message}`); process.exit(3); }
    const r = inspect(ws, { root });
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
