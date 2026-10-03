#!/usr/bin/env node
/* page — one self-contained HTML page per model: every view, every feature trace walkable step by
 * step, and every decision, in a single file that opens anywhere.
 *
 *   node tools/page.mjs [<project>] [--root <repo>] [--json]
 *   node tools/page.mjs --negative
 *
 * WHY IT EXISTS. The viewer is the working surface, and it needs the exported site beside it: a
 * vendored renderer, a base64 workspace and a static server, because it fetches JSON and `file://`
 * will not do. That is right for the person drawing the model and wrong for the person it is drawn
 * FOR. Showing a reviewer a model meant sending a folder and a command. This writes one file per
 * model — architecture/<project>/page.html — that a browser opens from anywhere, including an email
 * attachment, with nothing to install and nothing to serve.
 *
 * WHAT A READER CAN DO WITH IT THAT A PICTURE CANNOT.
 *   · walk a trace: Back / Next / Show all, or Play, which steps through by itself; each hop lights
 *     up on the drawing as its step comes round, and the rest dims
 *   · open a box: click a software system or a container that has a view of its own and the page
 *     moves to what is inside it; a breadcrumb climbs back out
 *   · ask what passes through a box: the panel lists every trace that touches it — or anything
 *     inside it — and jumps to the first step that does
 * Every one of those is derived from the export. Nothing here invents a relationship, an order or a
 * scope: drill targets are the views' own softwareSystemId and containerId, steps are the dynamic
 * views' own order.
 *
 * HOW IT DRAWS, AND WHY NOT THE VIEWER'S RENDERER. structurizr-cli exports each view as Graphviz
 * DOT and Graphviz lays it out, so no browser is needed and the page builds in CI. It is NOT the
 * viewer's layout: the site lays out in the browser, and the Honest limits below record that a
 * Graphviz layout disagreed with it. The boxes, labels and arrows are the same; their positions are
 * not. The DOT is exported from workspace.json, not the DSL, so the drawing and the details beside
 * it come from the one document and cannot drift apart between two builds.
 *
 * ITS COLOURS ARE THE REPO'S, NOT THIS FILE'S. The plate is the theme's canvas, the accent is its
 * ramp, the delivery states are its own strokes, and the key is built from the rows the model
 * actually draws. A repo that adopts drawing-office gets a page in its own palette.
 *
 * IT CHECKS ITS OWN SEAMS BEFORE IT WRITES. Three joins can quietly fail, and each would render as a
 * page that looks fine and lies: a trace step whose arrow is not in the drawing (the walk would
 * highlight nothing), a box in a drawing with no element behind it (no details, no traces), and a
 * view with no drawing at all. Any of them makes that project FAILED, named, with no page written.
 *
 * IT NAMES A MISSING TOOL RATHER THAN THROWING, for the same reason tools/build.mjs does.
 *
 * IT FINDS MODELS BY THEIR DSL, as tools/build.mjs does, so a model nobody has exported is a row
 * that says so — not an absence that reads as green.
 *
 * exit 0 every page written · 1 a page was not written (FAILED or ABSENT) · 2 usage · 3 UNEVALUABLE */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPORT, theme as readTheme } from '../checks/projects.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(HERE, 'tools', 'page-template.html');

export const STATES = Object.freeze(['written', 'FAILED', 'ABSENT', 'UNEVALUABLE']);
export const OUT = 'page.html';
export const WORK = '.page';

/** Every model: a directory under architecture/ holding a workspace.dsl, exported or not. */
export function models(root, { read = fs } = {}) {
  const dir = path.join(root, 'architecture');
  let entries;
  try { entries = read.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return entries.filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, dir: path.join(dir, e.name), dsl: path.join(dir, e.name, 'workspace.dsl'), file: path.join(dir, e.name, EXPORT) }))
    .filter((p) => read.existsSync(p.dsl))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ── colour ───────────────────────────────────────────────────────────────────────────────────── */
const rgb = (hex) => { const h = String(hex).replace('#', '').trim(); const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const isHex = (s) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s ?? '').trim());
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const [r, g, b] = rgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const onColor = (bg) => (contrast('#000000', bg) >= contrast('#ffffff', bg) ? '#000000' : '#ffffff');
/** The colour if it reads on `bg`; otherwise moved toward black or white, whichever reads, until it does. */
export function readable(color, bg, min) {
  const to = onColor(bg);
  for (let t = 0; t <= 1.0001; t += 0.05) { const c = mix(color, to, t); if (contrast(c, bg) >= min) return c; }
  return to;
}

