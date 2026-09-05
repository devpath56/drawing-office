/**
 * DIAGRAM KEY — every notation a view uses must be explained, and the palette must not carry rows
 * nobody will ever see.
 *
 * THE BOOK IS UNUSUALLY DIRECT HERE, and the rule is two-sided in its own words:
 *
 *   ch10  "Notation that is used to differentiate elements and relationships (e.g., shapes, colors,
 *          line styles, icons) is described with a diagram key."
 *   ch10  "include any line styles, colors, and arrowheads in your diagram key"
 *   ch10  "don't forget to include the shapes on the diagram key"
 *   ch10  "Even if the notation seems obvious to you, I recommend including a key, since even the
 *          seemingly obvious can be misinterpreted"
 *
 * MEASURED 2026-09-04, against the preregistered ways this could have been dead — "the key lists
 * shapes the diagram does not use, or omits ones it does". Neither fired. Pressing i in the offline
 * export opens a key built per view: the bank's container view lists Boundary, Container, Container
 * Data Store, Person, Software System Existing System and one Relationship; the payments container
 * view lists Container Channel and BOTH line styles, Asynchronous and Relationship, and does not list
 * Existing System, which that model does not use. The renderer gets this right.
 *
 * SO WHAT IS LEFT TO CHECK IS OURS, and it is the half the renderer cannot see. The key explains the
 * styles that EXIST. It cannot tell you that an element carries a tag your theme never styled — that
 * box renders in the renderer's default and lands on the key as an unexplained shape — nor that your
 * theme carries a row no view will ever draw, which is a colour decision nobody reviews and the
 * commonest way a palette rots.
 *
 * THE THIRD RULE CLOSES THE LOOP ON THE RENDERER without needing a browser at check time: when
 * tools/diagram-export.mjs has written <view>-key.svg, its text must name every style that view uses.
 * When it has not, that is NOT-CHECKED and says so — an unexported key is a missing measurement, not
 * a passing one.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ONE HOME FOR THE NAME OF AN EXPORTED FILE. This module reads what diagram-export writes, so it
   asks that module what the file is called rather than keeping a second copy of the rule — the two
   copies had already drifted by one .replace(). */
import { slug } from '../tools/diagram-export.mjs';

/** The name a view's key file is written under — the writer's rule, re-exported so a control can
    compare both sides of the round trip without reaching into either module's private scope. */
export const keyFileSlug = slug;

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'NOT-CHECKED', 'UNEVALUABLE']);

/* Structurizr's own implicit tags. An element always carries Element plus its kind, and those are
   styled by the base rows rather than named on the key as separate entries. */
export const IMPLICIT = Object.freeze(['Element', 'Relationship']);

/** Every element of the model, by id, with its tags and the view-relevant kind. */
export function elementsById(ws) {
  const by = new Map();
  const put = (e, kind) => by.set(String(e.id), { name: e.name, kind, tags: String(e.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean), perspectives: e.perspectives ?? [] });
  for (const p of ws?.model?.people ?? []) put(p, 'Person');
  for (const s of ws?.model?.softwareSystems ?? []) {
    put(s, 'Software System');
    for (const c of s.containers ?? []) { put(c, 'Container'); for (const k of c.components ?? []) put(k, 'Component'); }
  }
  for (const n of ws?.model?.deploymentNodes ?? []) put(n, 'Deployment Node');
  return by;
}

/** The tags a view actually draws, elements and relationships alike. */
export function tagsUsedBy(ws, view) {
  const by = elementsById(ws);
  const elementTags = new Set();
  for (const e of view.elements ?? []) {
    const el = by.get(String(e.id));
    for (const t of el?.tags ?? []) if (!IMPLICIT.includes(t)) elementTags.add(t);
  }
  /* A relationship's tags live on the model relationship, not on the view's reference to it. */
  const relById = new Map();
  const collect = (o) => { for (const r of o.relationships ?? []) relById.set(String(r.id), String(r.tags ?? '')); };
  for (const p of ws?.model?.people ?? []) collect(p);
  for (const s of ws?.model?.softwareSystems ?? []) { collect(s); for (const c of s.containers ?? []) { collect(c); for (const k of c.components ?? []) collect(k); } }
  const relationshipTags = new Set();
  for (const r of view.relationships ?? []) {
    for (const t of String(relById.get(String(r.id)) ?? '').split(',').map((x) => x.trim()).filter(Boolean)) {
      if (!IMPLICIT.includes(t)) relationshipTags.add(t);
    }
  }
  return { elementTags, relationshipTags };
}

