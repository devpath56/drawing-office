/**
 * STAGE — how far a component has actually got, computed rather than claimed.
 *
 * WHAT IT IS FOR. checks/delivery.mjs answers a cost question: does the thing we extend already
 * have a seat for this box, or must it gain one. That is `Modified` against `Proposal`, it is typed
 * by a human, and it has to be, because nothing in this tree can read somebody else's plugin
 * registry. This module answers the other question, and it is the one a reader of a proposal
 * actually asks: HAS ANY OF IT BEEN WRITTEN YET.
 *
 * STAGE IS NEVER A TAG, and that ruling is the whole design. A tag reading `built` is a person
 * asserting progress in the same file they are proposing the work in. A stage is the highest rung
 * whose evidence holds, computed from the tree, and nobody can type it ahead of itself. So this
 * module REFUSES an element carrying a stage word as a tag (rule `stage-typed`) rather than reading
 * it.
 *
 * THE JOIN THAT WAS MISSING. Until now the theme's own guard for `built` read "NOT BUILT — nothing
 * yet joins a component to the file that implements it", and it was right: a C4 element carries a
 * name, a description, a technology and tags, and not one of them points at code. Measured
 * 2026-09-07 against structurizr-cli: a DSL `properties { "implementation" "src/x.ts" }` survives
 * the JSON export intact. That is the pointer, and every rung here is built on it.
 *
 * FOUR RUNGS, AND ONLY THREE ARE OBSERVABLE HERE:
 *
 *   designed    a decision beside it and no implementation claimed — checks/decisions.mjs owns it
 *   built       a TRACKED implementation file, and a preregistered fault set that names it
 *   assembled   a preregistered fault set over the SEAM — ours and the host's registration point
 *   shipped     on the default branch of the repo that owns the seam — NOT BUILT, see below
 *
 * WHY "PREREGISTERED" IS DOING THE WORK. A test set alone is not a guard. A set written after the
 * code, by the author of the code, until it passes, certifies only that the code does what it does;
 * that is what every repo already has, and it is why "we have tests" tells a reviewer nothing. What
 * makes a fault set evidence is that the faults were named BEFORE the fix. So the faults live in
 * architecture/redproof.json — a separate tracked artifact — and a fault added later to turn a rung
 * green is a diff to a registry that a reviewer sees, rather than an invisible edit inside a test
 * file that reports on itself.
 *
 * WHAT THAT CANNOT DO, STATED RATHER THAN PAPERED OVER. Nothing here observes the ORDER two files
 * were written in: the registry entry and the implementation can land in one commit and this module
 * cannot tell. It is the same tier-D hole the review catalogue names for OSS-SEARCH. The rung above
 * is git — the commit that first adds a fault must not be later than the one that first adds the
 * implementation — and it is buildable, not built.
 *
 * WHY A SEAM SET MUST NAME THE HOST. The failure that actually happens to plugin architectures is
 * registered, never invoked: the guard is constructed, the registration returns, and the runtime
 * never calls it. A "seam test" that exercises only our own module cannot see that — it is a unit
 * test under a second name. So a seam set carries the host symbol it plugs into, and the set file
 * must name it as well as ours.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { elements } from './model.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'ABSENT', 'UNEVALUABLE']);

/** The rungs, lowest first. The order IS the machine; the index is how far along a thing is. */
export const STAGES = Object.freeze(['designed', 'built', 'assembled', 'shipped']);

/**
 * The element properties that carry the claims — THE FALLBACK, not the source.
 *
 * The names live in theme.delivery.properties, where each one is also DOCUMENTED, and claimKeys()
 * reads them there. This constant answers a theme that declares none, so a repo without the block
 * still gets a check rather than a silent pass on an empty key list.
 */
export const CLAIMS = Object.freeze(['implementation', 'unit', 'seam', 'upstream']);

/** The claim properties this theme declares. Two homes for these names is the fault this ends. */
export function claimKeys(theme) {
  const declared = Object.keys(theme?.delivery?.properties ?? {});
  return declared.length ? declared : CLAIMS;
}

/**
 * DO THE TWO HOMES AGREE — the honest answer to the information-leakage finding.
 *
 * The first fix attempted was to read the names from the theme and use them, and it is wrong: the
 * MEANING of each name lives here and nowhere else. "unit" moves the built rung, "seam" moves the
 * assembled one, and a theme renaming them would produce a check reading properties whose semantics
 * it had just lost. Indirection over a name whose behaviour is hard-coded is the appearance of one
 * home over the reality of two.
 *
 * So the names stay implemented here and DECLARED there, and this refuses any disagreement between
 * them. A theme documenting a property this module never reads is a promise to the DSL author that
 * nothing keeps; a property read here and documented nowhere is a feature with no way in.
 */