/** The pen Structurizr's grey system boundary is redrawn in: fixed per model, so the page can restyle it per mode. */
export const boundaryPen = (theme) => mix(isHex(theme.canvas) ? theme.canvas : '#1f2226', '#ffffff', 0.45);
const FONT = /^[\w\s,"'.-]{1,200}$/;
const DEFAULT_FONTS = {
  '--f-display': '"Archivo", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
  '--f-body': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
  '--f-mono': '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

/**
 * The page theme, if the repo names one: architecture/page-theme.json, a { light, dark } pair in the
 * shape 21st.dev's community themes use (background, foreground, card, primary, border, fonts…).
 * It dresses the page around the drawings; the drawings keep the model's palette. Absent is fine —
 * the page then derives its look from the model's theme. Never throws.
 */
export function readPageTheme(root, { read = fs } = {}) {
  const file = path.join(root, 'architecture', 'page-theme.json');
  if (!read.existsSync(file)) return { state: 'absent' };
  try {
    const t = JSON.parse(read.readFileSync(file, 'utf8'));
    const ok = (m) => m && ['background', 'foreground', 'card', 'primary', 'border', 'muted-foreground'].every((k) => isHex(m[k]));
    if (!ok(t.light) || !ok(t.dark)) return { state: 'refused', why: 'page-theme.json needs light and dark, each with hex background, foreground, card, primary, border and muted-foreground' };
    return { state: 'found', page: t };
  } catch (e) { return { state: 'refused', why: `page-theme.json could not be read (${e.message})` }; }
}

/**
 * The page's palette, light and dark. The plate follows the mode: white or black around drawings whose
 * boxes keep the model's own colours. Only the lines, boundaries and frames are restyled per mode (see
 * `hooks`), since those are what vanish on a light plate. With a page theme, the page wears its colours.
 */
export function tokens(theme, page = null) {
  const row = (tag) => (theme.elements ?? []).find((e) => e.tag === tag) ?? {};
  const pick = (v, d) => (isHex(v) ? v : d);
  const canvas = pick(theme.canvas, '#1f2226');
  const ramp = theme.ramp ?? ['Software System', 'Container', 'Component'];
  const sys = row(ramp[0]), con = row(ramp[1] ?? ramp[0]);
  const lineInk = pick((theme.relationships ?? [])[0]?.color, '#d7dbe3');
  const modified = pick(row('Modified').stroke, '#ffb454');
  const proposal = pick(row('Proposal').stroke, '#ff2fd0');
  const glow = pick(con.stroke, '#b9bdf5');

  // the two grounds: a page theme's own, or ones derived from the model's canvas
  const ground = (dark) => {
    const p = page?.[dark ? 'dark' : 'light'];
    if (p) return { paper: p.background, raise: p.card, ink: p.foreground, muted: p['muted-foreground'], rule: p.border, seed: p.primary, onSeed: p['primary-foreground'], plate: p.card };
    return dark
      ? { paper: mix(canvas, '#000000', 0.45), raise: mix(canvas, '#000000', 0.2), ink: '#eef0f4', muted: '#b9bfc9', rule: mix(canvas, '#ffffff', 0.16), seed: glow, plate: canvas }
      : { paper: mix('#f3f4f7', canvas, 0.06), raise: '#ffffff', ink: '#111317', muted: '#4b5059', rule: mix('#d4d7de', canvas, 0.05), seed: pick(sys.background, '#494d97'), plate: '#ffffff' };
  };
  const side = (dark) => {
    const g = ground(dark);
    const accent = readable(g.seed, g.paper, 4.5);
    const plateInk = readable(g.ink, g.plate, 7);
    return {
      '--paper': g.paper, '--raise': g.raise, '--ink': g.ink, '--muted': readable(g.muted, g.paper, 4.5), '--rule': g.rule,
      '--accent': accent, '--accent-ink': readable(g.seed, g.paper, 7),
      '--on-accent': isHex(g.onSeed) && contrast(g.onSeed, accent) >= 4.5 ? g.onSeed : onColor(accent),
      '--modified-ink': readable(modified, g.paper, 4.5), '--accepted': readable(dark ? '#7fc79a' : '#2f6b45', g.paper, 4.5), '--proposed': readable(proposal, g.paper, 4.5),
      '--plate': g.plate,
      '--plate-2': mix(g.plate, plateInk, dark ? 0.05 : 0.035),
      '--plate-rule': mix(g.plate, plateInk, dark ? 0.16 : 0.12),
      '--plate-ink': plateInk,
      '--plate-muted': readable(mix(plateInk, g.plate, 0.35), g.plate, 4.5),
      '--plate-accent': readable(page ? g.seed : glow, g.plate, 4.5),
      '--plate-proposed': readable(proposal, g.plate, 4.5),
      '--plate-boundary': readable(mix(g.plate, plateInk, 0.45), g.plate, 3),
      // the arrows: the model's own line colour where it reads (a dark plate), the page's muted ink where it does not
      '--plate-line': contrast(lineInk, g.plate) >= 4.5 ? lineInk : readable(g.muted, g.plate, 4.5),
    };
  };
  const fonts = page
    ? Object.fromEntries([['--f-display', page.light['font-sans']], ['--f-body', page.light['font-sans']], ['--f-mono', page.light['font-mono']]]
      .map(([k, v]) => [k, FONT.test(String(v ?? '')) ? String(v) : DEFAULT_FONTS[k]]))
    : DEFAULT_FONTS;
  const light = { ...side(false), ...fonts }, dark = side(true);
  const css = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v};`).join(' ');
  return { light: css(light), dark: css(dark), values: { light, dark } };
}

/**
 * Restyles, per mode, the few drawn colours that only read on the model's dark canvas: the arrows and
 * their labels, the system boundary, and a deployment node's canvas-filled frame. Keyed on the colours
 * the export really writes, so nothing else in a drawing is touched. The model's colours are hex, so
 * nothing from the theme can break out of the selector.
 */
export function hooks(theme) {
  const lines = [...new Set((theme.relationships ?? []).map((r) => r.color).filter(isHex).map((c) => c.toLowerCase()))];
  if (!lines.length) lines.push('#d7dbe3');
  const pen = boundaryPen(theme);
  const canvas = isHex(theme.canvas) ? theme.canvas.toLowerCase() : '#1f2226';
  return [
    ...lines.map((c) => `.drawing g.edge [stroke="${c}" i] { stroke: var(--plate-line); } .drawing g.edge [fill="${c}" i] { fill: var(--plate-line); }`),
    `.drawing g.cluster [stroke="${pen}" i] { stroke: var(--plate-boundary); } .drawing g.cluster [fill="${pen}" i] { fill: var(--plate-boundary); }`,
    // a boundary's name is text, so it is held to the text floor rather than the line's
    `.drawing g.cluster text[fill="${pen}" i] { fill: var(--plate-muted); }`,
    `.drawing g.cluster [fill="${canvas}" i] { fill: var(--plate); }`,
  ].join('\n');
}

/* ── the model ────────────────────────────────────────────────────────────────────────────────── */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DELIVERY = ['Modified', 'Proposal'];
/** C4's levels first, then the supplementary diagrams. */
const LEVELS = [['systemContextViews', 'C4 level 1'], ['containerViews', 'C4 level 2'], ['componentViews', 'C4 level 3'], ['dynamicViews', 'Trace'], ['deploymentViews', 'Deployment'], ['systemLandscapeViews', 'Landscape']];
const EXAMPLE = 'drawing-office.example';  // checks/hop-examples.mjs: the run's name, and .<hop> for each hop

/** An ADR's sections (Status, Context, Decision, Consequences) as one line each. */
export function sections(md) {
  const out = {};
  for (const m of String(md ?? '').matchAll(/^## (\w+)\n\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)) out[m[1].toLowerCase()] = m[2].split(/\s+/).join(' ').trim();
  return out;
}

/**
 * The export, read for the page: elements with their parents, views with their steps, decisions,
 * which box opens which view (`drill`), and which view sits above which (`up`, for the breadcrumb).
 */
export function readModel(ws, theme = {}) {
  const suffixes = Object.values(theme.deliveryLabels ?? {}).map((l) => String(l).trim()).filter(Boolean);
  const unlabel = (d) => suffixes.reduce((s, l) => s.replace(new RegExp(`\\s*${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), ''), String(d ?? ''));
  const notOurs = theme.notOurs ?? ['Person', 'Existing System'];
  const elements = {}, rels = {}, decisions = [], tags = new Set(), relTags = new Set();
  const record = (scope, d) => decisions.push({ scope, id: String(d.id), title: d.title, status: d.status, date: String(d.date ?? '').slice(0, 10), ...sections(d.content) });
  const take = (e, kind, parent) => {
    const t = String(e.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    t.forEach((x) => tags.add(x));
    const own = e.documentation?.decisions ?? [];
    elements[e.id] = {
      name: e.name, kind, tech: e.technology ?? '', desc: unlabel(e.description),
      ours: !t.some((x) => notOurs.includes(x)), state: DELIVERY.find((s) => t.includes(s)) ?? null,
      decisions: own.map((d) => ({ id: String(d.id), title: d.title, status: d.status ?? '' })), parent,
      perspectives: (e.perspectives ?? []).map((x) => ({ name: String(x.name ?? ''), desc: String(x.description ?? '') })),
    };
    for (const d of own) record(e.name, d);
    for (const r of e.relationships ?? []) {
      String(r.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => relTags.add(x));
      rels[r.id] = { from: r.sourceId, to: r.destinationId, tech: r.technology ?? '', async: String(r.tags ?? '').includes('Asynchronous') };
    }
    for (const c of e.containers ?? []) take(c, 'Container', e.id);
    for (const c of e.components ?? []) take(c, 'Component', e.id);
  };
  for (const d of ws.documentation?.decisions ?? []) record(null, d);
  for (const p of ws.model?.people ?? []) take(p, 'Person', null);
  for (const s of ws.model?.softwareSystems ?? []) take(s, 'Software system', null);
  // Deployment: nodes hold instances of the containers and systems above; an instance points at its element.
  const instance = (i, refId, kind) => {
    const r = elements[refId] ?? {};
    elements[i.id] = { name: r.name ?? kind, kind, tech: r.tech ?? '', desc: r.desc ?? '', ours: r.ours ?? true, state: r.state ?? null, decisions: [], parent: null, ref: String(refId), perspectives: [] };
    for (const x of i.relationships ?? []) rels[x.id] = { from: x.sourceId, to: x.destinationId, tech: x.technology ?? '', async: String(x.tags ?? '').includes('Asynchronous') };
  };
  const node = (n, kind) => {
    String(n.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => tags.add(x));
    elements[n.id] = { name: n.name, kind, tech: n.technology ?? '', desc: unlabel(n.description), ours: true, state: null, decisions: [], parent: null, perspectives: [] };
    for (const x of n.relationships ?? []) rels[x.id] = { from: x.sourceId, to: x.destinationId, tech: x.technology ?? '', async: String(x.tags ?? '').includes('Asynchronous') };
    for (const c of n.children ?? []) node(c, 'Deployment node');
    for (const c of n.infrastructureNodes ?? []) node(c, 'Infrastructure node');
    for (const i of n.containerInstances ?? []) instance(i, i.containerId, 'Container instance');
    for (const i of n.softwareSystemInstances ?? []) instance(i, i.softwareSystemId, 'Software system instance');
  };
  for (const n of ws.model?.deploymentNodes ?? []) node(n, 'Deployment node');

  // A box marked because a box inside it is (the roll-up rule) says which ones.
  const inside = (id) => Object.entries(elements).filter(([, c]) => c.parent === id).flatMap(([k, c]) => [...(c.state ? [c.name] : []), ...inside(k)]);
  for (const [id, e] of Object.entries(elements)) if (e.state && e.decisions.length === 0) e.holds = inside(id);

  const views = LEVELS.flatMap(([kind, level]) => (ws.views?.[kind] ?? []).map((v) => ({
    key: String(v.key), kind, level, title: String(v.title || v.key), desc: String(v.description ?? ''),
    scope: v.softwareSystemId ?? v.containerId ?? v.elementId ?? null,
    elements: (v.elements ?? []).map((e) => String(e.id)),
    example: v.properties?.[EXAMPLE] ? String(v.properties[EXAMPLE]) : '',
    steps: kind === 'dynamicViews'
      ? (v.relationships ?? []).slice().sort((a, b) => Number(a.order) - Number(b.order))
        .map((r) => ({ n: Number(r.order), ...rels[r.id], desc: String(r.description ?? ''), example: String(v.properties?.[`${EXAMPLE}.${r.order}`] ?? '') }))
      : [],
  })));

  // Drill-down: a system opens its container view, a container its component view.
  const drill = {};
  for (const v of views) {
    if (v.kind === 'containerViews' && v.scope && !drill[v.scope]) drill[v.scope] = v.key;
    if (v.kind === 'componentViews' && v.scope && !drill[v.scope]) drill[v.scope] = v.key;
  }
  // An instance in a deployment view opens what its container or system opens.
  for (const [id, e] of Object.entries(elements)) if (e.ref && drill[e.ref]) drill[id] = drill[e.ref];
  // The view one level up: component → its system's containers → that system's context → the landscape.
  const first = (kind, scope) => views.find((v) => v.kind === kind && (scope == null || String(v.scope) === String(scope)))?.key ?? null;
  for (const v of views) {
    const sysOf = (id) => (elements[id]?.parent ? sysOf(elements[id].parent) : id);
    if (v.kind === 'componentViews') v.up = drill[elements[v.scope]?.parent] ?? first('systemContextViews', elements[v.scope]?.parent);
    else if (v.kind === 'containerViews') v.up = first('systemContextViews', v.scope) ?? first('systemLandscapeViews');
    else if (v.kind === 'systemContextViews') v.up = first('systemLandscapeViews');
    else if (v.kind === 'deploymentViews') v.up = (v.scope ? first('systemContextViews', v.scope) : null) ?? first('systemLandscapeViews');
    // `dynamic *` hangs off the landscape; a trace in a container with no component view, off its system's containers
    else if (v.kind === 'dynamicViews') v.up = v.scope == null
      ? first('systemLandscapeViews') ?? first('systemContextViews')
      : drill[v.scope] ?? drill[elements[v.scope]?.parent] ?? first('systemContextViews', sysOf(v.scope)) ?? first('systemLandscapeViews');
    else v.up = null;
    if (v.up === v.key) v.up = null;
  }
  return { elements, views, decisions, drill, tags: [...tags], relTags: [...relTags] };
}

