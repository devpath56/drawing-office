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

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'UNEVALUABLE']);
export const OWNERSHIP = Object.freeze(['ours', 'not ours']);

export const norm = (c) => String(c ?? '').trim().toLowerCase();

export function inspect(theme) {
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
  return { state: findings.length ? 'findings' : 'clean', findings, rows };
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

    /* THE LIVE PALETTE. Asserted CLEAN here on purpose: unlike a tree full of other people's
       modules, this file is the subject and its state is the thing under test. */
    const live = JSON.parse(fs.readFileSync(path.join(HERE, 'architecture', 'theme.json'), 'utf8'));
    say('the shipped palette makes no false ownership claim', inspect(live).state === 'clean', inspect(live).findings);

    console.log(`\n${ok} of 11 held`);
    process.exit(ok === 11 ? 0 : 1);
  }

  const file = path.join(root, 'architecture', 'theme.json');
  let theme;
  try { theme = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.log(`UNEVALUABLE — ${file} could not be read: ${e.message}`); process.exit(3); }

  const r = inspect(theme);
  if (r.state === 'UNEVALUABLE') { console.log(`UNEVALUABLE — ${r.why}`); process.exit(3); }
  console.log(`\n  palette-claim · ${r.rows} filled row(s)`);
  for (const f of r.findings) console.log(`    FAIL ${f.rule}\n         ${f.where}\n         ${f.why}`);
  if (!r.findings.length) console.log('    every fill declares what it claims, and no placement row claims ownership');
  console.log(`\n  ${r.findings.length} finding(s)`);
  process.exit(r.findings.length ? 1 : 0);
}