export function vocabularyDrift(theme) {
  const declared = Object.keys(theme?.delivery?.properties ?? {});
  if (!declared.length) return [];
  const out = [];
  for (const k of declared) if (!CLAIMS.includes(k)) out.push({ name: k, side: 'declared in the theme and read by nothing here' });
  for (const k of CLAIMS) if (!declared.includes(k)) out.push({ name: k, side: 'read here and documented in no theme block' });
  return out;
}

export function stagesOf(theme) {
  const s = theme?.delivery?.stage?.states;
  return Array.isArray(s) && s.length ? s : STAGES;
}

/**
 * WHAT GIT TRACKS, WHICH IS NOT WHAT IS ON DISK.
 *
 * fs.existsSync passes for a file that is on disk and untracked, and this operator has already paid
 * for that confusion once: a registry naming modules that were never committed left HEAD describing
 * a tree nobody else could check out. A reader of a diagram gets what HEAD contains, so that is the
 * question this asks.
 *
 * Returns null — never an empty set — when git cannot answer, so a caller can say UNEVALUABLE
 * instead of reporting every path in the model as missing.
 */
export function trackedIn(root) {
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return new Set(out.split('\n').filter(Boolean));
  } catch { return null; }
}

export const REGISTRY_STATES = Object.freeze(['read', 'ABSENT', 'UNEVALUABLE']);

/** The preregistered fault sets. ABSENT is an answer: no rung above `designed` can be reached. */
export function registryOf(root) {
  const file = path.join(root, 'architecture', 'redproof.json');
  if (!fs.existsSync(file)) return { state: 'ABSENT', file, sets: {} };
  try {
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { state: 'read', file, sets: doc?.sets ?? {} };
  } catch (e) { return { state: 'UNEVALUABLE', file, sets: {}, why: e.message }; }
}

/**
 * DOES THE SET NAME ITS SUBJECT.
 *
 * A set file that never mentions what it tests is a set for something else, and an empty one passes
 * every other rule here. The match is deliberately loose — the full repo-relative path OR the
 * basename without its extension, as a whole word — because a test imports `./compose`, never
 * `src/guard/compose.ts`.
 *
 * THE LIMIT IS NAMED: this proves the set MENTIONS its subject, never that it exercises it. It
 * catches the copied-stub case and nothing subtler, and claiming more for it would be exactly the
 * overclaim this file exists to refuse.
 */
export function namesSubject(text, subject) {
  if (!text || !subject) return false;
  if (text.includes(subject)) return true;
  const stem = path.basename(subject).replace(/\.[^.]+$/, '');
  return stem.length > 3 && new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
}

/**
 * THE RUNG-BY-RUNG VERDICT for one element.
 *
 * Every rung is `held`, `FAILED` or `not-claimed`, and the three are different answers. `not-claimed`
 * is a young component, which is the honest majority of a model at this age; `FAILED` is a claim
 * that does not hold, and only that is a finding.
 */