/** Every static and dynamic view in the workspace, in one list. */
export function viewsOf(ws) {
  const out = [];
  for (const k of ['systemLandscapeViews', 'systemContextViews', 'containerViews', 'componentViews', 'dynamicViews', 'deploymentViews']) {
    for (const v of ws?.views?.[k] ?? []) out.push(v);
  }
  return out;
}

/** The plain text of an SVG, so a key file can be searched without parsing it. */
export const svgText = (svg) => String(svg).replace(/<[^>]+>/g, ' ').replace(/[\s   ]+/g, ' ').trim();

/**
 * THE THREE RULES.
 *   1 unexplained — a tag a view draws that the theme never styles
 *   2 unseen      — a theme row no view will ever draw
 *   3 unnamed     — an exported key that does not name a style its view uses
 */
export function inspect(ws, theme, { keyText = null } = {}) {
  const findings = [];
  const styled = new Set((theme?.elements ?? []).map((r) => r.tag).concat((theme?.relationships ?? []).map((r) => r.tag)));
  const usedAnywhere = new Set();
  const views = viewsOf(ws);

  for (const v of views) {
    const { elementTags, relationshipTags } = tagsUsedBy(ws, v);
    for (const t of [...elementTags, ...relationshipTags]) {
      usedAnywhere.add(t);
      if (styled.has(t)) continue;
      findings.push({
        rule: 'unexplained-notation',
        where: `${v.key} · ${t}`,
        why: `this view draws elements tagged "${t}" and architecture/theme.json styles no such tag, so they render in the renderer's default and land on the key as a shape nothing explains`,
        cite: 'ch10 — "Notation that is used to differentiate elements and relationships ... is described with a diagram key"',
      });
    }
  }

  /* THE UNSEEN RULE IS NOT DECIDED HERE, and the first draft deciding it here is why. One theme
     serves every workspace in the repo, so asking "does any view draw this tag" of ONE workspace
     reports the bank's Existing System as unused while payments draws it, and payments' Channel and
     Asynchronous as unused while the bank has no queues. Three findings, all false, all produced by
     asking the right question of the wrong denominator. The tags this workspace uses are RETURNED
     instead, and the CLI unions them across every workspace before judging the palette. */

  if (keyText !== null) {
    for (const v of views) {
      const text = keyText(v.key);
      if (text === null) continue;
      const { elementTags, relationshipTags } = tagsUsedBy(ws, v);
      for (const t of [...elementTags, ...relationshipTags]) {
        if (!styled.has(t)) continue;
        if (text.includes(t)) continue;
        findings.push({
          rule: 'unnamed-on-the-key',
          where: `${v.key} · ${t}`,
          why: `the exported key for this view does not name "${t}", which the view uses`,
          cite: 'ch10 — "include any line styles, colors, and arrowheads in your diagram key"',
        });
      }
    }
  }

  /* THE STATE IS RETURNED, and before this it was not: STATES declared four words and inspect
     returned none of them, so every one was an unreachable declaration — a shape row 26 of the
     Ousterhout catalogue exists for, and one that every other row passes. */
  return { state: findings.length ? 'findings' : 'clean', views: views.length, findings, used: usedAnywhere };
}

/**
 * The palette rows nothing draws, judged against every workspace at once.
 * IMPLICIT KIND TAGS ARE EXEMPT: the renderer applies Person, Container and the rest to every
 * element of that kind, so they never appear in an element's own tag list and a naive rule reports
 * every base row in the palette as unused — which was the first draft, and would have made this
 * check noise on its first run in any repo.
 */
export const RENDERER_KINDS = Object.freeze(['Person', 'Software System', 'Container', 'Component', 'Deployment Node', 'Infrastructure Node']);

export function unseenStyles(theme, usedAcross) {
  const styled = new Set((theme?.elements ?? []).map((r) => r.tag).concat((theme?.relationships ?? []).map((r) => r.tag)));
  const out = [];
  for (const tag of styled) {
    if (IMPLICIT.includes(tag) || RENDERER_KINDS.includes(tag)) continue;
    if (usedAcross.has(tag)) continue;
    out.push({
      rule: 'unseen-style',
      where: tag,
      why: 'the theme styles this tag and no view in any workspace here draws it, so it is a colour decision nobody will ever see and nobody reviews',
      cite: 'ours, not the book — a palette row with no reader is drift waiting to happen',
    });
  }
  return out;
}