/* ── the drawings ─────────────────────────────────────────────────────────────────────────────── */
/** The only markup Structurizr writes inside a label. Everything else in one is the model's own text. */
const TOKENS = /(<font point-size="[\d.]+"(?: color="#[0-9a-fA-F]{3,8}")?>|<\/font>|<br \/>)/;
const escapeLabel = (body) => body.split(TOKENS).map((part, i) => (i % 2 ? part : part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))).join('');

/**
 * Structurizr's DOT, ready for the plate: no caption (the page has a title block), no background —
 * and the two things its export leaves unescaped in a label, which Graphviz refuses outright.
 * MEASURED, not imagined: "Sessions & Turns" (a bare ampersand: "not well-formed") and a step that
 * reads "for the <owner>" (an "Unknown HTML element"); "latency < 200ms" and "Map<K, V>" fail the
 * same way. Structurizr escapes nothing, so every label's text is escaped here and only its own three
 * tokens — <font point-size>, </font>, <br /> — are left as markup. Every label it writes opens with
 * <font and closes with </font>, which is how the end of one is found without parsing the model text.
 */
export function prepareDot(dot) {
  return dot
    .replace(/\n {2}label=<<br \/>[\s\S]*?>>\n/, '\n')
    .replace('graph [fontname="Arial", ', 'graph [fontname="Arial", bgcolor="transparent", pad="0.4", ')
    // a label ends where </font>> meets whitespace, a comma, a bracket or a semicolon: node labels end
    // in ", style=…", a boundary's label at the end of its line
    .replace(/label=<(<font[\s\S]*?<\/font>)>(?=[\s,\];])/g, (_m, body) => `label=<${escapeLabel(body)}>`);
}