export function claimsOf(el, { registry, tracked, read }) {
  const props = el.properties ?? {};
  const out = [];
  const impl = props.implementation ?? null;
  const rung = (name, verdict, why) => out.push({ rung: name, verdict, why });

  /* NO CODE YET IS THE COMMON CASE, AND IT HAS TWO DIFFERENT SHAPES. A box pointing at nothing at
     all is a box nobody has thought about; a box whose faults are already named in the registry is
     one somebody has, in the only order that makes those faults evidence. Collapsing the two into
     "no implementation property" throws away the single most interesting fact a young model has —
     that the criteria were written first — which is what this whole rung exists to reward. */
  if (!impl) {
    const pre = registry[props.unit];
    if (pre && Array.isArray(pre.faults) && pre.faults.length) rung('built', 'not-claimed', `no implementation yet, and ${pre.faults.length} fault(s) are already preregistered for it in "${props.unit}" — preregistered, unwritten`);
    else rung('built', 'not-claimed', 'no implementation property, so the box points at no code');
  }
  else if (!tracked.has(impl)) rung('built', 'FAILED', `implementation "${impl}" is not tracked by git — a reader of HEAD does not get this file, whether or not it sits on somebody's disk`);
  else {
    const set = registry[props.unit];
    if (!props.unit) rung('built', 'FAILED', `names an implementation and no unit set, so the only evidence that "${impl}" does what the box says is that somebody wrote it`);
    else if (!set) rung('built', 'FAILED', `unit set "${props.unit}" is in no registry, so its faults were never preregistered`);
    else if (!Array.isArray(set.faults) || !set.faults.length) rung('built', 'FAILED', `unit set "${props.unit}" pins no faults — a set with nothing planted in it cannot fail, so it cannot be evidence`);
    /* PREREGISTERED AND NOT YET WRITTEN IS THE POINT, NOT A DEFECT. A set carrying faults and no
       "file" is the honest first state: the faults are named, the code is not written, and that is
       the ONLY order in which a fault set is evidence rather than a description of what shipped.
       Calling it FAILED would make the discipline turn the board red for doing the right thing,
       and a check that punishes the correct order teaches the wrong one. A set that DOES name a
       file git cannot see is a different sentence and stays a failure. */
    else if (!set.file) rung('built', 'not-claimed', `unit set "${props.unit}" pins ${set.faults.length} fault(s) and names no file yet — preregistered, unwritten`);
    else if (!tracked.has(set.file)) rung('built', 'FAILED', `unit set "${props.unit}" names file "${set.file}" which git does not track`);
    else if (!namesSubject(read(set.file), impl)) rung('built', 'FAILED', `unit set "${props.unit}" never mentions "${impl}", so it is a set for something else`);
    else rung('built', 'held', `${set.faults.length} fault(s) pinned in the registry, over a tracked ${set.file}`);
  }

  const seamSet = registry[props.seam];
  if (!props.seam) rung('assembled', 'not-claimed', 'no seam set, so nothing exercises our code and the host together');
  else if (!seamSet) rung('assembled', 'FAILED', `seam set "${props.seam}" is in no registry, so its faults were never preregistered`);
  else if (!Array.isArray(seamSet.faults) || !seamSet.faults.length) rung('assembled', 'FAILED', `seam set "${props.seam}" pins no faults`);
  else if (!seamSet.file) rung('assembled', 'not-claimed', `seam set "${props.seam}" pins ${seamSet.faults.length} fault(s) and names no file yet — preregistered, unwritten`);
  else if (!tracked.has(seamSet.file)) rung('assembled', 'FAILED', `seam set "${props.seam}" names file "${seamSet.file}" which git does not track`);
  else if (!seamSet.host) rung('assembled', 'FAILED', `seam set "${props.seam}" names no host symbol, so nothing distinguishes it from a unit set — and the failure a seam set exists for is "registered, never invoked"`);
  else if (!namesSubject(read(seamSet.file), seamSet.host)) rung('assembled', 'FAILED', `seam set "${props.seam}" never mentions the host symbol "${seamSet.host}", so it exercises our half alone`);
  /* OURS IS LOOKED FOR WITH THE HOST SYMBOL REMOVED, and the planted fault is what found this.
     namesSubject falls back to the basename stem, so a component at src/guard.ts and a host symbol
     ctx.tools.guard match each OTHER: a seam file naming only the host was read as naming ours too,
     and a set exercising their half alone scored assembled. Blanking the host occurrences first
     asks the question that was meant — does the file name our subject SOMEWHERE ELSE. */
  else if (impl && !namesSubject(String(read(seamSet.file) ?? '').split(seamSet.host).join(' '), impl)) rung('assembled', 'FAILED', `seam set "${props.seam}" mentions the host but never "${impl}" anywhere outside the host symbol itself, so it exercises their half alone`);
  else rung('assembled', 'held', `${seamSet.faults.length} fault(s) pinned over the join with ${seamSet.host}`);

  rung('shipped', 'NOT-CHECKED', 'no guard reads the default branch of a repo we do not own');
  return out;
}

/** The highest rung whose evidence holds. A FAILED claim anywhere makes the element FAILED. */
export function stageOf(claims) {
  if (claims.some((c) => c.verdict === 'FAILED')) return 'FAILED';
  /* THE LOOP STOPS AT "assembled", AND THAT IS ROW 26 OF THE REVIEW CATALOGUE ANSWERED. claimsOf
     pushes "shipped" unconditionally as NOT-CHECKED, so no input reaches a held "shipped" — and a
     rung the loop walks but can never return reads as though its guard merely had not fired yet.
     It is REPORTED, as a denominator; it is not climbed. Restore it here the day something reads
     the upstream branch, and not before. */
  let stage = 'designed';
  for (const name of ['built', 'assembled']) {
    if (claims.find((c) => c.rung === name)?.verdict === 'held') stage = name; else break;
  }
  return stage;
}