/**
 * THE WHOLE JOB, IN ONE CALL — and it is one call because it was six.
 *
 * Every export above is a PART: a walk, a tag set, a rule, a palette verdict. Nothing exposed the
 * WHOLE, so the only correct way to use this module was the sequence transcribed in its own command
 * line: read the theme, enumerate the workspaces, inspect each, collect the tags each one uses,
 * union them, and only then judge the palette. Six steps, in one order, in a block no other caller
 * could reach.
 *
 * THAT IS INFORMATION LEAKAGE, and it is the same defect this file's own union fix created. The
 * decision "the palette's denominator is every workspace in the repo" was spread across inspect
 * (which returns `used`), unseenStyles (which takes the union) and the CLI (which does the
 * unioning) — three places, and the one that owned it was a command-line wrapper. Any second
 * caller, in this repo or the next, would have had to rediscover the order or get a wrong answer
 * quietly. The best modules are those whose interfaces are much simpler than their implementations,
 * and this module's interface was larger than any piece of its implementation.
 *
 * So the sequence lives here. The CLI below is a printer.
 */
export function audit({ root = HERE, svgDir = null, read = fs } = {}) {
  let theme;
  try { theme = JSON.parse(read.readFileSync(path.join(root, 'architecture', 'theme.json'), 'utf8')); }
  catch (e) { return { state: 'UNEVALUABLE', why: `architecture/theme.json could not be read (${e.message})`, workspaces: [], palette: [], notChecked: 0 }; }

  const dir = path.join(root, 'architecture');
  let targets = [];
  try {
    targets = read.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())
      .map((d) => path.join(dir, d.name, 'workspace.json')).filter((f) => read.existsSync(f));
  } catch { /* answered next */ }
  if (!targets.length) return { state: 'UNEVALUABLE', why: 'no exported workspace.json found; export the DSL first', workspaces: [], palette: [], notChecked: 0 };

  const keys = svgDir ?? path.join(root, 'architecture', 'svg');
  let notChecked = 0;
  const keyText = (viewKey) => {
    const f = path.join(keys, `${slug(viewKey)}-key.svg`);
    if (!read.existsSync(f)) { notChecked++; return null; }
    return svgText(read.readFileSync(f, 'utf8'));
  };

  const usedAcross = new Set();
  const workspaces = [];
  for (const f of targets) {
    let ws;
    try { ws = JSON.parse(read.readFileSync(f, 'utf8')); }
    catch (e) { return { state: 'UNEVALUABLE', why: `${f} does not parse: ${e.message}`, workspaces, palette: [], notChecked }; }
    const r = inspect(ws, theme, { keyText });
    for (const t of r.used) usedAcross.add(t);
    workspaces.push({ file: f, views: r.views, findings: r.findings });
  }

  /* THE PALETTE IS JUDGED ONCE, against every workspace, because there is one of it. */
  const palette = unseenStyles(theme, usedAcross);
  const total = workspaces.reduce((n, w) => n + w.findings.length, 0) + palette.length;
  return { state: total ? 'findings' : 'clean', workspaces, palette, used: usedAcross, notChecked, total };
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
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 260)}`}`); if (pass) ok++; };
    const rules = (r) => r.findings.map((f) => f.rule);

    const theme = { elements: [{ tag: 'Element' }, { tag: 'Container' }, { tag: 'Channel', shape: 'Pipe' }], relationships: [{ tag: 'Relationship' }, { tag: 'Asynchronous', dashed: true }] };
    const ws = {
      model: { softwareSystems: [{ id: 's1', name: 'P', containers: [
        { id: 'a', name: 'Service', tags: 'Element,Container', relationships: [{ id: 'r1', destinationId: 'q', tags: 'Relationship,Asynchronous' }] },
        { id: 'q', name: 'Queue', tags: 'Element,Container,Channel' },
      ] }] },
      views: { containerViews: [{ key: 'Containers', elements: [{ id: 'a' }, { id: 'q' }], relationships: [{ id: 'r1' }] }] },
    };

    say('a view whose every tag is styled is clean', rules(inspect(ws, theme)).length === 0, inspect(ws, theme).findings);

    const untagged = structuredClone(ws);
    untagged.model.softwareSystems[0].containers[1].tags = 'Element,Container,Topic';
    say('a tag the theme never styles is caught', rules(inspect(untagged, theme)).includes('unexplained-notation'), rules(inspect(untagged, theme)));

    const spare = { ...theme, elements: [...theme.elements, { tag: 'Ghost', shape: 'Hexagon' }] };
    say('a theme row no workspace draws is caught', unseenStyles(spare, inspect(ws, spare).used).some((f) => f.where === 'Ghost'), unseenStyles(spare, inspect(ws, spare).used));

    /* THE DENOMINATOR IS EVERY WORKSPACE, and this case is the one the first draft got wrong on its
       first real run: a tag drawn in one repo's workspace and not the other's is used, not unused. */
    const otherWs = { model: { softwareSystems: [{ id: 's9', name: 'Bank', containers: [] }] }, views: { systemContextViews: [{ key: 'Ctx', elements: [{ id: 's9' }] }] } };
    const union = new Set([...inspect(ws, theme).used, ...inspect(otherWs, theme).used]);
    say('a tag drawn by one workspace is not reported unused because another does not draw it', !unseenStyles(theme, union).some((f) => f.where === 'Channel'), unseenStyles(theme, union));

    /* THE IMPLICIT KINDS MUST NOT FIRE IT EITHER. */
    const withKinds = { ...theme, elements: [...theme.elements, { tag: 'Person', shape: 'Person' }, { tag: 'Software System' }] };
    say('the renderer\'s own implicit kind tags are never reported as unused', !unseenStyles(withKinds, inspect(ws, withKinds).used).length, unseenStyles(withKinds, inspect(ws, withKinds).used));

    const fullKey = () => 'Boundary, Software System Container Container, Channel Person Asynchronous Relationship';
    say('an exported key naming every style the view uses is clean', !rules(inspect(ws, theme, { keyText: fullKey })).includes('unnamed-on-the-key'), inspect(ws, theme, { keyText: fullKey }).findings);

    const shortKey = () => 'Boundary, Software System Container Person Relationship';
    say('an exported key that omits a line style the view uses is caught', rules(inspect(ws, theme, { keyText: shortKey })).includes('unnamed-on-the-key'), rules(inspect(ws, theme, { keyText: shortKey })));

    say('a view with no exported key is skipped rather than failed', !rules(inspect(ws, theme, { keyText: () => null })).includes('unnamed-on-the-key'), inspect(ws, theme, { keyText: () => null }).findings);

    say('svgText strips markup so a key can be searched as words', svgText('<svg><text>Container,&#160;Channel</text></svg>').includes('Container'), svgText('<svg><text>Container, Channel</text></svg>'));

    /* THE DECLARED STATES MUST BE REACHABLE. Before the review that produced these three cases,
       STATES named four words and inspect returned none of them — an unreachable declaration, which
       every other rule in the catalogue passes because the code reads perfectly well. */
    say('inspect returns a state, and it is one of the declared four', STATES.includes(inspect(ws, theme).state), inspect(ws, theme).state);
    say('a workspace with a finding says findings, not clean', inspect(untagged, theme).state === 'findings', inspect(untagged, theme).state);

    /* AND THE WHOLE JOB IS ONE CALL, so a caller cannot get the order wrong. A root with no
       architecture directory is UNEVALUABLE with a reason, never a clean zero. */
    const nowhere = audit({ root: '/nonexistent-' + Date.now() });
    say('audit on a root with nothing in it is UNEVALUABLE with a reason, never clean', nowhere.state === 'UNEVALUABLE' && typeof nowhere.why === 'string' && nowhere.why.length > 10, nowhere);

    console.log(`\n${ok} of 12 held`);
    process.exit(ok === 12 ? 0 : 1);
  }

  /* THE COMMAND LINE PRINTS AN ANSWER IT DID NOT COMPUTE. Everything above this line used to live
     here, which meant the only correct use of this module was transcribed in a place no other
     caller could reach. */
  const a = audit({ root, svgDir: flag('--svg', null) });
  if (a.state === 'UNEVALUABLE') { console.log(`UNEVALUABLE — ${a.why}`); process.exit(3); }

  const show = (x) => console.log(`    FAIL ${x.rule}\n         ${x.where}\n         ${x.why}\n         ${x.cite}`);
  for (const w of a.workspaces) {
    console.log(`\n  diagram-key · ${path.relative(process.cwd(), w.file)} · ${w.views} view(s)`);
    if (!w.findings.length) console.log('    every notation these views use is styled');
    for (const x of w.findings) show(x);
  }
  console.log(`\n  palette · ${a.used.size} tag(s) drawn across ${a.workspaces.length} workspace(s)`);
  if (!a.palette.length) console.log('    every palette row is drawn somewhere');
  for (const x of a.palette) show(x);

  console.log(`\n  ${a.total} finding(s)`);
  if (a.notChecked) console.log(`  NOT-CHECKED ${a.notChecked} view(s) have no exported key beside them — run the svg export to compare the rendered key against the model`);
  process.exit(a.total ? 1 : 0);
}
