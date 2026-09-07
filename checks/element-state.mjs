/**
 * ELEMENT STATE — the two axes joined, rolled up the tree, and painted.
 *
 * WHY THIS EXISTS AND WHY IT IS NOT A THIRD RULE. A box carries two independent facts and neither
 * one is the other:
 *
 *   SEAT   does the thing we extend already have a place for this   typed, checks/delivery.mjs
 *   STAGE  how far has it actually got                              derived, checks/stage.mjs
 *
 * Both were computed and neither was JOINED, so a reader had to run two commands and hold the
 * answers side by side to learn the state of one box. Worse, the roll-up rule existed on one axis
 * only: delivery.mjs surfaces seat upward through `change-not-surfaced` — a parent holding a marked
 * child must say so — and stage.mjs did not, so a container whose every component was `built`
 * painted nothing at all. That is CF-106 recurring in a second module, one turn after it was fixed
 * in the first.
 *
 * THE FIX IS A JOIN, NOT A PORTED RULE. Copying `change-not-surfaced` into stage.mjs would give one
 * invariant two homes, and the second copy is the one that goes stale — which is exactly how CF-106
 * got its first half right and its second half wrong. So the roll-up lives HERE, once, and applies
 * to both axes by construction.
 *
 * THE ROLL-UP RULE IS THE MINIMUM, NOT THE MAXIMUM, and that asymmetry is deliberate. A parent
 * inherits the LOWEST stage among its marked children, because a container is only as finished as
 * its least finished part: a runtime holding one built component and one that is only designed is
 * not built, and a report that said otherwise would be the optimistic reading a status table gives
 * for free. Seat rolls up differently — presence, not minimum — because seat is a claim about cost
 * and a parent holding any new-seat child has that cost.
 *
 * THE OVERLAY IS PAINTED FROM HERE AND NOWHERE ELSE. The check is the authority and the browser only
 * paints, so the picture and the exit code cannot disagree. The payload is keyed by element ID with
 * the name beside it — see overlay() for why the usual objection to ids does not apply to a payload
 * generated from the same export it is read against.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { elements, childrenOf } from './model.mjs';
import { statesOf, stateOf, basisOf } from './delivery.mjs';
import { inspect as stageInspect, stagesOf } from './stage.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'ABSENT', 'UNEVALUABLE']);

/* THE SHAPE OF THE MODEL IS THE MODEL READER'S, not this file's. `tree` was written here and the
   identical three-case parent expression already sat in checks/delivery.mjs, so the nesting rule had
   two homes on the day the second one was written. It now lives in checks/model.mjs::childrenOf,
   which is the only module that reads the export — and it could not have lived in either caller,
   because this one imports delivery and the import back would have been a cycle. */

/**
 * THE JOINED STATE OF EVERY ELEMENT, with both axes rolled up.
 *
 * `seat` is the tag the element carries, or the one it inherits from a marked descendant.
 * `stage` is the rung its own evidence reached, or the LOWEST rung among its marked descendants.
 * `from` says which — `own` or `rolled up`, per axis — so nobody has to guess whether a container's
 * green came from evidence about the container or about something three levels below it.
 */
