#!/usr/bin/env node
/**
 * PANEL DATA — everything the control panel shows, computed on request, with its provenance.
 *
 * WHAT THE PANEL IS FOR. The operator asked to see the plan in the drawing office with colour for
 * proposal, modified and built, and for the office to become effective for REVIEWING the factory.
 * The plates carry the two computed axes; what they lacked was the act and the numbers. This module
 * is the reader behind architecture/panel.html: it turns the plan files, the factory's stores, its
 * declared servers, its tracked tree and its decisions ledger into ONE JSON, and every figure in it
 * carries the query or file that produced it. ADR 0002 in architecture/factory/adrs.
 *
 * THE FIVE RULES, each one a defect that already happened somewhere in this factory:
 *   a tile never shows a number without the query under it          (CF-079: typed figures)
 *   absence is spelled UNEVALUABLE or ABSENT, never 0                 (CF-019: absence passes)
 *   a row carries the SESSION that owns it, read from the plan file it came from — several
 *   sessions run in parallel and one table must not mix their rows silently
 *   a server is a machine with a state, ONLINE / OFFLINE / NO-PORT, not a row that is discounted
 *   when its store is unreadable                                       (CF-111: phoenix off all day)
 *   last used is a recorded EXECUTION from the fire ledger, never an mtime (factory/file-heat's rule)
 *
 * ROWS COME FROM THE PLAN FILES UNTIL STEP P. One plan per session lives under ~/.claude/plans and
 * carries the SSOT action table (the header cell reads "capability landed"). The panel reads every
 * plan under that directory, so the session filter is the plan the row came from. When step P moves
 * rows into the drawing office model, `stageOf` already reads an element carrying the property
 * drawing-office.checkpoint = <row id>; until then every row reads `not drawn`, which is the truth.
 *
 * IT WRITES NOTHING. The one act, approve or reject, is built here as a row (`approveRow`, pure) and
 * WRITTEN by the factory's own ledger door, prongs/record.mjs::add('pd'), which tools/serve.mjs calls.
 * The row cites the sha of the row text it approved, so an approval survives the source swap.
 *
 *   node tools/panel-data.mjs --factory <design-loop> [--plans <dir>] [--office <dir>]   the JSON
 *   node tools/panel-data.mjs --negative                                                 planted faults
 *
 * exit 0 · 1 negative did not hold · 3 UNEVALUABLE (no factory named)
 */
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['ok', 'UNEVALUABLE']);
export const MACHINE_STATES = Object.freeze(['ONLINE', 'OFFLINE', 'NO-PORT']);
export const TILE_STATES = Object.freeze(['read', 'EMPTY', 'ABSENT', 'UNEVALUABLE']);
export const CHECKPOINT_PROPERTY = 'drawing-office.checkpoint';
export const SESSION_PROPERTY = 'drawing-office.session';
export const PLAN_HEADER = 'capability landed';
export const ELEMENT_PREFIX = 'checkpoint:';