/**
 * Graphviz's SVG, made addressable: every box carries its element id (and the view it opens), every
 * arrow its endpoints and its step number. Returns what it found, so the seams can be checked.
 */
export function cleanSvg(svg, key, model, { stateStrokes = [], boundary = '#7d8694' } = {}) {
  let s = String(svg).replace(/<\?xml[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>|<!--[\s\S]*?-->/g, '');
  const box = /viewBox="([\d. -]+)"/.exec(s);
  if (!box) return { svg: null, why: `${key}: Graphviz wrote no viewBox`, nodes: [], steps: [] };
  const [, , w, h] = box[1].trim().split(/\s+/).map(Number);
  s = s.replace(/<svg width="[^"]+" height="[^"]+"/, `<svg class="drawing" data-w="${w.toFixed(1)}" data-h="${h.toFixed(1)}" role="img" aria-label="${esc(key)} diagram" preserveAspectRatio="xMinYMin meet"`);
  const steps = [], nodes = [];
  s = s.replace(/<g id="[^"]*" class="edge">([\s\S]*?)<\/g>/g, (_m, body) => {
    const pair = /<title>(\d+)&#45;&gt;(\d+)<\/title>/.exec(body);
    const step = /<text[^>]*>(\d+)\. /.exec(body);
    if (step) steps.push(Number(step[1]));
    return `<g class="edge"${pair ? ` data-from="${pair[1]}" data-to="${pair[2]}"` : ''}${step ? ` data-step="${step[1]}"` : ''}>${body}</g>`;
  });
  s = s.replace(/<g id="([^"]*)" class="node">/g, (_m, id) => {
    nodes.push(id);
    const e = model.elements[id];
    const opens = model.drill[id] && model.drill[id] !== key ? ` data-drill="${esc(model.drill[id])}"` : '';
    return `<g class="node" data-el="${esc(id)}"${opens} tabindex="0" role="button" aria-label="${esc(e ? `${e.name}, ${e.kind}` : id)}">`;
  });
  s = s.replace(/<g id="[^"]*" class="(graph|cluster)"/g, '<g class="$1"').replace(/<title>[\s\S]*?<\/title>/g, '');
  // Structurizr draws a system boundary in #444444, which a dark plate swallows.
  s = s.replaceAll('stroke="#444444"', `stroke="${boundary}" stroke-width="2"`).replaceAll('fill="#444444"', `fill="${boundary}"`);
  // A delivery state is the stroke: thick enough to read at a glance.
  for (const c of stateStrokes) s = s.replaceAll(`stroke="${c}"`, `stroke="${c}" stroke-width="6"`);
  return { svg: s.replace(/\n\s*\n/g, '\n').trim(), nodes, steps };
}

/**
 * The three joins that would make a page look right and lie. Returns the problems; none means the
 * page can be written.
 */
export function seams(model, drawings) {
  const problems = [];
  for (const v of model.views) {
    const d = drawings[v.key];
    if (!d?.svg) { problems.push(`${v.key}: no drawing${d?.why ? ` (${d.why})` : ''}`); continue; }
    for (const id of d.nodes) if (!model.elements[id]) problems.push(`${v.key}: a box (id ${id}) has no element behind it`);
    const drawn = new Set(d.steps);
    for (const s of v.steps) if (!drawn.has(s.n)) problems.push(`${v.key}: step ${s.n} has no arrow in the drawing, so the walk would light nothing`);
  }
  return problems;
}

/* ── the key ──────────────────────────────────────────────────────────────────────────────────── */
/** One row per theme style this model draws, in the theme's colours — never a style it does not use. */
export function key(theme, model) {
  const row = (tag) => (theme.elements ?? []).find((e) => e.tag === tag) ?? {};
  const has = (tag) => model.tags.includes(tag);
  const col = (v, d) => (isHex(v) ? v : d);
  const box = (bg, st, wide = 1) => `<svg width="26" height="16" aria-hidden="true"><rect x="2" y="2" width="22" height="12" rx="2" fill="${bg}" stroke="${st}" stroke-width="${wide}"/></svg>`;
  const rows = [];
  const ramp = (theme.ramp ?? ['Software System', 'Container', 'Component']).filter(has);
  if (ramp.length) {
    const swatch = ramp.map((t) => box(col(row(t).background, '#5f64af'), col(row(t).stroke, '#b9bdf5'))).join('');
    rows.push(`<li>${swatch}Ours${ramp.length > 1 ? ` (${ramp.map((t) => t.toLowerCase()).join(', ')})` : ''}</li>`);
  }
  const outside = (theme.notOurs ?? ['Person', 'Existing System']).filter(has);
  if (outside.length) { const r = row(outside[0]); rows.push(`<li>${box(col(r.background, '#32433b'), col(r.stroke, '#6fa588'))}Not ours</li>`); }
  if (has('Data Store')) {
    const r = row('Data Store'), bg = col(r.background, '#5f64af'), st = col(r.stroke, '#b9bdf5');
    rows.push(`<li><svg width="18" height="20" aria-hidden="true"><path d="M2 5 v10 a7 3 0 0 0 14 0 v-10" fill="${bg}" stroke="${st}"/><ellipse cx="9" cy="5" rx="7" ry="3" fill="${bg}" stroke="${st}"/></svg>Data store</li>`);
  }
  if (has('Channel')) {
    const r = row('Channel'), bg = col(r.background, '#5f64af'), st = col(r.stroke, '#b9bdf5');
    rows.push(`<li><svg width="30" height="16" aria-hidden="true"><path d="M5 3 H25 a3 5 0 0 1 0 10 H5 a3 5 0 0 1 0 -10 Z" fill="${bg}" stroke="${st}"/></svg>Channel</li>`);
  }
  if (has('Deployment Node')) { const r = row('Deployment Node'); rows.push(`<li>${box(col(r.background, '#1f2226'), col(r.stroke, '#9aa4b2'))}Deployment node</li>`); }
  const fill = col(row(theme.ramp?.[1] ?? 'Container').background, '#5f64af');
  if (has('Modified')) rows.push(`<li>${box(fill, col(row('Modified').stroke, '#ffb454'), 3)}Modified</li>`);
  if (has('Proposal')) rows.push(`<li>${box(fill, col(row('Proposal').stroke, '#ff2fd0'), 3)}Proposal</li>`);
  const line = col((theme.relationships ?? [])[0]?.color, '#d7dbe3');
  rows.push(`<li><svg width="30" height="10" aria-hidden="true"><path d="M1 5 H24" stroke="${line}" stroke-width="1.5"/><path d="M23 1 L29 5 L23 9 Z" fill="${line}"/></svg>Request</li>`);
  if (model.relTags.includes('Asynchronous')) rows.push(`<li><svg width="30" height="10" aria-hidden="true"><path d="M1 5 H24" stroke="${line}" stroke-width="1.5" stroke-dasharray="4 3"/><path d="M23 1 L29 5 L23 9 Z" fill="${line}"/></svg>Asynchronous</li>`);
  return rows.join('\n            ');
}

