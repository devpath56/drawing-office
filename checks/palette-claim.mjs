/**
 * PALETTE-CLAIM — a fill is a sentence, and this refuses one that says something untrue.
 *
 * THE PALETTE HAS ALWAYS MEANT SOMETHING. architecture/theme.json says so in its own words:
 * "violet: ours: we build it, we can change it" and "muted green: not ours: a person, or a system
 * that already exists and that we call rather than build". It also states the exception —
 * "a deployment node is where things RUN, not a thing we build, so it is drawn as a frame ...
 * It makes no hue claim because ownership is not what it says."
 *
 * ALL OF THAT WAS PROSE, AND PROSE HAS NO CONTROL. Measured 2026-09-05, CF-104's own repair:
 * fixing the reader made two new tags visible, "Container Instance" and "Software System Instance",
 * and I styled them from Container and Software System — violet. That painted the attacker's agent,
 * the attacker's listener, the OTel collector and the corporate network controls as OURS, and
 * claimed Slack's own containers too. checks/diagram-contrast.mjs passed: the ratios were 5.8:1 and
 * 8.97:1. checks/diagram-key.mjs passed: the tags WERE styled. Neither asks whether the sentence the
 * fill speaks is true, so a row can clear every check in the repo and still lie about ownership.
 *
 * The operator caught it by looking at the picture, which is the detector this file replaces.
 *
 * TWO RULES.
 *   1 undeclared-fill      a row fills with a colour `hues` does not name, so nobody can say what
 *                          it claims — the state the instance rows were in before this existed
 *   2 claim-on-a-placement a row listed in `noClaim` carries an OWNERSHIP hue. A frame and an
 *                          instance say WHERE, not WHOSE; the renderer already resolves an instance
 *                          from the element it instances, and a hue here overwrites that answer
 *
 * WHAT IT DOES NOT DO, said rather than discovered later: it cannot tell whether "ours" is TRUE of a
 * given element. It checks that a fill's claim is declared and that rows forbidden from claiming do
 * not. Whether the harness is really ours is a modelling judgement no checker owns.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { boundaryTags, elements as modelElements, styles as modelStyles } from './model.mjs';
import { resolve } from './style-resolve.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'UNEVALUABLE']);
export const OWNERSHIP = Object.freeze(['ours', 'not ours']);

export const norm = (c) => String(c ?? '').trim().toLowerCase();

/**
 * RULE 4 — an INSTANCE must not claim something different from the thing it instances.
 *
 * THE ONE RULE HERE THAT IS NOT SELF-REFERENTIAL, and that is the whole reason it exists. Rules 1
 * and 2 read `hues` and `noClaim` out of the very file they judge: an adversarial author declares a
 * fill means whatever suits and both go green. Measured — a palette calling our own container
 * "not ours" passes rule 1, and deleting a tag from `noClaim` silences rule 2. They are tier D
 * attention mechanisms and are declared as such.
 *
 * This one joins TWO facts from the MODEL. An exported instance carries only its own tag —
 * "Container Instance", "Software System Instance" — and not the tags of the element it instances.
 * So if that row makes an ownership claim, the instance says it while the thing it points at says
 * something else. That is exactly the defect of 2026-09-05: the OTel collector, the attacker's
 * listener, the attacker's agent and the corporate network controls resolved to violet="ours"
 * through their instance rows while every one of those systems carries Existing System.
 *
 * IT RESTS ON A FALSIFIED-THEN-CORRECTED RESOLVER (PR-039). The first version of resolve() assumed
 * fill is a function of tags alone; the renderer disagreed on an element that is a view's SCOPE and
 * is drawn as a boundary. Scope is skipped here for that reason, not from caution.
 */
export function instanceClaims(elements, styleRows, hues) {
  const claim = new Map(Object.entries(hues ?? {}).map(([k, v]) => [norm(k), v]));
  const byId = new Map(elements.map((e) => [e.id, e]));
  const out = [];
  for (const e of elements) {
    if (!e.ofId) continue;
    const target = byId.get(String(e.ofId));
    if (!target) continue;
    const mine = claim.get(norm(resolve(e.tags.join(','), styleRows).background));
    const theirs = claim.get(norm(resolve(target.tags.join(','), styleRows).background));
    if (!mine || !OWNERSHIP.includes(mine)) continue;      // no claim of its own: the renderer resolves through
    if (!theirs || !OWNERSHIP.includes(theirs)) continue;  // nothing to disagree with
    /* AN INSTANCE HAS NO NAME OF ITS OWN in the export, so naming it by id would send a reader
       hunting through a file for a number. It is identified by what it instances. */
    if (mine !== theirs) out.push({ instance: `the ${String(e.kind).toLowerCase()} of ${target.name}`, of: target.name, mine, theirs });
  }
  return out;
}