/* ── THE PLAN TABLE ─────────────────────────────────────────────────────────────────────────── */
/* Bold and code marks are markdown for the plan's reader; the panel prints words. */
const cell = (s) => String(s ?? '').trim().replace(/\*\*/g, '').replace(/`/g, '').trim();
const splitRow = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

/** parsePlanTable(md, {slug, title}) -> rows of the first table whose header names the SSOT. Pure. */
export function parsePlanTable(md, { slug = 'plan', title = null } = {}) {
  const lines = String(md ?? '').split('\n');
  const rows = [];
  let inTable = false, cols = null;
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) { if (inTable) break; continue; }
    const cells = splitRow(line);
    if (!inTable) {
      if (cells.some((c) => c.toLowerCase().includes(PLAN_HEADER))) { inTable = true; cols = cells.map((c) => c.toLowerCase()); }
      continue;
    }
    if (cells.every((c) => /^-+$/.test(c))) continue;
    if (cells.length < 4) continue;
    const id = cell(cells[0]);
    if (!id) continue;
    rows.push({ id, capability: cell(cells[1]), office: cell(cells[2]), panel: cell(cells[3]), stop: cell(cells[4] ?? ''), session: slug, session_title: title, raw: line.trim(), sha: sha(line.trim()) });
  }
  return rows;
}

export const sha = (text) => crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, 16);

/** Every plan under a directory, each parsed; a file with no SSOT table contributes no rows. */
export function readPlans(dir) {
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => n.endsWith('.md')).sort(); } catch (e) { return { state: 'UNEVALUABLE', why: `${dir} could not be read (${e.message})`, files: [] }; }
  const files = [];
  for (const n of names) {
    let md; try { md = fs.readFileSync(path.join(dir, n), 'utf8'); } catch { continue; }
    const slug = n.replace(/\.md$/, '');
    const title = (md.match(/^#\s+(.+)$/m) || [])[1]?.trim().slice(0, 80) ?? null;
    const rows = parsePlanTable(md, { slug, title });
    if (rows.length) files.push({ slug, title, file: path.join(dir, n), rows: rows.length, items: rows });
  }
  return { state: 'ok', dir, files };
}

/* ── STAGE, FROM THE MODEL WHEN A BOX EXISTS ─────────────────────────────────────────────────── */
export function stageOf(rowId, ws, overlay) {
  const els = [];
  const take = (e) => els.push(e);
  for (const p of ws?.model?.people ?? []) take(p);
  for (const s of ws?.model?.softwareSystems ?? []) { take(s); for (const c of s.containers ?? []) { take(c); for (const k of c.components ?? []) take(k); } }
  const el = els.find((e) => String(e.properties?.[CHECKPOINT_PROPERTY] ?? '') === String(rowId));
  if (!el) return { stage: 'not drawn', elementId: null };
  const o = overlay?.[String(el.id)] ?? overlay?.elements?.[String(el.id)] ?? null;
  return { stage: o?.stage ?? o?.state ?? 'designed', elementId: String(el.id), session: el.properties?.[SESSION_PROPERTY] ?? null };
}

/* ── STORES: A COUNT WITH ITS QUERY, OR THE REASON THERE IS NONE ────────────────────────────── */
function countJsonl(file) {
  let text; try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  let n = 0, torn = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); if (!r || r._header) continue; n++; } catch { torn++; }
  }
  return { n, torn };
}

export function storeTile(store, factory) {
  const query = String(store.query ?? '').trim();
  const base = { id: store.id, name: store.name ?? store.id, path: store.path ?? null, query: query || null };
  if (!query) return { ...base, state: 'UNEVALUABLE', count: null, why: 'the store declares no query; a tile with no query is a label' };
  if (/<[^>]+>/.test(query)) return { ...base, state: 'UNEVALUABLE', count: null, why: 'the query carries a placeholder and cannot run as written (PR-056)' };
  const p = store.path ? String(store.path) : '';
  if (p.endsWith('.jsonl')) {
    const abs = path.isAbsolute(p) ? p : path.join(factory, p);
    if (!fs.existsSync(abs)) return { ...base, state: 'ABSENT', count: null, why: `${p} is not on disk` };
    const c = countJsonl(abs);
    if (!c) return { ...base, state: 'UNEVALUABLE', count: null, why: `${p} could not be read` };
    return { ...base, state: c.n ? 'read' : 'EMPTY', count: c.n, torn: c.torn, why: `rows of ${p}, header row excluded${c.torn ? `, ${c.torn} torn` : ''}` };
  }
  if (p.endsWith('.db')) return { ...base, state: 'UNEVALUABLE', count: null, why: `${p} is sqlite; this reader counts files, the query beside it is what answers` };
  return { ...base, state: 'UNEVALUABLE', count: null, why: p ? `${p} is a module, not a file; run the query` : 'no path declared' };
}

export function storesOf(factory) {
  let pipe; try { pipe = JSON.parse(fs.readFileSync(path.join(factory, 'core', 'pipe.json'), 'utf8')); } catch (e) { return { state: 'UNEVALUABLE', why: `core/pipe.json unreadable (${e.message})`, tiles: [] }; }
  return { state: 'ok', source: 'core/pipe.json stores[]', tiles: (pipe.stores ?? []).map((s) => storeTile(s, factory)) };
}

/* ── MACHINES: THE DECLARED SERVERS, PROBED ─────────────────────────────────────────────────── */
/* BOTH LOOPBACK FAMILIES ARE TRIED. A Node server that listens without a host binds `::`, and the
   harness's preview servers bind the same way; a probe of 127.0.0.1 alone reported the office on
   8017 OFFLINE while a browser had it open (measured 2026-09-07). ONLINE on either family is ONLINE. */
const probeOne = (port, host, timeout) => new Promise((resolve) => {
  const s = net.connect({ port, host });
  const done = (state) => { try { s.destroy(); } catch { /* closed */ } resolve(state); };
  s.setTimeout(timeout, () => done('OFFLINE'));
  s.once('connect', () => done('ONLINE'));
  s.once('error', () => done('OFFLINE'));
});
export async function probe(port, { hosts = ['127.0.0.1', '::1'], timeout = 700 } = {}) {
  for (const h of hosts) if ((await probeOne(port, h, timeout)) === 'ONLINE') return 'ONLINE';
  return 'OFFLINE';
}

export async function machinesOf(factory, { probeFn = probe } = {}) {
  let launch; try { launch = JSON.parse(fs.readFileSync(path.join(factory, '.claude', 'launch.json'), 'utf8')); } catch (e) { return { state: 'UNEVALUABLE', why: `.claude/launch.json unreadable (${e.message})`, rows: [] }; }
  const rows = [];
  for (const c of launch.configurations ?? []) {
    if (!c.port) { rows.push({ name: c.name, port: null, state: 'NO-PORT', why: 'declared without a port; nothing to probe' }); continue; }
    const state = await probeFn(Number(c.port));
    rows.push({ name: c.name, port: Number(c.port), state, why: state === 'ONLINE' ? `tcp connect to 127.0.0.1:${c.port}` : `no listener on 127.0.0.1:${c.port}` });
  }
  return { state: 'ok', source: '.claude/launch.json configurations[]', rows };
}

/* ── FILES: THE TRACKED TREE BY TOP-LEVEL DIRECTORY ─────────────────────────────────────────── */
export function filesOf(factory) {
  const git = spawnSync('git', ['-C', factory, 'ls-files'], { encoding: 'utf8' });
  if (git.status !== 0) return { state: 'UNEVALUABLE', why: 'git ls-files failed; not a repository or git absent', rows: [] };
  const byDir = new Map();
  for (const f of git.stdout.split('\n')) { if (!f) continue; const d = f.includes('/') ? f.split('/')[0] : '.'; byDir.set(d, (byDir.get(d) ?? 0) + 1); }
  const flags = new Map();
  const flagFile = path.join(factory, 'core', 'maintenance-jobs', 'archive-flags.jsonl');
  let flagsState = 'ABSENT';
  if (fs.existsSync(flagFile)) {
    flagsState = 'read';
    for (const line of fs.readFileSync(flagFile, 'utf8').split('\n')) { try { const r = JSON.parse(line); const d = String(r.path ?? '').includes('/') ? r.path.split('/')[0] : '.'; flags.set(d, (flags.get(d) ?? 0) + 1); } catch { /* torn */ } }
  }
  const fired = new Map();
  const fireFile = path.join(factory, 'failures', 'module-fires.jsonl');
  let fireState = 'ABSENT';
  if (fs.existsSync(fireFile)) {
    fireState = 'read';
    const seen = new Set();
    for (const line of fs.readFileSync(fireFile, 'utf8').split('\n')) { try { const r = JSON.parse(line); if (!r.module || seen.has(r.module)) continue; seen.add(r.module); const d = r.module.includes('/') ? r.module.split('/')[0] : '.'; fired.set(d, (fired.get(d) ?? 0) + 1); } catch { /* torn */ } }
  }
  const rows = [...byDir.entries()].sort((a, b) => b[1] - a[1]).map(([dir, tracked]) => {
    const log = spawnSync('git', ['-C', factory, 'log', '-1', '--format=%cs', '--', dir], { encoding: 'utf8' });
    return { dir, tracked, flagged: flagsState === 'read' ? (flags.get(dir) ?? 0) : null, fired_modules: fireState === 'read' ? (fired.get(dir) ?? 0) : null, last_touch: log.status === 0 ? log.stdout.trim() || null : null };
  });
  return { state: 'ok', source: 'git ls-files · core/maintenance-jobs/archive-flags.jsonl · failures/module-fires.jsonl · git log -1 per directory', flags: flagsState, fires: fireState, rows };
}

/* ── DECISIONS: WHAT HAS BEEN APPROVED, BY ROW ──────────────────────────────────────────────── */
export function decisionsOf(factory) {
  const file = path.join(factory, 'failures', 'decisions.jsonl');
  if (!fs.existsSync(file)) return { state: 'ABSENT', why: 'failures/decisions.jsonl is not on disk', byRow: {}, count: 0 };
  const byRow = {};
  let count = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (!r || r._header) continue;
    count++;
    if (!String(r.elementId ?? '').startsWith(ELEMENT_PREFIX)) continue;
    const rowId = String(r.elementId).slice(ELEMENT_PREFIX.length);
    const verdict = /rejected/i.test(String(r.decided ?? '')) ? 'rejected' : 'approved';
    const prev = byRow[rowId];
    if (!prev || String(r.date) > String(prev.date)) byRow[rowId] = { id: r.id, verdict, date: r.date, operator: r.operator ?? 'UNATTRIBUTED', session: r.session ?? null, evidence_sha: r.evidence_sha ?? null };
  }
  return { state: 'read', source: 'failures/decisions.jsonl rows whose elementId starts with checkpoint:', byRow, count };
}

/** approveRow -> the pd row the ledger door validates. Pure; the door writes. */
export function approveRow({ row, verdict, operator, session, because, now = new Date().toISOString() }) {
  const v = verdict === 'reject' ? 'rejected' : 'approved';
  const other = v === 'approved' ? 'rejected' : 'approved';
  return {
    date: now,
    system: 'harness',
    decided: `checkpoint ${v}: ${row.id} — ${row.capability.slice(0, 140)} (row sha ${row.sha}) — the approve door of the factory review surface (OSS-039, OSS-040 option A)`,
    because: because && because.trim() ? because.trim() : `the operator read the row in the control panel${session ? ` from session ${session}` : ''} and said ${v === 'approved' ? 'yes' : 'no'}; the row's own text is the evidence, cited by sha`,
    reversal_cost: 'low: a later row with the same elementId supersedes this one; nothing else moves',
    guard_artifacts: ['core/docs/PLAN-THE-PLANT.md'],
    rejected: [{ option: `${other} the checkpoint`, why_not: v === 'approved' ? 'the operator saw what the row promised on the plate and the tiles' : 'the operator did not see what the row promised' }],
    elementId: `${ELEMENT_PREFIX}${row.id}`,
    evidence_sha: row.sha,
    operator: operator && operator.trim() ? operator.trim() : 'UNATTRIBUTED',
    session: session || row.session || null,
  };
}

