/**
 * DERIVED — what the exporter makes must not be what a reviewer reads.
 *
 * CHECKPOINT 13 ASKED whether a one-line DSL change reads as a one-line diff in a pull request, and
 * preregistered two ways of being dead: the diff is dominated by generated output, or the model
 * change is unreadable as text. MEASURED 2026-09-05, by renaming one container in the payments model
 * and re-exporting:
 *
 *   architecture/payments/workspace.dsl        1 line changed, longest line 137 chars — readable
 *   architecture/payments/workspace.json       1 line changed, longest line 1,942 chars
 *   architecture/payments/site/workspace.js    1 line changed, and the file is ONE 9,684-char line
 *                                              of base64 that the rename rewrites end to end
 *
 * SO THE SECOND REDPROOF IS FALSE and the first is true in the units that matter. By LINES the diff
 * is 3 changed lines and the model's own change is one of them. By BYTES the readable part is 137
 * characters and the generated churn is about 11.6 KB — the word-diff of that single bundle line
 * alone runs to 19,588 bytes. A reviewer does not read lines, they read a page, and a page with a
 * rewritten base64 blob on it is a page nobody reads.
 *
 * I PREDICTED THIS WRONG, and the prediction is recorded because it is the more useful half: I told
 * the operator a one-word rename would land as "thousands of lines". It lands as three. The defect
 * was real and my unit was not, which is exactly the shape of error a measurement exists to catch.
 *
 * THE FIX IS NOT A SMALLER DIFF, IT IS NO DIFF: 8.3 MB across 68 tracked files under
 * each project's site directory — a vendored jQuery, lodash, backbone, JointJS, bootstrap and eleven font
 * files — every byte of it reproduced by one `structurizr-cli export -f static`. This check refuses
 * to let it come back.
 *
 * WHAT STAYS TRACKED, deliberately: workspace.json. It is derived too, but the checks and the
 * wrapper read it, it is pretty-printed, and its diff is legible. "Derived" is not the criterion —
 * "derived AND unreadable AND large" is, and the list below is the judgement rather than a rule
 * anyone could infer.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'UNEVALUABLE']);

/**
 * ONE HOME FOR THE JUDGEMENT. Each row is a path shape that the exporter produces and a human
 * cannot review, with the command that reproduces it — so a reader who finds it missing knows how
 * to get it back rather than assuming the repo is broken.
 */
export const DERIVED = Object.freeze([
  {
    match: /(^|\/)architecture\/[^/]+\/site\//,
    ignore: 'architecture/*/site/',
    why: 'the exported static site — a vendored renderer plus a single-line base64 workspace that a one-word rename rewrites end to end',
    rebuild: 'structurizr-cli export -w architecture/<project>/workspace.dsl -f static -o architecture/<project>/site',
  },
  {
    match: /(^|\/)architecture\/svg\//,
    ignore: 'architecture/svg/',
    why: 'exported SVGs, regenerated from the site on demand and never read as text',
    rebuild: 'npm run svg',
  },
]);

/** Every file git is tracking, or null when git cannot answer. */
export function tracked(root = HERE) {
  try {
    return execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch { return null; }
}

/** The .gitignore lines, so the rule and the ignore file cannot disagree. */
export function ignores(root = HERE) {
  try { return fs.readFileSync(path.join(root, '.gitignore'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean); }
  catch { return []; }
}

/**
 * TWO RULES.
 *   1 tracked-derived — a file git tracks that this repo declares derived
 *   2 unignored-derived — a shape declared derived that .gitignore does not name, so the next export
 *     puts it straight back and the first rule fires on somebody else's commit
 */
export function inspect(files, ignoreLines) {
  const findings = [];
  for (const row of DERIVED) {
    const hits = files.filter((f) => row.match.test(f));
    if (hits.length) {
      findings.push({
        rule: 'tracked-derived',
        where: `${row.ignore} — ${hits.length} file(s)`,
        why: `${row.why}; every byte is reproduced by: ${row.rebuild}`,
        sample: hits.slice(0, 3),
      });
    }
    if (!ignoreLines.includes(row.ignore)) {
      findings.push({
        rule: 'unignored-derived',
        where: row.ignore,
        why: 'declared derived here and not named in .gitignore, so the next export tracks it again and the next reviewer reads it',
        sample: [],
      });
    }
  }
  return { state: findings.length ? 'findings' : 'clean', findings };
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
    const allIgnored = DERIVED.map((r) => r.ignore);
    const rules = (files, ig = allIgnored) => inspect(files, ig).findings.map((f) => f.rule);

    const clean = ['architecture/payments/workspace.dsl', 'architecture/payments/workspace.json', 'checks/model.mjs', 'README.md'];
    say('a tree tracking only sources is clean', rules(clean).length === 0, inspect(clean, allIgnored).findings);

    say('the exported site is caught', rules([...clean, 'architecture/payments/site/js/jquery-3.7.1.min.js']).includes('tracked-derived'), rules([...clean, 'architecture/payments/site/js/jquery-3.7.1.min.js']));
    say('the one-line base64 bundle is caught', rules([...clean, 'architecture/internet-banking/site/workspace.js']).includes('tracked-derived'), rules([...clean, 'architecture/internet-banking/site/workspace.js']));
    say('exported SVGs are caught', rules([...clean, 'architecture/svg/Containers.svg']).includes('tracked-derived'), rules([...clean, 'architecture/svg/Containers.svg']));

    /* THE MODEL MUST NOT BE CAUGHT. workspace.json is derived and stays tracked on purpose: the
       checks and the wrapper read it, and its diff is legible. A rule that swept it up would be
       refusing the thing this repo exists to version. */
    say('workspace.json is derived and is deliberately NOT caught', !rules(['architecture/payments/workspace.json']).includes('tracked-derived'), rules(['architecture/payments/workspace.json']));
    say('the DSL, the ADRs and the checks are never caught', rules(['architecture/payments/adrs/0001-x.md', 'checks/pubsub.mjs', 'architecture/theme.json']).length === 0, rules(['architecture/payments/adrs/0001-x.md']));

    /* THE IGNORE FILE AND THIS LIST MUST AGREE, or the fix undoes itself on the next export. */
    say('a derived shape missing from .gitignore is caught', inspect(clean, []).findings.some((f) => f.rule === 'unignored-derived'), inspect(clean, []).findings);
    say('and it is caught even when nothing is tracked yet', inspect([], []).findings.filter((f) => f.rule === 'unignored-derived').length === DERIVED.length, inspect([], []).findings.length);

    say('git being unavailable is UNEVALUABLE rather than an empty pass', tracked('/nonexistent-' + Date.now()) === null, tracked('/nonexistent-x'));

    console.log(`\n${ok} of 9 held`);
    process.exit(ok === 9 ? 0 : 1);
  }

  const files = tracked(root);
  if (files === null) { console.log('UNEVALUABLE — git could not list the tracked files here, and an unreadable index is not an empty one'); process.exit(3); }

  const r = inspect(files, ignores(root));
  console.log(`\n  derived · ${files.length} tracked file(s)`);
  for (const x of r.findings) {
    console.log(`    FAIL ${x.rule}\n         ${x.where}\n         ${x.why}`);
    for (const s of x.sample) console.log(`           e.g. ${s}`);
  }
  if (!r.findings.length) console.log('    nothing the exporter makes is under version control, so a one-line model change reads as one line');
  console.log(`\n  ${r.findings.length} finding(s)`);
  process.exit(r.findings.length ? 1 : 0);
}