/**
 * FIVE RULES.
 *   1 stage-typed        — an element types a stage word, and stage is derived, never typed
 *   2 claim-fails        — a rung it claims does not hold (one finding per failing rung)
 *   3 orphan-set         — a registered set no element points at
 *   4 unpinned-set       — a registered set with no faults
 *   5 unit-set-as-seam   — one set key used for both rungs, so one run is counted twice
 */
export function inspect(ws, theme, io = {}) {
  const stages = stagesOf(theme);
  /* THE CALLER PASSES A ROOT, NOT THREE PIECES OF WIRING. Asking for `registry`, `tracked` and
     `read` when all three follow from the root is the pass-the-buck configuration parameter: the
     module has better information than the caller and asked anyway. The injected form stays — it
     is the door the 22 planted faults come in through — but it is now the exception, not the
     signature every real caller has to satisfy. */
  const from = io.root ? { registry: registryOf(io.root).sets, tracked: trackedIn(io.root),
    read: (f) => { try { return fs.readFileSync(path.join(io.root, f), 'utf8'); } catch { return null; } } } : {};
  const reg = io.registry ?? from.registry ?? {};
  const tracked = io.tracked ?? from.tracked;
  const read = io.read ?? from.read ?? (() => null);
  if (!tracked) return { state: 'UNEVALUABLE', why: 'git could not list tracked files, so "is this in the repo" has no answer and every path would read as missing', rows: [], findings: [] };

  const els = elements(ws).filter((e) => ['Software System', 'Container', 'Component'].includes(e.kind));
  const findings = [];
  const rows = [];
  const pointedAt = new Set();

  for (const el of els) {
    for (const t of el.tags) {
      if (!stages.includes(t.toLowerCase())) continue;
      findings.push({
        rule: 'stage-typed',
        where: `${el.name} · ${t}`,
        why: 'types a stage as a tag, and stage is DERIVED from evidence — a typed rung is a person asserting progress in the same document that proposes the work',
        cite: 'ours — the moment progress can be typed it will be typed ahead of itself',
      });
    }
    const props = el.properties ?? {};
    if (props.unit) pointedAt.add(props.unit);
    if (props.seam) pointedAt.add(props.seam);
    if (props.unit && props.unit === props.seam) {
      findings.push({
        rule: 'unit-set-as-seam',
        where: `${el.name} · ${props.unit}`,
        why: 'one set key is cited as both the unit and the seam evidence, so a single run is counted twice and the assembled rung rests on the built rung\'s faults',
        cite: 'ours — two rungs answering to one set is a ladder with one step',
      });
    }
    if (!claimKeys(theme).some((k) => props[k])) continue;
    const claims = claimsOf(el, { registry: reg, tracked, read });
    const stage = stageOf(claims);
    rows.push({ name: el.name, kind: el.kind, stage, claims });
    for (const c of claims) {
      if (c.verdict !== 'FAILED') continue;
      findings.push({
        rule: 'claim-fails',
        where: `${el.name} · ${c.rung}`,
        why: c.why,
        cite: 'ours — a rung nobody can check is a tag, and this machine exists so the diagram stops carrying those',
      });
    }
  }

  for (const d of vocabularyDrift(theme)) {
    findings.push({
      rule: 'claim-vocabulary-drift',
      where: d.name,
      why: `${d.side}, so the theme and this check disagree about what a DSL author may write`,
      cite: 'ours — the names have one implementation and one declaration, and nothing else may make them differ',
    });
  }

  for (const [key, set] of Object.entries(reg)) {
    if (!Array.isArray(set?.faults) || !set.faults.length) {
      findings.push({
        rule: 'unpinned-set',
        where: key,
        why: 'registered as a preregistered fault set and pins no faults, so it can never fail and can never be evidence',
        cite: 'ours — the planted fault IS the measurement',
      });
    }
    if (pointedAt.has(key)) continue;
    findings.push({
      rule: 'orphan-set',
      where: key,
      why: 'registered and no element in the model points at it, so nothing on the diagram is made truer by it',
      cite: 'ours — a set nobody cites cannot move a rung',
    });
  }

  if (!rows.length && !findings.length) return { state: 'ABSENT', stages, rows: [], findings: [] };
  return { state: findings.length ? 'findings' : 'clean', stages, rows, findings };
}

