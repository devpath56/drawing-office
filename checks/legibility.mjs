/**
 * LEGIBILITY — every colour pair a reader actually meets, derived from the drawing.
 *
 * WHY THIS IS NOT A THIRD PAIR IN diagram-contrast. That module tests two pairs per style row —
 * text on fill, stroke on canvas — and both are hand-written `rows.push` calls naming their own
 * pair. Adding a third would fix CF-105 and leave the CLASS open: the population is a list its
 * author declared, so it can only ever answer "are the pairs I named above a floor", never "can a
 * reader see this". The next element kind, the next nesting level, the next background needs a
 * fourth entry and gets one when somebody complains.
 *
 * CF-105, measured 2026-09-05. The operator could not read the elements on a component view while
 * nine checks were green. Two reasons, and the second is the class:
 *
 *   the canvas was ASSUMED. theme.json declares #1F2226; the renderer paints #111111, which is
 *     written in the exported site's own js/structurizr-diagram.js. Every stroke-on-canvas ratio
 *     was computed against a colour the page never shows.
 *   the pair that decides whether a BOX EXISTS to the eye — its fill against what is behind it —
 *     was in neither test. Existing System #2b3a33 on the real canvas is 1.58:1.
 *
 * SO THE POPULATION IS THE DRAWING. For every element a view DRAWS, three pairs are derived rather
 * than declared: its text on its own fill, its fill on what is behind it, and its stroke on the same.
 * A new element kind enters the population by being drawn. Nobody has to remember it.
 *
 * THE EXEMPTION IS EARNED THE SAME WAY. A BOUNDARY is meant to recede: it is a frame around other
 * things, and a frame that shouted would compete with its contents. So a boundary's fill is reported
 * and not failed — and "boundary" is model.mjs::boundaryTags, computed from what actually contains
 * something, not a list anybody types. That is the rule checks/palette-claim.mjs already had to earn
 * after its own hand-typed list agreed with its author's mistake.
 *
 * WHAT IT STILL CANNOT DO: it reads colours, not pixels. Two shapes that overlap, a label that
 * escapes its box, a font too small to resolve — none of those are colour pairs, and
 * checks/diagram-collisions.mjs owns the first two. A green line here means every pair a reader
 * meets clears its floor, not that the picture is readable.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { elements as modelElements, holders as modelHolders, styles as modelStyles, views as modelViews } from './model.mjs';
import { resolve } from './style-resolve.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'UNEVALUABLE']);

/**
 * THE FLOORS, and the middle one is not WCAG. Text has a reading floor (4.5) and a stroke has the
 * non-text floor (3). A FILL is neither: it does not have to be readable, it has to be
 * DISTINGUISHABLE — a reader must be able to see that a box is there. 1.6 is the measured line
 * between the palette's own working fills (Software System 2.11, Container 3.26) and the ones the
 * operator could not see (Existing System 1.58, a frame 1.18). It is a judgement, it is stated here
 * rather than buried, and it is the number to argue with.
 */
export const FLOORS = Object.freeze({ textOnFill: 4.5, fillOnBehind: 1.6, strokeOnBehind: 3 });

const lin = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };

export function luminance(hex) {
  const n = String(hex ?? '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(n)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  if (x === null || y === null) return null;
  return Number(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2));
}

/**
 * THE CANVAS THE RENDERER PAINTS, read from the exported site rather than assumed.
 * It is a literal in the renderer's own JavaScript, so this is the renderer's answer and not ours.
 * No site exported means UNEVALUABLE — a canvas nobody can read is not a canvas we may guess.
 */