/* ── THE CHECKPOINT MACHINE: STATE DERIVED, LEVERS READ OFF THE EDGES ───────────────────────── */
export const MACHINE_ID = 'M4';
export const APPROVABLE_STAGES = Object.freeze(['built', 'assembled', 'shipped']);

export function machineOf(factory) {
  let m; try { m = JSON.parse(fs.readFileSync(path.join(factory, 'core', 'machines.json'), 'utf8')); } catch (e) { return { state: 'ABSENT', why: `core/machines.json unreadable (${e.message})` }; }
  const mach = m?.machines?.[MACHINE_ID];
  if (!mach) return { state: 'ABSENT', why: `core/machines.json declares no ${MACHINE_ID}; the panel offers no lever until it does (plan row CP0)` };
  return { state: 'read', source: `core/machines.json ${MACHINE_ID} (${mach.object})`, machine: mach };
}

/** The review state of the row's CURRENT text, DERIVED from its latest decision. Pure.
 *  M4's object is one text: a decision citing another sha belongs to a superseded review, so the
 *  current text is unreviewed and the old decision is carried beside it as `superseded`. */
export function reviewState(row, decision) {
  if (!decision) return { state: 'unreviewed', superseded: null };
  if (decision.evidence_sha && decision.evidence_sha !== row.sha) return { state: 'unreviewed', superseded: decision };
  return { state: decision.verdict === 'rejected' ? 'rejected' : 'approved', superseded: null };
}