/* THE OVERLAY IS NOT PAINTED FROM HERE, and that is the review's design-it-twice answer taken.
   It lived in this file for one turn, keyed by the elements that CARRY a property — so a container
   whose every component was built painted nothing, which is CF-106 recurring in a second module.
   checks/element-state.mjs joins this axis to the seat axis, rolls both up the tree, and owns the
   payload. A rule with two homes is how CF-106 got its first half right and its second half wrong. */

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  const root = flag('--root', HERE);

  if (argv.includes('--negative')) {
    let ok = 0;
    let total = 0;
    const say = (n, pass, saw) => { total++; console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 300)}`}`); if (pass) ok++; };
    const theme = { delivery: { stage: { states: ['designed', 'built', 'assembled', 'shipped'] }, overlay: { key: 'r', fill: { designed: '#3c414d', built: '#1d6070', assembled: '#2f7d4f', FAILED: '#8c2233' } } } };

    const ws = (props, tags = 'Element,Component') => ({
      model: { softwareSystems: [{ id: 's1', name: 'Sys', tags: 'Element,Software System',
        containers: [{ id: 'c1', name: 'Runtime', tags: 'Element,Container',
          components: [{ id: 'k1', name: 'Guard', tags, properties: props }] }] }] },
      views: {},
    });
    const io = (over = {}) => ({
      tracked: new Set(['src/guard.ts', 'tests/guard.unit.ts', 'tests/guard.seam.ts']),
      registry: {
        'guard.unit': { file: 'tests/guard.unit.ts', faults: ['a call with no secret passes', 'a tagged secret is denied'] },
        'guard.seam': { file: 'tests/guard.seam.ts', host: 'ctx.tools.guard', faults: ['the registration is actually invoked'] },
      },
      read: (f) => ({ 'tests/guard.unit.ts': 'import { compose } from "../src/guard";',
        'tests/guard.seam.ts': 'register(ctx.tools.guard, guardFrom("../src/guard"));' })[f] ?? null,
      ...over,
    });
    const rules = (w, i = io()) => inspect(w, theme, i).findings.map((f) => f.rule);
    const only = (w, i = io()) => inspect(w, theme, i);
    const both = { implementation: 'src/guard.ts', unit: 'guard.unit', seam: 'guard.seam' };
    const unitOnly = { implementation: 'src/guard.ts', unit: 'guard.unit' };

    /* THE HAPPY PATH FIRST, because a check that cannot go green is not a check. */
    const good = ws(both);
    say('a component with a tracked file and two preregistered sets reaches assembled',
      only(good).rows[0]?.stage === 'assembled' && !only(good).findings.length, only(good));

    /* ── THE RUNG IS EARNED, NOT TYPED ──────────────────────────────────────────────────────── */
    say('an element that TYPES a stage is refused, because stage is derived',
      rules(ws({}, 'Element,Component,built')).includes('stage-typed'), rules(ws({}, 'Element,Component,built')));

    /* ── DISK IS NOT THE REPOSITORY ─────────────────────────────────────────────────────────── */
    const onDiskOnly = only(ws(unitOnly), io({ tracked: new Set(['tests/guard.unit.ts']) }));
    say('an implementation git does not track FAILS, however present it is on somebody\'s disk',
      onDiskOnly.rows[0]?.stage === 'FAILED', onDiskOnly.rows[0]);

    /* ── A TEST SET ALONE IS NOT A GUARD ────────────────────────────────────────────────────── */
    say('an implementation with no unit set at all does not reach built',
      only(ws({ implementation: 'src/guard.ts' })).rows[0]?.stage === 'FAILED', only(ws({ implementation: 'src/guard.ts' })).rows[0]);
    say('a unit set that is in no registry is refused, because unregistered is not preregistered',
      only(ws({ implementation: 'src/guard.ts', unit: 'guard.nope' })).rows[0]?.stage === 'FAILED',
      only(ws({ implementation: 'src/guard.ts', unit: 'guard.nope' })).rows[0]);
    const unpinned = io({ registry: { 'guard.unit': { file: 'tests/guard.unit.ts', faults: [] } } });
    say('a registered set that pins NO faults is refused — it cannot fail, so it cannot be evidence',
      only(ws(unitOnly), unpinned).rows[0]?.stage === 'FAILED', only(ws(unitOnly), unpinned).rows[0]);
    say('and the unpinned set is ALSO reported in its own right, not only through the element',
      rules(ws(unitOnly), unpinned).includes('unpinned-set'), rules(ws(unitOnly), unpinned));
    const setUntracked = io({ tracked: new Set(['src/guard.ts']) });
    say('a set whose own file git does not track is refused',
      only(ws(unitOnly), setUntracked).rows[0]?.stage === 'FAILED', only(ws(unitOnly), setUntracked).rows[0]);

    /* THE SET MUST NAME WHAT IT TESTS. A stub that mentions nothing passes every other rule. */
    const stub = io({ read: () => 'test("todo", () => {});' });
    say('a set that never mentions its subject is a set for something else',
      only(ws(unitOnly), stub).rows[0]?.stage === 'FAILED', only(ws(unitOnly), stub).rows[0]);
    say('and the loose match accepts an import of the basename, which is how a test actually refers to it',
      namesSubject('import { x } from "../src/guard";', 'src/guard.ts'), 'no');
    say('but a three-letter stem does not match on its own, which would match almost anything',
      !namesSubject('a ab c', 'src/ab.ts'), 'matched');

    /* ── THE SEAM MUST REACH THE HOST ───────────────────────────────────────────────────────── */
    const noHost = io({ registry: { ...io().registry, 'guard.seam': { file: 'tests/guard.seam.ts', faults: ['x'] } } });
    say('a seam set naming no host symbol is a unit test under a second name',
      only(ws(both), noHost).rows[0]?.stage === 'FAILED', only(ws(both), noHost).rows[0]);
    const oursOnly = io({ read: () => 'import "../src/guard";' });
    say('a seam set that never mentions the host exercises our half alone and is refused',
      only(ws(both), oursOnly).rows[0]?.stage === 'FAILED', only(ws(both), oursOnly).rows[0]);
    const theirsOnly = io({ read: (f) => f === 'tests/guard.seam.ts' ? 'register(ctx.tools.guard, noop);' : 'import "../src/guard";' });
    say('and one that mentions only the host exercises THEIR half alone and is refused too',
      only(ws(both), theirsOnly).rows[0]?.stage === 'FAILED', only(ws(both), theirsOnly).rows[0]);
    say('one key cited as BOTH unit and seam is caught, because a ladder with one step is not two rungs',
      rules(ws({ implementation: 'src/guard.ts', unit: 'guard.unit', seam: 'guard.unit' })).includes('unit-set-as-seam'),
      rules(ws({ implementation: 'src/guard.ts', unit: 'guard.unit', seam: 'guard.unit' })));

    /* ── NOT-CLAIMED IS NOT FAILED, and a young model is mostly not-claimed ─────────────────── */
    say('a component claiming nothing is not a finding — an unwritten box is honest, not broken',
      only(ws({}), io({ registry: {} })).state === 'ABSENT', only(ws({}), io({ registry: {} })));
    const builtOnly = only(ws(unitOnly), io({ registry: { 'guard.unit': io().registry['guard.unit'] } }));
    say('built without a seam set stops AT built rather than failing',
      builtOnly.rows[0]?.stage === 'built' && !builtOnly.findings.length, builtOnly);
    say('shipped is reported NOT-CHECKED, never held, because no guard reads an upstream branch',
      builtOnly.rows[0]?.claims.find((c) => c.rung === 'shipped')?.verdict === 'NOT-CHECKED',
      builtOnly.rows[0]?.claims);

    /* ── A REGISTERED SET NOBODY CITES ──────────────────────────────────────────────────────── */
    say('a set no element points at is reported, because it moves no rung',
      rules(ws(unitOnly)).includes('orphan-set'), rules(ws(unitOnly)));

    /* ── GIT SILENT IS UNEVALUABLE, NEVER CLEAN AND NEVER ALL-MISSING ──────────────────────── */
    say('a tree git cannot list is UNEVALUABLE, not a model where every path is missing',
      inspect(good, theme, { ...io(), tracked: null }).state === 'UNEVALUABLE',
      inspect(good, theme, { ...io(), tracked: null }).state);

    /* ── PREREGISTERED AND UNWRITTEN IS THE FIRST HONEST STATE, NOT A FAILURE ──────────────── */
    const pending = io({ registry: { 'guard.unit': { faults: ['a call with no secret passes'] } } });
    const pendingRow = only(ws({ unit: 'guard.unit' }), pending).rows[0];
    say('a set with faults and no file yet leaves the box at designed rather than failing it',
      pendingRow?.stage === 'designed', pendingRow);
    say('and the reason says preregistered-unwritten, so nobody reads it as a broken claim',
      /preregistered, unwritten/.test(pendingRow?.claims.find((c) => c.rung === 'built')?.why ?? ''),
      pendingRow?.claims);
    const gone = io({ registry: { 'guard.unit': { file: 'tests/gone.ts', faults: ['x'] } } });
    say('but the moment it NAMES a file git cannot see, it is a failure again',
      only(ws(unitOnly), gone).rows[0]?.stage === 'FAILED', only(ws(unitOnly), gone).rows[0]);

    /* ── THE TWO HOMES FOR THE PROPERTY NAMES MUST AGREE ───────────────────────────────────── */
    const drifted = { ...theme, delivery: { ...theme.delivery, properties: { implementation: 'x', unit: 'x', seam: 'x', upstream: 'x', invented: 'x' } } };
    say('a theme documenting a property nothing here reads is caught',
      inspect(ws({}), drifted, io({ registry: {} })).findings.some((f) => f.rule === 'claim-vocabulary-drift'),
      inspect(ws({}), drifted, io({ registry: {} })).findings);
    const short = { ...theme, delivery: { ...theme.delivery, properties: { implementation: 'x' } } };
    say('and a property read here that no theme documents is caught too, which is the other direction',
      vocabularyDrift(short).length === 3, vocabularyDrift(short));
    say('a theme declaring no properties block is not accused of drift — it opted out, it did not disagree',
      !vocabularyDrift(theme).length, vocabularyDrift(theme));

    /* ── THE ROOT DOES THE WIRING, so a real caller passes one thing (row 19) ───────────────── */
    say('inspect accepts a root and derives the registry, the tracked set and the reader from it',
      inspect(good, theme, { root: '/nonexistent-tree' }).state === 'UNEVALUABLE',
      inspect(good, theme, { root: '/nonexistent-tree' }).state);

    /* THE DENOMINATOR IS COUNTED, NOT TYPED, and that is a fault this set found in itself. The
       pinned total read 21 while 22 assertions ran, so a genuine failure — a seam set naming only
       the host, scored assembled — left ok at 21 and the process exited 0. A hand-typed total is a
       number that drifts every time an assertion is added; comparing the RUN count against the pin
       makes the drift itself a failure. */
    const PINNED = 27;
    console.log(`\n${ok} of ${total} held` + (total === PINNED ? '' : `  · MISCOUNT: ${PINNED} pinned`));
    process.exit(ok === total && total === PINNED ? 0 : 1);
  }

  let theme;
  try { theme = JSON.parse(fs.readFileSync(path.join(root, 'architecture', 'theme.json'), 'utf8')); }
  catch (e) { console.log(`UNEVALUABLE — architecture/theme.json could not be read (${e.message})`); process.exit(3); }

  const reg = registryOf(root);
  if (reg.state === 'UNEVALUABLE') { console.log(`UNEVALUABLE — ${reg.file} does not parse: ${reg.why}`); process.exit(3); }

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
    console.log(`\n  stage · ${path.relative(process.cwd(), f)} · registry: ${reg.state}${reg.state === 'ABSENT' ? ' (no rung above designed can be reached)' : ` · ${Object.keys(reg.sets).length} set(s)`}`);
    if (r.state === 'UNEVALUABLE') { console.log(`    UNEVALUABLE — ${r.why}`); process.exit(3); }
    if (r.state === 'ABSENT') { console.log('    ABSENT — no element claims an implementation, so every box is at `designed` and the diagram says so honestly'); continue; }
    for (const row of r.rows) {
      console.log(`    ${row.stage.padEnd(10)} ${row.kind.padEnd(16)} ${row.name}`);
      for (const c of row.claims) console.log(`         ${c.rung.padEnd(10)} ${c.verdict.padEnd(12)} ${c.why}`);
    }
    for (const x of r.findings) { bad++; console.log(`    FAIL ${x.rule}\n         ${x.where}\n         ${x.why}\n         ${x.cite}`); }
  }
  console.log(`\n  ${bad} finding(s)`);
  process.exit(bad ? 1 : 0);
}