export function canvasOf(siteDir, { read = fs } = {}) {
  const f = path.join(siteDir, 'js', 'structurizr-diagram.js');
  if (!read.existsSync(f)) return { state: 'UNEVALUABLE', why: `${f} is not there; export the static site so the canvas can be read rather than assumed` };
  const src = read.readFileSync(f, 'utf8');
  const found = src.match(/['"](#[0-9a-fA-F]{6})['"]/g)?.map((s) => s.slice(1, -1)) ?? [];
  const dark = found.find((c) => (luminance(c) ?? 1) < 0.05);
  if (!dark) return { state: 'UNEVALUABLE', why: 'no dark background literal found in the renderer; its format may have changed' };
  return { state: 'read', canvas: dark, source: 'js/structurizr-diagram.js' };
}

/** Every pair a reader meets, derived from what each view draws. */
export function pairs(ws, canvas) {
  const styleRows = modelStyles(ws).elements;
  const byId = new Map(modelElements(ws).map((e) => [e.id, e]));
  /* PER ELEMENT, NOT PER TAG. The red proof caught this: "Software System" is a boundary tag because
     dsh harness holds containers, so OTel collector — a system holding nothing — inherited the
     exemption and its 1.58:1 fill was waved through. A boundary is a thing that CONTAINS, and that
     is a fact about the element in front of you. */
  const holders = modelHolders(ws);
  const out = [];
  const seen = new Set();

  for (const v of modelViews(ws)) {
    for (const ref of v.elements ?? []) {
      const el = byId.get(String(ref.id));
      if (!el) continue;
      const isBoundary = holders.has(el.id);
      /* The dedupe keys on BOTH, so a tag that is a boundary here and a leaf there is judged twice. */
      const key = `${el.tags.join('|')}#${isBoundary}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const s = resolve(el.tags.join(','), styleRows);
      const common = { what: el.kind, tags: el.tags.join(','), };

      if (s.color && s.background) out.push({ ...common, pair: 'text on fill', a: s.color, b: s.background, floor: FLOORS.textOnFill, exempt: false });
      if (s.background) out.push({ ...common, pair: 'fill on behind', a: s.background, b: canvas, floor: FLOORS.fillOnBehind, exempt: isBoundary, why: isBoundary ? 'a boundary is a frame and is meant to recede' : null });
      if (s.stroke) out.push({ ...common, pair: 'stroke on behind', a: s.stroke, b: canvas, floor: FLOORS.strokeOnBehind, exempt: false });
    }
  }
  return out.map((p) => ({ ...p, ratio: contrast(p.a, p.b) }));
}

export function inspect(ws, canvas) {
  const all = pairs(ws, canvas);
  if (!all.length) return { state: 'UNEVALUABLE', why: 'no view draws an element with a resolved colour', findings: [], judged: 0, exempt: 0 };
  const findings = all
    .filter((p) => !p.exempt && (p.ratio === null || p.ratio < p.floor))
    .map((p) => ({
      rule: 'under-the-floor',
      where: `${p.tags} · ${p.pair} · ${p.a} on ${p.b}`,
      why: `${p.ratio}:1 against a floor of ${p.floor}. A reader meets this pair on the page`,
    }));
  return { state: findings.length ? 'findings' : 'clean', findings, judged: all.length, exempt: all.filter((p) => p.exempt).length };
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

    say('the ratio maths agrees with a known pair', contrast('#ffffff', '#000000') === 21, contrast('#ffffff', '#000000'));
    say('a malformed colour is null rather than a number nobody can trust', contrast('nope', '#000000') === null, contrast('nope', '#000'));

    const ws = {
      model: { softwareSystems: [{ id: 's1', name: 'Ext', tags: 'Element,Existing System' }] },
      views: {
        systemContextViews: [{ key: 'Ctx', elements: [{ id: 's1' }] }],
        configuration: { styles: { elements: [{ tag: 'Existing System', background: '#2b3a33', stroke: '#6fa588', color: '#ffffff' }] } },
      },
    };

    /* CF-105 ITSELF: the fill nobody measured, against the canvas the renderer actually paints. */
    const bad = inspect(ws, '#111111');
    say('the incident fires — a fill that disappears into the real canvas',
      bad.findings.some((f) => /fill on behind/.test(f.where)), bad.findings.map((f) => f.where));
    /* THE FIRST DRAFT OF THIS ASSERTION WAS WRONG AND THE MEASUREMENT CORRECTED CF-105 ITSELF.
       It claimed the box would pass against the assumed canvas — that the wrong background is what
       hid it. Measured: #2b3a33 is 1.58 on the real #111111 and 1.34 on the assumed #1F2226, so the
       fill was invisible EITHER WAY and the assumed canvas was if anything harsher. The wrong canvas
       never hid anything; the MISSING PAIR did, and the two defects are independent.
       Where the canvas error does bite is the stroke: #6fa588 reads 6.67 against the real canvas and
       5.64 against the assumed one, so that check was stricter than reality rather than laxer. */
    say('the fill fires against BOTH canvases — the missing pair hid the box, not the wrong background',
      inspect(ws, '#1F2226').findings.some((f) => /fill on behind/.test(f.where))
      && inspect(ws, '#111111').findings.some((f) => /fill on behind/.test(f.where)),
      { assumed: contrast('#2b3a33', '#1F2226'), real: contrast('#2b3a33', '#111111') });
    say('and the canvas error moves the STROKE ratio, which is the half it actually touched',
      contrast('#6fa588', '#111111') > contrast('#6fa588', '#1F2226'),
      { real: contrast('#6fa588', '#111111'), assumed: contrast('#6fa588', '#1F2226') });

    /* THE POPULATION IS DERIVED: an element kind nobody enumerated is judged because it is DRAWN. */
    const ws2 = JSON.parse(JSON.stringify(ws));
    ws2.model.softwareSystems.push({ id: 's2', name: 'New', tags: 'Element,Something Nobody Listed' });
    ws2.views.systemContextViews[0].elements.push({ id: 's2' });
    ws2.views.configuration.styles.elements.push({ tag: 'Something Nobody Listed', background: '#121316', stroke: '#141414' });
    say('a tag nobody enumerated is in the population because a view draws it',
      inspect(ws2, '#111111').findings.some((f) => /Something Nobody Listed/.test(f.where)), inspect(ws2, '#111111').findings.map((f) => f.where));

    /* THE EXEMPTION IS EARNED FROM THE MODEL, not typed. A boundary may recede. */
    const wsB = {
      model: { softwareSystems: [{ id: 's1', name: 'Sys', tags: 'Element,Software System', containers: [{ id: 'c1', name: 'C', tags: 'Element,Container' }] }] },
      views: {
        containerViews: [{ key: 'C', elements: [{ id: 's1' }, { id: 'c1' }] }],
        configuration: { styles: { elements: [{ tag: 'Software System', background: '#1f2226' }, { tag: 'Container', background: '#5a5fa6' }] } },
      },
    };
    const b = inspect(wsB, '#111111');
    say('a boundary fill below the floor is exempt, because a frame is meant to recede',
      !b.findings.some((f) => /Software System/.test(f.where)), b.findings.map((f) => f.where));
    say('and the exempt ones are COUNTED, so a reader can see what was waved through', b.exempt > 0, b.exempt);

    /* A LEAF WITH THE SAME FILL IS NOT EXEMPT — the exemption is containment, not colour. */
    const wsL = JSON.parse(JSON.stringify(wsB));
    wsL.model.softwareSystems[0].containers = [];
    wsL.views.containerViews[0].elements = [{ id: 's1' }];
    wsL.views.configuration.styles.elements = [{ tag: 'Software System', background: '#1f2226' }];
    say('the same fill on a LEAF is a finding — the exemption is containment, not colour',
      inspect(wsL, '#111111').findings.some((f) => /Software System/.test(f.where)), inspect(wsL, '#111111').findings.map((f) => f.where));

    /* THE CANVAS IS READ, NEVER ASSUMED. */
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'canvas-'));
    say('no exported site means UNEVALUABLE, not a guessed canvas', canvasOf(dir).state === 'UNEVALUABLE', canvasOf(dir));
    fs.mkdirSync(path.join(dir, 'js'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'js', 'structurizr-diagram.js'), "var bg = '#111111'; var accent = '#ffcc00';");
    say('the canvas is read out of the renderer\'s own source', canvasOf(dir).canvas === '#111111', canvasOf(dir));
    say('and a bright literal is not mistaken for a dark canvas',
      (() => {
        const d2 = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'canvas2-'));
        fs.mkdirSync(path.join(d2, 'js'), { recursive: true });
        fs.writeFileSync(path.join(d2, 'js', 'structurizr-diagram.js'), "var accent = '#ffcc00';");
        return canvasOf(d2).state === 'UNEVALUABLE';
      })(), 'bright only');

    say('a workspace drawing nothing is UNEVALUABLE rather than clean',
      inspect({ model: {}, views: {} }, '#111111').state === 'UNEVALUABLE', inspect({ model: {}, views: {} }, '#111111'));
    say('and the report says how many pairs it judged, so clean is not empty', bad.judged >= 3, bad.judged);

    console.log(`\n${ok} of 14 held`);
    process.exit(ok === 14 ? 0 : 1);
  }

  const dir = path.join(root, 'architecture');
  const projects = fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())
        .filter((d) => fs.existsSync(path.join(dir, d.name, 'workspace.json'))).map((d) => d.name)
    : [];
  if (!projects.length) { console.log('UNEVALUABLE — no exported workspace.json found; export the DSL first'); process.exit(3); }

  let bad = 0;
  for (const p of projects) {
    const c = canvasOf(path.join(dir, p, 'site'));
    if (c.state !== 'read') { console.log(`\n  legibility · ${p}\n    UNEVALUABLE — ${c.why}`); process.exit(3); }
    const ws = JSON.parse(fs.readFileSync(path.join(dir, p, 'workspace.json'), 'utf8'));
    const r = inspect(ws, c.canvas);
    console.log(`\n  legibility · ${p} · canvas ${c.canvas} read from ${c.source} · ${r.judged} pair(s), ${r.exempt} exempt`);
    for (const f of r.findings) { bad++; console.log(`    UNDER ${f.where}\n          ${f.why}`); }
    if (!r.findings.length) console.log('    every pair a reader meets clears its floor');
  }
  console.log(`\n  ${bad} finding(s)`);
  process.exit(bad ? 1 : 0);
}