/** The levers a row may show: edges out of its state whose event is a press and whose guard holds. Pure. */
export function legalEdges(machine, state, stage) {
  if (!machine) return null;
  const out = [];
  for (const e of machine.edges ?? []) {
    if (e.from !== state) continue;
    if (!['approve', 'reject'].includes(e.event)) continue;              // derived events are not levers
    if (e.event === 'approve' && !APPROVABLE_STAGES.includes(stage)) continue;
    out.push({ event: e.event, to: e.to, label: e.event === 'approve' ? 'Approve' : 'Reject', guard: e.guard ?? null, reason_required: !!e.reason_required });
  }
  return out;
}

/* ── REWARD TERMS: FOUR TILES, HONEST UNTIL THEIR READERS EXIST ─────────────────────────────── */
export const REWARD = Object.freeze([
  { term: 'dR/dT', question: 'am I buying risk removal cheaply?' },
  { term: 'Brier + consequence', question: 'is what I say worth believing?' },
  { term: 'repeat-error', question: 'did the harness actually stop it coming back?' },
  { term: 'feedback-quality slope', question: 'am I getting better at the only move I have?' },
]);
export const rewardOf = () => REWARD.map((r) => ({ ...r, state: 'UNEVALUABLE', why: 'no reader exists yet (core/docs/REWARD-THREE-TERMS.md: ranking the work is MISSING, RAT S5)' }));