/* ── one page ─────────────────────────────────────────────────────────────────────────────────── */
export function render(template, { ws, model, drawings, theme, page = null, source, drawn }) {
  const t = tokens(theme, page);
  const data = {
    meta: { name: ws.name, drawn },
    elements: model.elements, views: model.views, decisions: model.decisions, drill: model.drill,
  };
  const thesis = String(ws.description ?? '');
  return template
    .replace('/*%%TOKENS%%*/', () => t.light)
    .replaceAll('/*%%TOKENS_DARK%%*/', () => t.dark)
    .replace('/*%%HOOKS%%*/', () => hooks(theme))
    .replace('%%TITLE%%', () => esc(`${ws.name} · architecture`))
    .replace('%%NAME%%', () => esc(ws.name))
    .replace('%%THESIS%%', () => esc(thesis))
    .replace('%%SOURCE%%', () => esc(source))
    .replace('<!--%%KEY%%-->', () => key(theme, model))
    .replace('<!--%%DRAWINGS%%-->', () => model.views.map((v) => `<template id="drawing-${esc(v.key)}">${drawings[v.key].svg}</template>`).join('\n'))
    .replace('/*%%DATA%%*/', () => JSON.stringify(data).replace(/</g, '\\u003c'));
}

/** The toolchain, or the reason there is not one. Never throws. */
export function need({ run = (cmd) => execSync(cmd, { stdio: 'pipe' }) } = {}) {
  for (const [cmd, why] of [
    ['structurizr-cli version', 'structurizr-cli is not on PATH — it exports each view as Graphviz DOT: brew install structurizr-cli'],
    ['dot -V', 'Graphviz is not on PATH — it lays the drawings out: brew install graphviz'],
  ]) {
    try { run(cmd); } catch { return { why }; }
  }
  return { ok: true };
}

/** Builds one project's page. Returns { state, why?, out?, views?, kb? }. */
export function buildOne(p, { theme, page = null, template, root, drawn, exec = execFileSync }) {
  const dsl = path.join(p.dir, 'workspace.dsl');
  if (!fs.existsSync(p.file)) return { state: 'ABSENT', why: `not exported: there is no ${EXPORT} yet; npm run build writes it` };
  let ws;
  try { ws = JSON.parse(fs.readFileSync(p.file, 'utf8')); }
  catch (e) { return { state: 'FAILED', why: `${EXPORT} could not be read (${e.message})` }; }
  const model = readModel(ws, theme);
  if (!model.views.length) return { state: 'ABSENT', why: 'the model declares no views' };
  const work = path.join(p.dir, WORK);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  const failed = {};
  try {
    exec('structurizr-cli', ['export', '-w', p.file, '-f', 'dot', '-o', work], { stdio: 'pipe' });
    const dots = fs.readdirSync(work).filter((f) => f.endsWith('.dot'));
    for (const f of dots) fs.writeFileSync(path.join(work, f), prepareDot(fs.readFileSync(path.join(work, f), 'utf8')));
    for (const f of dots) {
      try { exec('dot', ['-Tsvg', '-O', f], { stdio: 'pipe', cwd: work }); }
      catch (e) { failed[f.replace(/^structurizr-|\.dot$/g, '')] = String(e.stderr ?? e.message).trim().split('\n')[0]; }
    }
  } catch (e) {
    fs.rmSync(work, { recursive: true, force: true });
    return { state: 'FAILED', why: `the export did not run: ${String(e.stderr ?? e.message).trim().split('\n').pop()}` };
  }
  const stateStrokes = (theme.elements ?? []).filter((r) => DELIVERY.includes(r.tag) && isHex(r.stroke)).map((r) => r.stroke.toLowerCase());
  const boundary = boundaryPen(theme);
  const drawings = {};
  for (const v of model.views) {
    const file = path.join(work, `structurizr-${v.key}.dot.svg`);
    drawings[v.key] = fs.existsSync(file) && !failed[v.key]
      ? cleanSvg(fs.readFileSync(file, 'utf8'), v.key, model, { stateStrokes, boundary })
      : { svg: null, why: failed[v.key] ? `Graphviz: ${failed[v.key]}` : 'Graphviz wrote no SVG for it', nodes: [], steps: [] };
  }
  fs.rmSync(work, { recursive: true, force: true });
  const problems = seams(model, drawings);
  if (problems.length) return { state: 'FAILED', why: problems.join('; ') };
  const html = render(template, { ws, model, drawings, theme, page, source: path.relative(root, dsl), drawn });
  const out = path.join(p.dir, OUT);
  fs.writeFileSync(out, html);
  return { state: 'written', out, views: model.views.length, traces: model.views.filter((v) => v.steps.length).length, decisions: model.decisions.length, kb: Math.round(html.length / 1024) };
}

