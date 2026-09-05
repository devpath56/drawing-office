/**
 * SITE-FRESH — the page the operator opens must be the model the checks passed.
 *
 * MEASURED 2026-09-05, and the incident is the whole specification. A deployment view was added to
 * the mcp-guard model, `structurizr-cli export -f json` was run, and all six checks went green
 * against `workspace.json`. The operator opened the viewer and got a blank plate. The reason:
 * `-f static` was never run, so `site/workspace.js` still held FIVE views and the wrapper's rail —
 * built from the fresh json — offered a sixth that the embedded bundle had never heard of. Clicking
 * it set a hash the renderer could not resolve, and an empty canvas is what that looks like.
 *
 * TWO SOURCES, ONE FRESH AND ONE STALE, AND NOTHING SAID SO. Every instrument in this repo reads
 * `workspace.json`. Nothing read the bundle the browser actually executes, so a green suite and a
 * broken page were consistent with each other for as long as it took someone to look.
 *
 * WHAT IT COMPARES, and it is deliberately not a byte diff: the two files are different formats and
 * the bundle is base64 inside a single line of JavaScript. It compares what a READER would notice —
 * the set of view keys, and per view the element and relationship counts. A layout nudge does not
 * fire it; a view that exists in one and not the other does.
 *
 * exit 0 fresh · 1 stale · 3 UNEVALUABLE, with the reason
 * ABSENT is a fourth state and it is NOT a failure: a project with no site directory has nothing to
 * be stale, and the static export is optional. Silence about it would be the same defect one level
 * down, so it is printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['fresh', 'stale', 'ABSENT', 'UNEVALUABLE']);

/**
 * The workspace the browser will execute, decoded out of `site/workspace.js`.
 * THE BUNDLE IS ONE LINE OF BASE64 inside a JS assignment, which is also why a rename shows up as a
 * 9,684-character diff — the fact `checks/derived.mjs` exists to keep out of version control.
 */
export function bundle(file, { read = fs } = {}) {
  if (!read.existsSync(file)) return { state: 'ABSENT', why: `${file} is not there; no static export has been made` };
  let text;
  try { text = read.readFileSync(file, 'utf8'); }
  catch (e) { return { state: 'UNEVALUABLE', why: `${file} could not be read — ${e.message}` }; }
  const m = text.match(/'([A-Za-z0-9+/=]{200,})'/);
  if (!m) return { state: 'UNEVALUABLE', why: `${file} carries no base64 payload; the exporter's format may have changed` };
  try { return { state: 'read', ws: JSON.parse(Buffer.from(m[1], 'base64').toString('utf8')) }; }
  catch (e) { return { state: 'UNEVALUABLE', why: `${file}'s payload does not decode to a workspace — ${e.message}` }; }
}

/** view key -> a shape a reader would notice changing. */
export function shape(ws) {
  const out = new Map();
  for (const [field, list] of Object.entries(ws?.views ?? {})) {
    if (!Array.isArray(list)) continue;
    for (const v of list) out.set(v.key, { kind: field, elements: (v.elements ?? []).length, relationships: (v.relationships ?? []).length });
  }
  return out;
}