/* ── THE WHOLE PAYLOAD ──────────────────────────────────────────────────────────────────────── */
export async function panelData({ factory, plans = path.join(os.homedir(), '.claude', 'plans'), office = HERE, project = 'factory', probeFn } = {}) {
  if (!factory) return { state: 'UNEVALUABLE', why: 'no factory root named; pass --factory <design-loop>' };
  const p = readPlans(plans);
  let ws = null, overlay = null;
  try { ws = JSON.parse(fs.readFileSync(path.join(office, 'architecture', project, 'workspace.json'), 'utf8')); } catch { ws = null; }
  try { overlay = JSON.parse(fs.readFileSync(path.join(office, 'architecture', project, 'element-state.json'), 'utf8')); } catch { overlay = null; }
  const decisions = decisionsOf(factory);
  const mach = machineOf(factory);
  const checkpoints = [];
  for (const f of p.files ?? []) for (const r of f.items) {
    const st = stageOf(r.id, ws, overlay);
    const decision = decisions.byRow[r.id] ?? null;
    const rv = reviewState(r, decision);
    checkpoints.push({ ...r, stage: st.stage, elementId: st.elementId, decision: rv.superseded ? null : decision, superseded: rv.superseded, review: rv.state, edges: legalEdges(mach.machine, rv.state, st.stage) });
  }
  const sessions = (p.files ?? []).map((f) => ({ slug: f.slug, title: f.title, rows: f.rows }));
  const [machines, files] = [await machinesOf(factory, probeFn ? { probeFn } : {}), filesOf(factory)];
  return {
    state: 'ok', generated_at: new Date().toISOString(), factory, office,
    plans: { state: p.state, dir: plans, files: sessions, why: p.why ?? null },
    sessions, checkpoints,
    stores: storesOf(factory), machines, files,
    decisions: { state: decisions.state, count: decisions.count, source: decisions.source ?? null },
    machine: mach.state === 'read' ? { id: MACHINE_ID, source: mach.source, states: mach.machine.states, terminals: mach.machine.terminals, edges: mach.machine.edges } : null,
    machine_why: mach.state === 'read' ? null : mach.why,
    reward: rewardOf(),
    model: ws ? { checkpoints_drawn: checkpoints.filter((c) => c.elementId).length } : { state: 'ABSENT', why: 'no workspace.json for the project; every row reads not drawn' },
  };
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

  if (argv.includes('--negative')) {
    let ok = 0;
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 240)}`}`); if (pass) ok++; };
    const md = '# Plan — fixture\n\ntext\n\n| # | capability landed | you verify in the drawing office | you verify in the control panel | stop if |\n|---|---|---|---|---|\n| **CP** | **Panel v0** | a box | a tile | never |\n| I1 | Sales drawn | rail | tiles | refuses |\n\n| other | table |\n|---|---|\n| x | y |\n';
    const rows = parsePlanTable(md, { slug: 'fixture', title: 'Plan — fixture' });
    say('the SSOT table is found by its header cell and other tables are ignored', rows.length === 2 && rows[0].id === 'CP' && rows[1].id === 'I1', rows.map((r) => r.id));
    say('bold is stripped from the id and the capability', rows[0].capability === 'Panel v0', rows[0].capability);
    say('every row carries the session it came from and a sha of its own text', rows.every((r) => r.session === 'fixture' && /^[0-9a-f]{16}$/.test(r.sha)), rows.map((r) => [r.session, r.sha]));
    say('a plan with no SSOT table yields no rows, never a guessed table', parsePlanTable('# x\n\n| a | b |\n|---|---|\n| 1 | 2 |\n').length === 0, 'rows');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-'));
    const noQuery = storeTile({ id: 's', name: 'S', path: 'x.jsonl' }, dir);
    say('a store with no query is UNEVALUABLE with the reason, never a count', noQuery.state === 'UNEVALUABLE' && /no query/.test(noQuery.why), noQuery);
    const placeholder = storeTile({ id: 's', query: 'node x.mjs <cartridge>', path: 'x.jsonl' }, dir);
    say('a query with a placeholder is UNEVALUABLE, not run', placeholder.state === 'UNEVALUABLE' && /placeholder/.test(placeholder.why), placeholder);
    const absent = storeTile({ id: 's', query: 'node x.mjs', path: 'missing.jsonl' }, dir);
    say('a missing file is ABSENT, not zero', absent.state === 'ABSENT' && absent.count === null, absent);
    fs.writeFileSync(path.join(dir, 'y.jsonl'), '{"_header":true}\n{"a":1}\n{"a":2}\nnot json\n');
    const counted = storeTile({ id: 's', query: 'node x.mjs', path: 'y.jsonl' }, dir);
    say('a jsonl store counts rows minus the header and names the torn line', counted.state === 'read' && counted.count === 2 && counted.torn === 1, counted);

    const row = approveRow({ row: rows[0], verdict: 'approve', operator: 'learner-01', session: 'fixture' });
    say('an approve row carries the seven fields PR-057 proved the ledger accepts, plus elementId, evidence sha, operator and session',
      ['date', 'system', 'decided', 'because', 'reversal_cost', 'guard_artifacts', 'rejected', 'elementId', 'evidence_sha', 'operator', 'session'].every((k) => row[k] != null) && row.system === 'harness' && row.elementId === 'checkpoint:CP' && row.rejected.length === 1, Object.keys(row));
    const rej = approveRow({ row: rows[0], verdict: 'reject', operator: '', session: null });
    say('a reject row says rejected and an empty operator reads UNATTRIBUTED, never a guessed name', /checkpoint rejected/.test(rej.decided) && rej.operator === 'UNATTRIBUTED', [rej.decided.slice(0, 24), rej.operator]);

    const st = stageOf('CP', { model: { softwareSystems: [{ id: '1', containers: [{ id: '2', properties: { [CHECKPOINT_PROPERTY]: 'CP' } }] }] } }, { 2: { stage: 'built' } });
    say('a row whose box exists in the model reads the overlay stage', st.stage === 'built' && st.elementId === '2', st);
    say('a row with no box reads not drawn, which is the truth until step P', stageOf('I1', { model: {} }, null).stage === 'not drawn', stageOf('I1', { model: {} }, null));

    fs.mkdirSync(path.join(dir, '.claude'));
    fs.writeFileSync(path.join(dir, '.claude', 'launch.json'), JSON.stringify({ configurations: [{ name: 'a', port: 1 }, { name: 'b' }] }));
    const m = await machinesOf(dir, { probeFn: async () => 'OFFLINE' });
    say('a declared server with no listener is OFFLINE and one with no port is NO-PORT; neither is silent', m.rows[0].state === 'OFFLINE' && m.rows[1].state === 'NO-PORT', m.rows);
    say('the machine states are the declared closed set', m.rows.every((r) => MACHINE_STATES.includes(r.state)), m.rows.map((r) => r.state));

    say('the four reward terms read UNEVALUABLE with the reason, not zero', rewardOf().every((r) => r.state === 'UNEVALUABLE' && /no reader/.test(r.why)), rewardOf());
    const none = await panelData({});
    say('no factory named is UNEVALUABLE, not an empty panel', none.state === 'UNEVALUABLE', none);

    /* THE MACHINE DECIDES THE LEVERS. */
    const M = { states: ['unreviewed', 'approved', 'rejected'], terminals: ['superseded', 'retired'], edges: [
      { from: 'unreviewed', to: 'approved', event: 'approve', guard: 'stage built+' }, { from: 'unreviewed', to: 'rejected', event: 'reject', reason_required: true },
      { from: 'approved', to: 'superseded', event: 'row text changed' }, { from: 'rejected', to: 'superseded', event: 'row text changed' }] };
    say('no machine means no levers at all, never a default pair of buttons', legalEdges(null, 'unreviewed', 'built') === null, legalEdges(null, 'unreviewed', 'built'));
    say('a row at not drawn offers reject only', JSON.stringify(legalEdges(M, 'unreviewed', 'not drawn').map((e) => e.event)) === '["reject"]', legalEdges(M, 'unreviewed', 'not drawn'));
    say('a row at built offers approve and reject', JSON.stringify(legalEdges(M, 'unreviewed', 'built').map((e) => e.event)) === '["approve","reject"]', legalEdges(M, 'unreviewed', 'built'));
    say('an approved row offers nothing: the only edge out is derived', legalEdges(M, 'approved', 'built').length === 0, legalEdges(M, 'approved', 'built'));
    say('a rejected row offers nothing either: the answer to a reason is an edit, not a press', legalEdges(M, 'rejected', 'built').length === 0, legalEdges(M, 'rejected', 'built'));
    const r0 = { sha: 'aaaa' };
    say('no decision reads unreviewed', reviewState(r0, null).state === 'unreviewed', reviewState(r0, null));
    say('a decision citing the current sha reads its verdict', reviewState(r0, { verdict: 'approved', evidence_sha: 'aaaa' }).state === 'approved' && reviewState(r0, { verdict: 'rejected', evidence_sha: 'aaaa' }).state === 'rejected', 'verdicts');
    const sup = reviewState(r0, { verdict: 'rejected', evidence_sha: 'bbbb' });
    say('a decision citing an older sha is superseded: the current text is unreviewed and the old decision rides beside it', sup.state === 'unreviewed' && sup.superseded?.verdict === 'rejected', sup);

    console.log(`\n${ok} of 24 held`);
    process.exit(ok === 24 ? 0 : 1);
  }

  const factory = flag('--factory', null);
  if (!factory) { console.log('UNEVALUABLE — pass --factory <design-loop root>'); process.exit(3); }
  const data = await panelData({ factory: path.resolve(factory), plans: flag('--plans', undefined), office: flag('--office', HERE) });
  console.log(JSON.stringify(data, null, 2));
}