export function inspect(theme, { boundaries = new Set(), elements = null, styleRows = null } = {}) {
  const hues = theme?.hues;
  if (!hues || !Object.keys(hues).length) {
    return { state: 'UNEVALUABLE', why: 'theme.json declares no `hues`, so nothing says what a fill claims', findings: [], rows: 0 };
  }
  const claim = new Map(Object.entries(hues).map(([k, v]) => [norm(k), v]));
  const noClaim = new Set(theme?.noClaim ?? []);
  const findings = [];
  let rows = 0;

  for (const row of theme?.elements ?? []) {
    const fill = norm(row.background);
    if (!fill) continue;
    rows++;
    if (!claim.has(fill)) {
      findings.push({
        rule: 'undeclared-fill',
        where: `${row.tag} · ${row.background}`,
        why: 'this fill is not in theme.json\'s `hues`, so the palette cannot say what it claims and nobody can check whether it is true',
      });
      continue;
    }
    if (noClaim.has(row.tag) && !boundaries.has(row.tag) && boundaries.size) {
      findings.push({
        rule: 'not-a-boundary',
        where: `${row.tag} · declared noClaim`,
        why: 'nothing in the model that carries this tag CONTAINS anything, so it is a leaf rather than a '
           + 'boundary, and the frame treatment draws a thing that runs as an empty box. Only a container of '
           + 'other elements may decline to make a hue claim',
      });
    }
    if (noClaim.has(row.tag) && OWNERSHIP.includes(claim.get(fill))) {
      findings.push({
        rule: 'claim-on-a-placement',
        where: `${row.tag} · ${row.background} claims "${claim.get(fill)}"`,
        why: 'this row says WHERE something runs, not whose it is — a frame or an instance is a placement. '
           + 'The renderer resolves an instance from the element it instances; an ownership fill here overwrites '
           + 'that answer, and it will be wrong for every instance of something we do not own',
      });
    }
  }
  /* RULE 4, and it only runs when a model was supplied — a claim it cannot join is NOT-CHECKED. */
  if (elements && styleRows) {
    for (const c of instanceClaims(elements, styleRows, hues)) {
      findings.push({
        rule: 'instance-contradicts-its-target',
        where: `${c.instance} claims "${c.mine}" · ${c.of} says "${c.theirs}"`,
        why: 'an instance carries only its own tag, so an ownership fill on that row speaks for every '
           + 'instance of everything — including the things we do not own. The picture then says we own '
           + 'what the model says we do not',
      });
    }
  }

  return { state: findings.length ? 'findings' : 'clean', findings, rows, joined: elements ? elements.filter((e) => e.ofId).length : null };
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
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 240)}`}`); if (pass) ok++; };
    const base = {
      hues: { '#3f4383': 'ours', '#2b3a33': 'not ours', '#1f2226': 'no claim' },
      noClaim: ['Deployment Node', 'Software System Instance'],
      elements: [{ tag: 'Software System', background: '#3f4383' }, { tag: 'Existing System', background: '#2b3a33' }],
    };
    const rules = (t) => inspect(t).findings.map((f) => f.rule);

    say('a palette whose every fill is declared is clean', inspect(base).state === 'clean', inspect(base).findings);

    /* THE EXACT DEFECT, replayed: the instance row styled from Software System. */
    const mine = { ...base, elements: [...base.elements, { tag: 'Software System Instance', background: '#3f4383' }] };
    say('the CF-104 repair fires — an ownership fill on an instance row',
      rules(mine).includes('claim-on-a-placement'), inspect(mine).findings);

    say('and a frame carrying an ownership fill fires the same way',
      rules({ ...base, elements: [...base.elements, { tag: 'Deployment Node', background: '#2b3a33' }] }).includes('claim-on-a-placement'), 'frame');

    /* THE FIX MUST PASS: no fill at all on a placement row. */
    say('a placement row with no fill is clean, which is the shape the fix takes',
      inspect({ ...base, elements: [...base.elements, { tag: 'Software System Instance', for: 'explained on the key' }] }).state === 'clean', 'no fill');
    say('and a placement row filled with the declared no-claim colour is clean too',
      inspect({ ...base, elements: [...base.elements, { tag: 'Deployment Node', background: '#1f2226' }] }).state === 'clean', 'frame fill');

    /* A COLOUR NOBODY DECLARED cannot be judged, so it is refused rather than waved through. */
    say('a fill the palette never declares is caught',
      rules({ ...base, elements: [...base.elements, { tag: 'Mystery', background: '#ff0000' }] }).includes('undeclared-fill'), 'undeclared');
    say('case and whitespace do not smuggle an undeclared fill past it',
      inspect({ ...base, elements: [{ tag: 'X', background: '  #3F4383 ' }] }).state === 'clean', 'normalised');

    /* AND AN OWNERSHIP ROW THAT IS NOT A PLACEMENT MUST NOT FIRE. */
    say('an ordinary row carrying an ownership fill is exactly what the palette is for',
      !rules({ ...base, elements: [{ tag: 'Container', background: '#3f4383' }] }).includes('claim-on-a-placement'), 'ordinary');

    say('a theme with no hues block is UNEVALUABLE, never a clean pass',
      inspect({ elements: [{ tag: 'X', background: '#123456' }] }).state === 'UNEVALUABLE', inspect({ elements: [] }));
    say('and the report says how many rows it judged, so clean is not empty',
      inspect(base).rows === 2, inspect(base).rows);

    /* ── THE EXEMPTION MUST BE EARNED, NOT TYPED ──────────────────────────────────────────────
       "Infrastructure Node" sat in noClaim because its author put it there by analogy, one commit
       after this check shipped claiming to guard the palette. It holds nothing, so the detection
       worker rendered as a 450x300 empty box and the operator found it by hand. */
    const model = { model: { deploymentNodes: [
      { name: 'Render', tags: 'Element,Deployment Node', infrastructureNodes: [{ name: 'Worker', tags: 'Element,Infrastructure Node' }] },
    ] } };
    const bounds = boundaryTags(model);
    say('a tag that CONTAINS something is a boundary', bounds.has('Deployment Node'), [...bounds]);
    say('and a tag that holds nothing is NOT, however it was declared', !bounds.has('Infrastructure Node'), [...bounds]);

    const typed = { ...base, noClaim: ['Deployment Node', 'Infrastructure Node'],
      elements: [...base.elements, { tag: 'Infrastructure Node', background: '#1f2226' }] };
    say('the defect fires — a leaf declared noClaim takes the frame treatment',
      inspect(typed, { boundaries: bounds }).findings.some((f) => f.rule === 'not-a-boundary'), inspect(typed, { boundaries: bounds }).findings);
    say('and a real boundary in the same list does not fire',
      !inspect({ ...base, noClaim: ['Deployment Node'], elements: [...base.elements, { tag: 'Deployment Node', background: '#1f2226' }] }, { boundaries: bounds })
        .findings.some((f) => f.rule === 'not-a-boundary'), 'boundary ok');
    say('with no model to read the rule stays silent rather than guessing',
      !inspect(typed, { boundaries: new Set() }).findings.some((f) => f.rule === 'not-a-boundary'), 'NOT-CHECKED');

    /* ── RULE 4: THE ONE THAT IS NOT SELF-REFERENTIAL ────────────────────────────────────────── */
    const sysRows = [
      { tag: 'Software System', background: '#3f4383' },
      { tag: 'Existing System', background: '#2b3a33' },
      { tag: 'Software System Instance' },
    ];
    const els = [
      { id: '1', name: 'OTel collector', kind: 'Software System', tags: ['Element', 'Software System', 'Existing System'] },
      { id: '2', name: 'Our harness', kind: 'Software System', tags: ['Element', 'Software System'] },
      { id: '9', name: null, kind: 'Software System Instance', tags: ['Software System Instance'], ofId: '1' },
      { id: '10', name: null, kind: 'Software System Instance', tags: ['Software System Instance'], ofId: '2' },
    ];
    const hues4 = { '#3f4383': 'ours', '#2b3a33': 'not ours' };

    say('a colourless instance row contradicts nothing — the renderer resolves through it',
      instanceClaims(els, sysRows, hues4).length === 0, instanceClaims(els, sysRows, hues4));

    /* THE DEFECT OF 2026-09-05, REPLAYED: the instance row given the ownership fill. */
    const violet = sysRows.map((r) => (r.tag === 'Software System Instance' ? { ...r, background: '#3f4383' } : r));
    const caught = instanceClaims(els, violet, hues4);
    say('an ownership fill on the instance row contradicts every not-ours target',
      caught.length === 1 && caught[0].of === 'OTel collector', caught);
    say('and it does NOT fire on the instance of something that really is ours',
      !caught.some((c) => c.of === 'Our harness'), caught.map((c) => c.of));
    say('the finding names what the instance instances, not an id a reader must hunt for',
      /software system instance of OTel collector/.test(caught[0].instance), caught[0].instance);

    /* THE JOIN NEEDS BOTH SIDES. An instance pointing at nothing is skipped, not guessed at. */
    say('an instance whose target is missing from the model is skipped rather than judged',
      instanceClaims([{ id: '9', kind: 'Software System Instance', tags: ['Software System Instance'], ofId: 'gone' }], violet, hues4).length === 0, 'dangling');
    say('and a fill with no declared claim on either side is skipped, never guessed',
      instanceClaims(els, violet, { '#3f4383': 'no claim', '#2b3a33': 'no claim' }).length === 0, 'undeclared');

    /* THE DENOMINATOR: rule 4 without a model is NOT-CHECKED, and must not read as clean. */
    say('with no model supplied the join reports null rather than zero',
      inspect(base).joined === null, inspect(base).joined);
    say('and with a model it says how many instances it actually joined',
      inspect(base, { elements: els, styleRows: sysRows }).joined === 2, inspect(base, { elements: els, styleRows: sysRows }).joined);

    /* THE LIVE PALETTE. Asserted CLEAN here on purpose: unlike a tree full of other people's
       modules, this file is the subject and its state is the thing under test. */
    const live = JSON.parse(fs.readFileSync(path.join(HERE, 'architecture', 'theme.json'), 'utf8'));
    /* THE DENOMINATOR IS EVERY MODEL IN THE ROOT, which is what the CLI does. The first draft read
       payments alone — a model with no deployment nodes — so "Deployment Node" was not a boundary
       there and the shipped palette failed its own rule. A narrower denominator than the caller's
       is a fixture that tests a different question. */
    const liveBounds = new Set();
    for (const d of fs.readdirSync(path.join(HERE, 'architecture'), { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const f = path.join(HERE, 'architecture', d.name, 'workspace.json');
      if (fs.existsSync(f)) for (const t of boundaryTags(JSON.parse(fs.readFileSync(f, 'utf8')))) liveBounds.add(t);
    }
    say('the shipped palette makes no false ownership claim', inspect(live, { boundaries: liveBounds }).state === 'clean', inspect(live, { boundaries: liveBounds }).findings);

    console.log(`\n${ok} of 24 held`);
    process.exit(ok === 24 ? 0 : 1);
  }

  const file = path.join(root, 'architecture', 'theme.json');
  let theme;
  try { theme = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.log(`UNEVALUABLE — ${file} could not be read: ${e.message}`); process.exit(3); }

  /* THE BOUNDARY DENOMINATOR comes from the models in this root. With none readable the third rule
     stays silent, which is NOT-CHECKED rather than clean. */
  const dir = path.join(root, 'architecture');
  let boundaries = new Set();
  if (fs.existsSync(dir)) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const f = path.join(dir, d.name, 'workspace.json');
      if (!fs.existsSync(f)) continue;
      try { for (const t of boundaryTags(JSON.parse(fs.readFileSync(f, 'utf8')))) boundaries.add(t); } catch { /* a model that will not parse is another check's finding */ }
    }
  }
  /* THE MODEL FOR RULE 4. Its elements and the styles the export resolved, from the same file, so
     the join is between two facts the exporter agreed on rather than two of our guesses. */
  let elements = null, styleRows = null;
  if (fs.existsSync(dir)) {
    const all = [];
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const f = path.join(dir, d.name, 'workspace.json');
      if (!fs.existsSync(f)) continue;
      try {
        const ws = JSON.parse(fs.readFileSync(f, 'utf8'));
        all.push(...modelElements(ws));
        styleRows = styleRows ?? modelStyles(ws).elements;
      } catch { /* a model that will not parse is another check's finding */ }
    }
    if (all.length) elements = all;
  }
  const r = inspect(theme, { boundaries, elements, styleRows });
  if (r.state === 'UNEVALUABLE') { console.log(`UNEVALUABLE — ${r.why}`); process.exit(3); }
  console.log(`\n  palette-claim · ${r.rows} filled row(s)`);
  for (const f of r.findings) console.log(`    FAIL ${f.rule}\n         ${f.where}\n         ${f.why}`);
  if (!r.findings.length) console.log('    every fill declares what it claims, and no placement row claims ownership');
  console.log(`\n  ${r.findings.length} finding(s)`);
  process.exit(r.findings.length ? 1 : 0);
}