export function join(ws, theme, stageResult) {
  const els = elements(ws);
  const kids = childrenOf(els);
  const seatStates = statesOf(theme);
  const ladder = ['FAILED', 'designed', 'built', 'assembled', 'shipped'];
  const rank = (s) => { const i = ladder.indexOf(s); return i < 0 ? 1 : i; };

  const ownStage = new Map((stageResult.rows ?? []).map((r) => [r.name, r]));

  /* DEPTH IS BOUNDED because a malformed export can name a parent that is also its own descendant,
     and an unbounded walk over one would not return. Eight is deeper than C4 goes: system,
     container, component is three, and deployment nesting adds a handful more. */
  const descend = (id, depth = 0) => {
    if (depth > 8) return [];
    const out = [];
    for (const k of kids.get(id) ?? []) { out.push(k); out.push(...descend(k.id, depth + 1)); }
    return out;
  };

  /**
   * THE ROLLED-UP RUNG, COMPUTED BOTTOM-UP RATHER THAN OVER A FLATTENED LIST.
   *
   * Two planted faults shaped this, and the second only appeared once the first was fixed.
   *
   *   1. Taking the minimum over the rows it FOUND made a container holding one assembled component
   *      and one nobody had started report `assembled` — a box you have not begun is not absent
   *      from the average, it is the lowest term in it.
   *   2. Fixing that by flattening ALL descendants then broke the level above: the system's
   *      descendant list contains the CONTAINER, which never carries evidence of its own, so a
   *      built system was dragged to `designed` by the very box that was standing in for it.
   *
   * A parent's rung is therefore the minimum over its DIRECT children's EFFECTIVE rung — each of
   * which is itself either evidence or a roll-up. A child with no rung anywhere beneath it counts
   * as `designed`, but only once some sibling subtree has evidence: with none anywhere, there is
   * nothing to surface and the parent stays out of the report rather than being painted `designed`.
   */
  const memo = new Map();
  const effective = (id, depth = 0) => {
    if (memo.has(id)) return memo.get(id);
    memo.set(id, null); /* claimed before descending, so a self-parenting export terminates */
    if (depth > 8) return null;
    const direct = (kids.get(id) ?? []).filter((k) => ['Container', 'Component'].includes(k.kind));
    let out = null;
    if (direct.length) {
      const each = direct.map((k) => ownStage.get(k.name)?.stage ?? effective(k.id, depth + 1));
      if (each.some(Boolean)) out = each.map((s) => s ?? 'designed').reduce((lo, s) => (rank(s) < rank(lo) ? s : lo));
    }
    memo.set(id, out);
    return out;
  };

  const rows = [];
  for (const e of els) {
    if (!['Software System', 'Container', 'Component'].includes(e.kind)) continue;

    const below = descend(e.id);

    const ownSeat = stateOf(e, seatStates).state;
    const heirSeat = below.map((k) => stateOf(k, seatStates).state).find(Boolean) ?? null;
    const seat = ownSeat ?? heirSeat;

    const own = ownStage.get(e.name) ?? null;
    const rolled = effective(e.id);
    const stage = own?.stage ?? rolled;

    if (!seat && !stage) continue;
    rows.push({
      name: e.name, kind: e.kind, id: e.id,
      seat, seatFrom: ownSeat ? 'own' : (heirSeat ? 'rolled up' : null),
      stage, stageFrom: own ? 'own' : (rolled ? 'rolled up' : null),
      claims: own?.claims ?? [],
    });
  }
  return { rows, seatBasis: basisOf(theme), stages: stagesOf(theme) };
}

/**
 * TWO RULES, and both are about the JOIN rather than about either axis.
 *   1 stage-not-surfaced — a parent holding a component with evidence, showing none itself
 *   2 evidence-without-seat — a box with a rung and no seat claim, so nobody knows what it costs
 */
export function inspect(ws, theme, io = {}) {
  const st = stageInspect(ws, theme, io);
  if (st.state === 'UNEVALUABLE') return { state: 'UNEVALUABLE', why: st.why, rows: [], findings: [] };

  const j = join(ws, theme, st);
  const findings = [];

  for (const r of j.rows) {
    if (r.stage && r.stageFrom === null) {
      findings.push({
        rule: 'stage-not-surfaced',
        where: r.name,
        why: 'holds evidence below it and carries none of its own, so one level up — the plate a reviewer opens to ask what is finished — it reads as untouched',
        cite: 'CF-106, and this is the second axis it would have happened on',
      });
    }
    if (r.stage && r.stage !== 'designed' && !r.seat) {
      findings.push({
        rule: 'evidence-without-seat',
        where: `${r.name} · ${r.stage}`,
        why: 'has reached a rung and claims no seat, so the diagram says how far it got and not what it costs to land — and the seat axis is the half a human has to answer',
        cite: 'ours — the two axes are independent, and a box carrying one of them is half a state',
      });
    }
  }

  if (!j.rows.length) return { state: 'ABSENT', ...j, findings: [] };
  return { state: findings.length ? 'findings' : 'clean', ...j, findings, stageFindings: st.findings };
}