export function compare(model, site) {
  const a = shape(model);
  const b = shape(site);
  const findings = [];
  for (const [key, m] of a) {
    const s = b.get(key);
    if (!s) {
      findings.push({ rule: 'view-missing-from-the-site', where: key,
        why: 'the model declares this view and the bundle the browser executes has never heard of it, so the rail offers a plate that cannot render — re-run: structurizr-cli export -f static' });
      continue;
    }
    if (s.elements !== m.elements || s.relationships !== m.relationships) {
      findings.push({ rule: 'view-differs-from-the-site', where: key,
        why: `the model draws ${m.elements} element(s) and ${m.relationships} relationship(s); the site draws ${s.elements} and ${s.relationships} — re-run: structurizr-cli export -f static` });
    }
  }
  for (const key of b.keys()) {
    if (!a.has(key)) findings.push({ rule: 'view-only-in-the-site', where: key,
      why: 'the bundle draws a view the model no longer declares, so the page shows something no check has judged — re-run: structurizr-cli export -f static' });
  }
  return { state: findings.length ? 'stale' : 'fresh', findings, views: a.size };
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
    const mk = (views) => ({ views });
    const five = mk({ systemContextViews: [{ key: 'Ctx', elements: [1, 2], relationships: [1] }],
                      dynamicViews: [{ key: 'Chain', elements: [1, 2, 3], relationships: [1, 2] }] });
    const rules = (m, s) => compare(m, s).findings.map((f) => f.rule);

    say('a site that matches the model is fresh', compare(five, five).state === 'fresh', compare(five, five).findings);

    /* THE INCIDENT: the model gained a view and the static export was never re-run. */
    const six = mk({ ...five.views, deploymentViews: [{ key: 'Deployment', elements: [1, 2, 3], relationships: [1] }] });
    say('the incident fires — a view in the model that the bundle has never heard of',
      rules(six, five).includes('view-missing-from-the-site'), rules(six, five));

    say('and it names the command that fixes it, so a reader is not left guessing',
      compare(six, five).findings[0].why.includes('export -f static'), compare(six, five).findings[0].why);

    /* THE OTHER DIRECTION, which is a different defect: the page shows what no check judged. */
    say('a view the bundle still draws after the model dropped it is caught too',
      rules(five, six).includes('view-only-in-the-site'), rules(five, six));

    /* A VIEW THAT GREW OR SHRANK, which is the quiet case — same key, different content. */
    const grown = mk({ ...five.views, systemContextViews: [{ key: 'Ctx', elements: [1, 2, 3, 4], relationships: [1] }] });
    say('a view whose element count changed is caught, not only a missing key',
      rules(grown, five).includes('view-differs-from-the-site'), rules(grown, five));

    /* AND A LAYOUT NUDGE MUST NOT FIRE IT, or the check cries wolf on every drag. */
    const moved = JSON.parse(JSON.stringify(five));
    moved.views.systemContextViews[0].elements = [{ id: 'a', x: 99 }, { id: 'b', x: 200 }];
    say('a layout change with the same counts is NOT stale, so the check does not cry wolf',
      compare(moved, five).state === 'fresh', compare(moved, five).findings);

    /* THE BUNDLE READER'S OWN FOUR ANSWERS. */
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'site-'));
    say('no site directory is ABSENT with a reason, never a silent pass',
      bundle(path.join(dir, 'workspace.js')).state === 'ABSENT', bundle(path.join(dir, 'workspace.js')));
    const junk = path.join(dir, 'junk.js'); fs.writeFileSync(junk, 'var x = 1;');
    say('a file with no base64 payload is UNEVALUABLE, never read as empty',
      bundle(junk).state === 'UNEVALUABLE', bundle(junk));
    const bad = path.join(dir, 'bad.js');
    fs.writeFileSync(bad, `structurizr.workspace = '${Buffer.from('not json at all, but long enough to match the payload pattern by far').toString('base64')}';`);
    say('a payload that decodes to something that is not a workspace is UNEVALUABLE',
      bundle(bad).state === 'UNEVALUABLE', bundle(bad));
    const good = path.join(dir, 'good.js');
    fs.writeFileSync(good, `structurizr.workspace = '${Buffer.from(JSON.stringify(five)).toString('base64')}';`);
    say('a real bundle decodes and compares clean against its own model',
      bundle(good).state === 'read' && compare(five, bundle(good).ws).state === 'fresh', bundle(good).state);

    console.log(`\n${ok} of 10 held`);
    process.exit(ok === 10 ? 0 : 1);
  }

  const dir = path.join(root, 'architecture');
  const projects = fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())
        .filter((d) => fs.existsSync(path.join(dir, d.name, 'workspace.json'))).map((d) => d.name)
    : [];
  if (!projects.length) { console.log('UNEVALUABLE — no exported workspace.json found; export the DSL first'); process.exit(3); }

  let bad = 0;
  for (const p of projects) {
    let model;
    try { model = JSON.parse(fs.readFileSync(path.join(dir, p, 'workspace.json'), 'utf8')); }
    catch (e) { console.log(`UNEVALUABLE — ${p}/workspace.json does not parse: ${e.message}`); process.exit(3); }
    const b = bundle(path.join(dir, p, 'site', 'workspace.js'));
    console.log(`\n  site-fresh · ${p}`);
    if (b.state === 'ABSENT') { console.log(`    ABSENT — ${b.why}. The static export is optional; nothing is stale.`); continue; }
    if (b.state === 'UNEVALUABLE') { console.log(`    UNEVALUABLE — ${b.why}`); process.exit(3); }
    const r = compare(model, b.ws);
    for (const f of r.findings) { bad++; console.log(`    FAIL ${f.rule}\n         ${f.where}\n         ${f.why}`); }
    if (!r.findings.length) console.log(`    the page draws the same ${r.views} view(s) the checks judged`);
  }
  console.log(`\n  ${bad} finding(s)`);
  process.exit(bad ? 1 : 0);
}