/* ── the planted faults ───────────────────────────────────────────────────────────────────────
   The subjects are the joins this module makes: drill targets, the breadcrumb, the seams, the key
   and the palette. structurizr-cli and Graphviz are somebody else's software and are not asserted. */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN && process.argv.includes('--negative')) {
  let ok = 0, n = 0;
  const say = (name, pass, saw) => { n++; console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 300)}`}`); if (pass) ok++; };
  const THEME = {
    canvas: '#1F2226', ramp: ['Software System', 'Container', 'Component'], notOurs: ['Person', 'Existing System'],
    deliveryLabels: { Modified: 'modified — hover for details' },
    elements: [{ tag: 'Software System', background: '#494d97', stroke: '#a5a9f0' }, { tag: 'Container', background: '#5f64af', stroke: '#b9bdf5' },
      { tag: 'Person', background: '#32433b', stroke: '#6fa588' }, { tag: 'Modified', stroke: '#ffb454' }, { tag: 'Proposal', stroke: '#ff2fd0' }],
    relationships: [{ tag: 'Relationship', color: '#d7dbe3' }],
  };
  const WS = {
    name: 'Shop', description: 'A shop',
    model: {
      people: [{ id: '1', name: 'Buyer', tags: 'Element,Person', relationships: [{ id: '20', sourceId: '1', destinationId: '3' }] }],
      softwareSystems: [{ id: '2', name: 'Shop', tags: 'Element,Software System', containers: [
        { id: '3', name: 'Web', tags: 'Element,Container', relationships: [{ id: '21', sourceId: '3', destinationId: '4', tags: 'Relationship,Asynchronous' }], components: [{ id: '5', name: 'Cart', tags: 'Element,Component,Modified', description: 'Holds items modified — hover for details' }] },
        { id: '4', name: 'Orders', tags: 'Element,Container' },
      ] }],
    },
    views: {
      systemContextViews: [{ key: 'Context', softwareSystemId: '2', elements: [{ id: '1' }, { id: '2' }] }],
      containerViews: [{ key: 'Containers', softwareSystemId: '2', elements: [{ id: '1' }, { id: '3' }, { id: '4' }] }],
      componentViews: [{ key: 'Components', containerId: '3', elements: [{ id: '5' }] }],
      dynamicViews: [{ key: 'Buy', elementId: '2', relationships: [{ id: '21', order: '2', description: 'places' }, { id: '20', order: '1', description: 'opens' }] }],
    },
  };
  const m = readModel(WS, THEME);
  say('a system opens its container view', m.drill['2'] === 'Containers', m.drill);
  say('a container opens its component view', m.drill['3'] === 'Components', m.drill);
  say('a box with no view inside it opens nothing', m.drill['4'] === undefined && m.drill['1'] === undefined, m.drill);
  const up = Object.fromEntries(m.views.map((v) => [v.key, v.up]));
  const star = readModel({ ...WS, views: { ...WS.views, systemLandscapeViews: [{ key: 'Land', elements: [{ id: '1' }, { id: '2' }] }], dynamicViews: [{ key: 'Everything', relationships: [] }, { key: 'InOrders', elementId: '4', relationships: [] }] } }, THEME);
  const upStar = Object.fromEntries(star.views.map((v) => [v.key, v.up]));
  say('a `dynamic *` trace hangs off the landscape', upStar.Everything === 'Land', upStar);
  say('a trace in a container with no component view hangs off its system\u2019s containers', upStar.InOrders === 'Containers', upStar);
  say('the breadcrumb climbs component → containers → context', up.Components === 'Containers' && up.Containers === 'Context' && up.Context === null, up);
  say("a trace sits under the view of the box it is scoped to", up.Buy === 'Containers', up);
  say('trace steps follow the DSL order, not the export order', m.views.find((v) => v.key === 'Buy').steps.map((s) => s.n).join() === '1,2', m.views.find((v) => v.key === 'Buy').steps);
  say('the delivery label is taken off the description', m.elements['5'].desc === 'Holds items' && m.elements['5'].state === 'Modified', m.elements['5']);
  say('a person is not ours', m.elements['1'].ours === false && m.elements['3'].ours === true, [m.elements['1'].ours, m.elements['3'].ours]);

  const svg = (edges, nodes) => `<svg width="10pt" height="10pt" viewBox="0.00 0.00 400.00 300.00">${nodes.map((id) => `<g id="${id}" class="node"><title>${id}</title></g>`).join('')}${edges.map(([a, b, step]) => `<g id="e" class="edge"><title>${a}&#45;&gt;${b}</title><text>${step}. x</text></g>`).join('')}</svg>`;
  const good = { Context: cleanSvg(svg([], ['1', '2']), 'Context', m), Containers: cleanSvg(svg([], ['1', '3', '4']), 'Containers', m),
    Components: cleanSvg(svg([], ['5']), 'Components', m), Buy: cleanSvg(svg([['1', '3', 1], ['3', '4', 2]], ['1', '3', '4']), 'Buy', m) };
  say('a page whose joins all hold has no problems', seams(m, good).length === 0, seams(m, good));
  const noArrow = { ...good, Buy: cleanSvg(svg([['1', '3', 1]], ['1', '3', '4']), 'Buy', m) };
  say('a trace step with no arrow in the drawing is caught', seams(m, noArrow).some((p) => /step 2 has no arrow/.test(p)), seams(m, noArrow));
  const ghost = { ...good, Containers: cleanSvg(svg([], ['1', '3', '99']), 'Containers', m) };
  say('a box with no element behind it is caught', seams(m, ghost).some((p) => /id 99/.test(p)), seams(m, ghost));
  const missing = { ...good }; delete missing.Components;
  say('a view with no drawing is caught', seams(m, missing).some((p) => /Components: no drawing/.test(p)), seams(m, missing));
  say('a drawing without a viewBox is refused, not guessed', cleanSvg('<svg width="1pt" height="1pt"></svg>', 'X', m).svg === null, cleanSvg('<svg></svg>', 'X', m));
  say('a box that opens a view says so in the drawing', /data-el="2" data-drill="Containers"/.test(cleanSvg(svg([], ['1', '2']), 'Context', m).svg), cleanSvg(svg([], ['1', '2']), 'Context', m).svg.slice(0, 200));
  say('a box does not offer to open the view it is already in', !/data-el="2" data-drill/.test(cleanSvg(svg([], ['2']), 'Containers', m).svg), 'Containers');

  const dot = prepareDot('digraph {\n  graph [fontname="Arial", rankdir=LR]\n  1 [label=<<font point-size="34">Sessions & Turns</font><br /><br /><font point-size="19">for the <owner></font>>, shape=box]\n}');
  say('a bare ampersand in a label is escaped', dot.includes('Sessions &amp; Turns'), dot);
  say('a reader\u2019s angle-bracket word is escaped, not read as a tag', dot.includes('&lt;owner&gt;'), dot);
  const NASTY = ['latency < 200ms', 'p95 <= 200ms', 'a -> b', 'x > y', 'Map<K, V>', '<table>', '<sub>', 'x=<owner>', '<b-side>', 'R&D;', 'already &lt; escaped'];
  const nasty = prepareDot(`digraph {\n  graph [fontname="Arial", rankdir=LR]\n${NASTY.map((t, i) => `  ${i} [label=<<font point-size="34">${t}</font><br /><font point-size="19">${t}</font>>, shape=box]`).join('\n')}\n  0 -> 1 [label=<<font point-size="24">1. ${NASTY.join(' / ')}<br />[JSON/HTTPS]</font>>]\n}`);
  const leftovers = [...nasty.matchAll(/label=<(<font[\s\S]*?<\/font>)>(?=[\s,\];])/g)].map((m) => m[1].split(TOKENS).filter((_, i) => i % 2 === 0).join('')).filter((t) => /[<>]|&(?!amp;|lt;|gt;)/.test(t));
  say('no model text is left as markup in any label (11 hostile strings)', leftovers.length === 0, leftovers);
  say('text that was already an entity is shown as written, not unescaped', nasty.includes('already &amp;lt; escaped'), 'entity');
  // the shape structurizr-cli really writes: a boundary label ends its line, and the next box's label follows
  const real2 = 'digraph {\n  subgraph cluster_2 {\n    label=<<font point-size="24"><br />Payments</font><br /><font point-size="19">[Software System]</font>>\n    3 [id=3,shape=rect, label=<<font point-size="36">Checkout</font><br /><font point-size="26">a < b</font>>, style=filled]\n  }\n}';
  const prepared = prepareDot(real2);
  say('a boundary label and the next box label are escaped separately, delimiters intact', /label=<<font point-size="24">/.test(prepared) && /label=<<font point-size="36">Checkout/.test(prepared) && prepared.includes('a &lt; b') && !prepared.includes('label=&lt;'), prepared);
  say("Graphviz's own label tags survive", dot.includes('<font point-size="34">') && dot.includes('<br />') && dot.includes('label=<<font'), dot);
  say('the drawing sits on the plate: transparent, no caption', dot.includes('bgcolor="transparent"'), dot);

  const k = key(THEME, m);
  say('the key shows the styles the model draws', /Ours/.test(k) && /Not ours/.test(k) && /Modified/.test(k) && /Asynchronous/.test(k), k);
  say('and never one it does not', !/Proposal/.test(k) && !/Data store/.test(k), k);

  const t = tokens(THEME).values;
  say('the dark plate is the theme’s own canvas', t.dark['--plate'] === '#1F2226', t.dark['--plate']);
  say('the accent reads on the page, light and dark', contrast(t.light['--accent'], t.light['--paper']) >= 4.5 && contrast(t.dark['--accent'], t.dark['--paper']) >= 4.5, [t.light['--accent'], t.dark['--accent']]);
  say('text on the accent reads', contrast(t.light['--on-accent'], t.light['--accent']) >= 4.5, [t.light['--on-accent'], t.light['--accent']]);
  say('the walk’s highlight reads on the plate', contrast(t.light['--plate-accent'], t.light['--plate']) >= 4.5, t.light['--plate-accent']);
  say('a hostile colour in the theme is not written into the page', !/;\s*}/.test(tokens({ ...THEME, canvas: 'red;}body{x' }).light.replace(/;\s/g, ' ')) && tokens({ ...THEME, canvas: 'red;}body{x' }).values.dark['--plate'] === '#1f2226', tokens({ ...THEME, canvas: 'red;}body{x' }).values.dark['--plate']);
  const PAGE = {
    light: { background: '#f3f5fb', foreground: '#010101', card: '#ffffff', primary: '#19398d', 'primary-foreground': '#f3f5f9', border: '#e3e3e3', 'muted-foreground': '#454545', 'font-sans': 'Inter, ui-sans-serif, sans-serif, system-ui', 'font-mono': 'ui-monospace, Menlo, monospace' },
    dark: { background: '#050505', foreground: '#fafafa', card: '#0a0a0a', primary: '#6a8dd8', 'primary-foreground': '#0a0a0a', border: '#282828', 'muted-foreground': '#a1a1a1' },
  };
  for (const [label, tk] of [['the model theme', tokens(THEME)], ['a page theme', tokens(THEME, PAGE)]]) {
    const ok = ['light', 'dark'].every((mode) => { const v = tk.values[mode]; return contrast(v['--plate-line'], v['--plate']) >= 4.5 && contrast(v['--plate-ink'], v['--plate']) >= 7 && contrast(v['--plate-accent'], v['--plate']) >= 4.5 && contrast(v['--plate-boundary'], v['--plate']) >= 3 && contrast(v['--accent'], v['--paper']) >= 4.5 && contrast(v['--on-accent'], v['--accent']) >= 4.5; });
    say(`with ${label}, arrows, ink, highlight, boundary and accent all read in both modes`, ok, tk.values);
  }
  say('the plate follows the mode: white by day, the dark ground by night', tokens(THEME).values.light['--plate'] === '#ffffff' && tokens(THEME, PAGE).values.dark['--plate'] === '#0a0a0a', [tokens(THEME).values.light['--plate'], tokens(THEME, PAGE).values.dark['--plate']]);
  say('a page theme dresses the page in its own colours and fonts', tokens(THEME, PAGE).values.light['--paper'] === '#f3f5fb' && tokens(THEME, PAGE).values.light['--accent'] === '#19398d' && /^Inter/.test(tokens(THEME, PAGE).values.light['--f-body']), tokens(THEME, PAGE).values.light);
  say('a font that could break out of the stylesheet is refused for the default', !/body\{/.test(tokens(THEME, { ...PAGE, light: { ...PAGE.light, 'font-sans': 'x;}body{color:red' } }).light), 'font');
  say('on a dark plate the arrows keep the model’s own line colour', tokens(THEME).values.dark['--plate-line'] === '#d7dbe3', tokens(THEME).values.dark['--plate-line']);
  const hk = hooks(THEME);
  say('the restyling touches the arrows, the boundary and the frames — keyed on the colours the export writes', hk.includes('g.edge [stroke="#d7dbe3" i]') && hk.includes(`g.cluster [stroke="${boundaryPen(THEME)}" i]`) && hk.includes('g.cluster [fill="#1f2226" i]'), hk);
  const pt = (files) => readPageTheme('/r', { read: { existsSync: (f) => f in files, readFileSync: (f) => files[f] } });
  say('no page theme is fine, and says so', pt({}).state === 'absent', pt({}));
  say('a page theme missing a colour is refused with the reason', pt({ '/r/architecture/page-theme.json': JSON.stringify({ light: PAGE.light, dark: { ...PAGE.dark, card: 'black' } }) }).state === 'refused', pt({ '/r/architecture/page-theme.json': '{}' }));
  say('an unreadable page theme is refused, never thrown', pt({ '/r/architecture/page-theme.json': '{' }).state === 'refused', 'json');

  const depl = readModel({ ...WS, model: { ...WS.model, deploymentNodes: [{ id: '30', name: 'Server', tags: 'Element,Deployment Node', containerInstances: [{ id: '31', containerId: '3' }] }] }, views: { ...WS.views, deploymentViews: [{ key: 'Live', softwareSystemId: '2', elements: [{ id: '30' }, { id: '31' }] }] } }, THEME);
  say('a deployment view is a sheet, not dropped', depl.views.some((v) => v.key === 'Live' && v.level === 'Deployment'), depl.views.map((v) => v.key));
  say('an instance is named for its container and opens what the container opens', depl.elements['31'].name === 'Web' && depl.drill['31'] === 'Components', [depl.elements['31'], depl.drill['31']]);
  const ex = readModel({ ...WS, views: { ...WS.views, dynamicViews: [{ ...WS.views.dynamicViews[0], properties: { 'drawing-office.example': 'run 7', 'drawing-office.example.2': 'POST /orders' } }] } }, THEME);
  say('a worked example rides on its hop', ex.views.find((v) => v.key === 'Buy').steps.find((x) => x.n === 2).example === 'POST /orders' && ex.views.find((v) => v.key === 'Buy').example === 'run 7', ex.views.find((v) => v.key === 'Buy'));

  const html = render('<style>:root{/*%%TOKENS%%*/}</style><h1>%%NAME%%</h1><ul><!--%%KEY%%--></ul><!--%%DRAWINGS%%--><script>/*%%DATA%%*/</script>', { ws: { ...WS, name: 'A</script><b>' }, model: m, drawings: good, theme: THEME, source: 's', drawn: 'd' });
  say('a name cannot close the page’s script or inject markup', !/A<\/script>/.test(html) && /A&lt;\/script&gt;/.test(html), html.slice(0, 200));
  const built = render(fs.readFileSync(TEMPLATE, 'utf8'), { ws: WS, model: m, drawings: good, theme: THEME, source: 's', drawn: 'd' });
  say('the page declares UTF-8 before any text, so it reads right opened as a file', /^<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">/i.test(built), built.slice(0, 120));
  say('no placeholder is left in the page', !/%%[A-Z_]+%%/.test(built), (built.match(/%%[A-Z_]+%%/g) ?? []).join());
  say('the page asks the network for nothing, so it opens from an attachment offline', !/(src|href)="https?:/.test(built), (built.match(/(src|href)="https?:[^"]*/g) ?? []).join());

  const tree = (map) => ({ readdirSync: () => Object.keys(map).map((name) => ({ name, isDirectory: () => true })), existsSync: (q) => Object.entries(map).some(([d, fs_]) => fs_.some((f) => q.endsWith(`${d}/${f}`))) });
  const found = models('/r', { read: tree({ shop: ['workspace.dsl', 'workspace.json'], fresh: ['workspace.dsl'], notes: ['README.md'] }) });
  say('a model with a DSL and no export is found, so it can be reported rather than skipped', found.map((x) => x.name).join() === 'fresh,shop', found.map((x) => x.name));
  say('every view gets its drawing', ['Context', 'Containers', 'Components', 'Buy'].every((v) => html.includes(`id="drawing-${v}"`)), 'drawings');

  say('a missing structurizr-cli is named, never thrown', /structurizr-cli is not on PATH/.test(need({ run: () => { throw new Error('x'); } }).why ?? ''), need({ run: () => { throw new Error('x'); } }));
  say('a missing Graphviz is named separately', /Graphviz is not on PATH/.test(need({ run: (c) => { if (c.startsWith('dot')) throw new Error('x'); } }).why ?? ''), 'dot');
  say('every declared state is one this module can return', STATES.length === 4 && STATES.includes('UNEVALUABLE'), STATES);

  console.log(`\n${ok} of ${n} held`);
  process.exit(ok === n ? 0 : 1);
}

/* ── the run ──────────────────────────────────────────────────────────────────────────────────── */
if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const flagAt = argv.indexOf('--root');
  if (flagAt >= 0 && (!argv[flagAt + 1] || argv[flagAt + 1].startsWith('--'))) { console.log('\n  page · usage: node tools/page.mjs [<project>] [--root <repo>] [--json]'); process.exit(2); }
  const ROOT = flagAt >= 0 ? path.resolve(argv[flagAt + 1]) : HERE;
  // the value after --root is not a project name; with no --root there is no such value to skip
  const positional = argv.filter((a, i) => !a.startsWith('--') && (flagAt < 0 || i !== flagAt + 1));
  const only = positional[0];
  const report = (rows, code) => {
    if (json) console.log(JSON.stringify({ rows }, null, 2));
    else for (const r of rows) console.log(`  page · ${r.name.padEnd(18)} ${r.state}${r.state === 'written' ? ` — ${path.relative(ROOT, r.out)}: ${r.views} views, ${r.traces} traces, ${r.decisions} decisions, ${r.kb} KB` : ` — ${r.why}`}`);
    process.exit(code);
  };

  const gate = need();
  if (gate.why) { console.log(`\n  page · UNEVALUABLE — ${gate.why}`); process.exit(3); }
  const th = readTheme(ROOT);
  if (th.state !== 'found') { console.log(`\n  page · UNEVALUABLE — ${th.why}`); process.exit(3); }
  const all = models(ROOT);
  if (!all.length) { console.log('\n  page · ABSENT — no workspace.dsl under architecture/, so there is no model to draw'); process.exit(1); }
  const list = all.filter((p) => !only || p.name === only);
  if (only && !list.length) { console.log(`\n  page · no model called "${only}" under architecture/`); process.exit(2); }

  const pt = readPageTheme(ROOT);
  if (pt.state === 'refused') { console.log(`\n  page · UNEVALUABLE — ${pt.why}`); process.exit(3); }
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  const drawn = new Date().toISOString().slice(0, 10);
  const rows = list.map((p) => ({ name: p.name, ...buildOne(p, { theme: th.theme, page: pt.page ?? null, template, root: ROOT, drawn }) }));
  report(rows, rows.every((r) => r.state === 'written') ? 0 : 1);
}