/**
 * THE OVERLAY PAYLOAD the viewer paints under one key.
 *
 * ROLLED-UP ROWS ARE INCLUDED, and that is the whole reason this moved out of stage.mjs. A payload
 * keyed only by the elements that CARRY a property leaves every container blank on the container
 * view, which is the plate most readers stop at.
 *
 * KEYED BY ELEMENT ID, WITH THE NAME BESIDE IT. The renderer stamps `model-id` on each cell's group,
 * so an id is the handle the DOM actually offers; a name would have to be recovered from a text node
 * and matched, which breaks on the first two elements sharing one. The usual objection to ids — that
 * they belong to the export and shift when the DSL is reordered — does not apply here, because this
 * payload is GENERATED FROM THAT SAME EXPORT and regenerated with it. The name rides along so a
 * human reading stage.json is not left with a list of numbers.
 */
export function overlay(result, theme) {
  const conf = theme?.delivery?.overlay ?? {};
  const fill = conf.fill ?? {};
  const at = {};
  for (const r of result.rows ?? []) {
    if (!r.stage) continue;
    at[r.id] = {
      name: r.name,
      stage: r.stage,
      from: r.stageFrom,
      fill: fill[r.stage] ?? fill.designed ?? null,
      claims: r.claims.filter((c) => c.rung !== 'shipped').map((c) => `${c.rung}: ${c.verdict} — ${c.why}`),
    };
  }
  return { key: conf.key ?? 'r', banner: conf.banner ?? 'TEST RESULTS', legend: fill, at };
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  const root = flag('--root', HERE);

  if (argv.includes('--negative')) {
    let ok = 0; let total = 0;
    const say = (n, pass, saw) => { total++; console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 300)}`}`); if (pass) ok++; };
    const theme = {
      delivery: {
        seat: { tagFor: { new: 'Proposal', existing: 'Modified' } },
        stage: { states: ['designed', 'built', 'assembled', 'shipped'] },
        overlay: { key: 'r', fill: { designed: '#3c414d', built: '#1d6070', assembled: '#2f7d4f', FAILED: '#8c2233' } },
      },
    };

    /* A system holding a container holding two components, so the roll-up has something to walk. */
    const ws = (a = {}, b = {}, tags = { sys: 'Element,Software System', con: 'Element,Container', k1: 'Element,Component', k2: 'Element,Component' }) => ({
      model: { softwareSystems: [{ id: 's1', name: 'Sys', tags: tags.sys,
        containers: [{ id: 'c1', name: 'Runtime', tags: tags.con,
          components: [
            { id: 'k1', name: 'Guard', tags: tags.k1, properties: a },
            { id: 'k2', name: 'Scorer', tags: tags.k2, properties: b },
          ] }] }] },
      views: {},
    });
    const io = (over = {}) => ({
      tracked: new Set(['src/guard.ts', 'src/scorer.ts', 'tests/guard.unit.ts', 'tests/guard.seam.ts', 'tests/scorer.unit.ts']),
      registry: {
        'guard.unit': { file: 'tests/guard.unit.ts', faults: ['a', 'b'] },
        'guard.seam': { file: 'tests/guard.seam.ts', host: 'ctx.tools.guard', faults: ['c'] },
        'scorer.unit': { file: 'tests/scorer.unit.ts', faults: ['d'] },
      },
      read: (f) => ({
        'tests/guard.unit.ts': 'import "../src/guard";',
        'tests/guard.seam.ts': 'register(ctx.tools.guard, from("../src/guard"));',
        'tests/scorer.unit.ts': 'import "../src/scorer";',
      })[f] ?? null,
      ...over,
    });
    const at = (r, n) => r.rows.find((x) => x.name === n);
    const built = { implementation: 'src/guard.ts', unit: 'guard.unit' };
    const assembled = { ...built, seam: 'guard.seam' };
    const scorerBuilt = { implementation: 'src/scorer.ts', unit: 'scorer.unit' };

    /* ── THE ROLL-UP, WHICH IS THE WHOLE REASON THIS MODULE EXISTS ─────────────────────────── */
    let r = inspect(ws(built, scorerBuilt, { sys: 'Element,Software System,Modified', con: 'Element,Container,Modified', k1: 'Element,Component,Modified', k2: 'Element,Component,Modified' }), theme, io());
    say('a container whose components are built is itself reported built, not blank',
      at(r, 'Runtime')?.stage === 'built', at(r, 'Runtime'));
    say('and it SAYS the rung was rolled up, so nobody reads it as evidence about the container',
      at(r, 'Runtime')?.stageFrom === 'rolled up', at(r, 'Runtime'));
    say('the system two levels up gets it too, because C4 levels nest and readers stop at any of them',
      at(r, 'Sys')?.stage === 'built', at(r, 'Sys'));

    /* THE MINIMUM, NOT THE MAXIMUM — the asymmetry that makes the roll-up honest. */
    r = inspect(ws(assembled, {}, { sys: 'Element,Software System,Modified', con: 'Element,Container,Modified', k1: 'Element,Component,Modified', k2: 'Element,Component,Modified' }), theme, io());
    say('a container holding one assembled component and one with nothing is DESIGNED, not assembled',
      at(r, 'Runtime')?.stage === 'designed', at(r, 'Runtime'));
    r = inspect(ws(assembled, scorerBuilt, { sys: 'Element,Software System,Modified', con: 'Element,Container,Modified', k1: 'Element,Component,Modified', k2: 'Element,Component,Modified' }), theme, io());
    say('and one holding assembled beside built is BUILT — a box is as finished as its least finished part',
      at(r, 'Runtime')?.stage === 'built', at(r, 'Runtime'));

    /* A FAILURE BELOW MUST REACH THE TOP, because that is the one a reviewer must not miss. */
    r = inspect(ws({ implementation: 'src/gone.ts', unit: 'guard.unit' }, scorerBuilt, { sys: 'Element,Software System,Modified', con: 'Element,Container,Modified', k1: 'Element,Component,Modified', k2: 'Element,Component,Modified' }), theme, io());
    say('a FAILED component drags its container to FAILED, because a broken claim below is the story',
      at(r, 'Runtime')?.stage === 'FAILED', at(r, 'Runtime'));

    /* ── THE TWO AXES ARE JOINED, NOT MERGED ───────────────────────────────────────────────── */
    r = inspect(ws(built, {}, { sys: 'Element,Software System', con: 'Element,Container', k1: 'Element,Component,Modified', k2: 'Element,Component' }), theme, io());
    say('seat rolls up by PRESENCE — a parent holding one marked child carries the seat',
      at(r, 'Runtime')?.seat === 'Modified' && at(r, 'Runtime')?.seatFrom === 'rolled up', at(r, 'Runtime'));
    say('and the two axes are reported separately, never collapsed into one word',
      at(r, 'Guard')?.seat === 'Modified' && at(r, 'Guard')?.stage === 'built', at(r, 'Guard'));
    r = inspect(ws(built, {}, { sys: 'Element,Software System', con: 'Element,Container', k1: 'Element,Component', k2: 'Element,Component' }), theme, io());
    say('a box with a rung and no seat anywhere is caught — how far it got without what it costs',
      r.findings.some((f) => f.rule === 'evidence-without-seat'), r.findings);

    /* ── NOTHING TO SAY IS AN ANSWER ───────────────────────────────────────────────────────── */
    say('a model with neither axis marked is ABSENT, not clean',
      inspect(ws({}, {}), theme, io({ registry: {} })).state === 'ABSENT',
      inspect(ws({}, {}), theme, io({ registry: {} })).state);
    say('an UNEVALUABLE stage axis makes the join UNEVALUABLE, never a partial answer',
      inspect(ws(built, {}), theme, io({ tracked: null })).state === 'UNEVALUABLE',
      inspect(ws(built, {}), theme, io({ tracked: null })).state);

    /* ── THE OVERLAY CARRIES THE ROLLED-UP ROWS, which is why it moved here ────────────────── */
    r = inspect(ws(built, scorerBuilt, { sys: 'Element,Software System,Modified', con: 'Element,Container,Modified', k1: 'Element,Component,Modified', k2: 'Element,Component,Modified' }), theme, io());
    const ov = overlay(r, theme);
    say('the payload paints the CONTAINER, which the stage axis alone left blank',
      ov.at.c1?.fill === '#1d6070' && ov.at.c1?.name === 'Runtime', ov.at);
    say('and it carries the key the theme names, so the viewer does not hard-code one',
      ov.key === 'r', ov.key);
    say('a designed box is painted neutral, never red — unwritten is honest, not broken',
      overlay(inspect(ws({ unit: 'guard.unit' }, {}, { sys: 'Element,Software System,Modified', con: 'Element,Container,Modified', k1: 'Element,Component,Modified', k2: 'Element,Component' }), theme, io()), theme).at.k1?.fill === '#3c414d',
      overlay(inspect(ws({ unit: 'guard.unit' }, {}, { sys: 'Element,Software System,Modified', con: 'Element,Container,Modified', k1: 'Element,Component,Modified', k2: 'Element,Component' }), theme, io()), theme).at);

    /* ── THE TREE WALK MUST NOT HANG ON A MALFORMED EXPORT ─────────────────────────────────── */
    const cyclic = { model: { softwareSystems: [{ id: 's1', name: 'Sys', tags: 'Element,Software System',
      containers: [{ id: 'c1', name: 'A', tags: 'Element,Container', components: [{ id: 'c1', name: 'A', tags: 'Element,Component', properties: built }] }] }] }, views: {} };
    let returned = false;
    try { inspect(cyclic, theme, io()); returned = true; } catch { returned = false; }
    say('an export naming an element as its own child returns instead of walking forever', returned, 'threw or hung');

    const PINNED = 15;
    console.log(`\n${ok} of ${total} held` + (total === PINNED ? '' : `  · MISCOUNT: ${PINNED} pinned`));
    process.exit(ok === total && total === PINNED ? 0 : 1);
  }

  let theme;
  try { theme = JSON.parse(fs.readFileSync(path.join(root, 'architecture', 'theme.json'), 'utf8')); }
  catch (e) { console.log(`UNEVALUABLE — architecture/theme.json could not be read (${e.message})`); process.exit(3); }

  const dir = path.join(root, 'architecture');
  const targets = fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())
        .map((d) => path.join(dir, d.name, 'workspace.json')).filter((f) => fs.existsSync(f))
    : [];
  if (!targets.length) { console.log('UNEVALUABLE — no exported workspace.json found; export the DSL first'); process.exit(3); }

  let bad = 0;
  for (const f of targets) {
    let ws;
    try { ws = JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) { console.log(`UNEVALUABLE — ${f} does not parse: ${e.message}`); process.exit(3); }
    const r = inspect(ws, theme, { root });
    console.log(`\n  element-state · ${path.relative(process.cwd(), f)}`);
    if (r.state === 'UNEVALUABLE') { console.log(`    UNEVALUABLE — ${r.why}`); process.exit(3); }
    if (r.state === 'ABSENT') { console.log('    ABSENT — nothing here carries a seat or a rung, so every box reads as something that already ships and is finished'); continue; }
    console.log(`    seat basis: ${r.seatBasis}`);
    for (const row of r.rows) {
      const seat = row.seat ? `${row.seat}${row.seatFrom === 'rolled up' ? '↑' : ''}` : '—';
      const stage = row.stage ? `${row.stage}${row.stageFrom === 'rolled up' ? '↑' : ''}` : '—';
      console.log(`    ${seat.padEnd(12)} ${stage.padEnd(14)} ${row.kind.padEnd(16)} ${row.name}`);
    }
    console.log('    ↑ = rolled up from something below it, not evidence about this box');
    for (const x of r.findings) { bad++; console.log(`    FAIL ${x.rule}\n         ${x.where}\n         ${x.why}\n         ${x.cite}`); }

    if (argv.includes('--write')) {
      const out = path.join(path.dirname(f), 'stage.json');
      fs.writeFileSync(out, JSON.stringify(overlay(r, theme), null, 2) + '\n');
      console.log(`    wrote ${path.relative(process.cwd(), out)} — the overlay the viewer paints from`);
    }
  }
  console.log(`\n  ${bad} finding(s)`);
  process.exit(bad ? 1 : 0);
}
