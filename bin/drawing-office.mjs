#!/usr/bin/env node
/**
 * DRAWING OFFICE — the command that puts the machine into a repo, and the one that tells you when
 * the copy has gone stale.
 *
 * WHY IT EXISTS: the machine was distributed by `cp`. Measured across three repos — five modules,
 * the viewer and the theme were identical, and `trace-animate.mjs` was simply MISSING from one of
 * them, because a hand copy is a step someone has to remember. Earlier the same day a stale viewer
 * was propagated and debugged for several minutes before the copy, not the code, turned out to be
 * the fault. A copy with no version and no provenance is not a distribution.
 *
 * WHAT IT DOES NOT DO, deliberately. It does not vendor the modules into your repo: they stay where
 * they are installed and are run from there, so there is one place to fix a bug. Only the two files
 * a repo genuinely owns are written into it — the palette, which you are meant to edit, and the
 * viewer, which has to be served from your own origin to read your own workspace.
 *
 *   init   write theme.json and viewer.html into <root>/architecture, refusing to clobber edits
 *   check  compare what is in the repo against what this package ships, and name every difference
 *
 * `check` is the half that earns its keep: it turns "did someone remember to copy it" into a
 * question with an answer.
 *
 * exit 0 in step, or written · 1 drift found · 2 usage · 3 UNEVALUABLE, with the reason
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* The files a repo owns a copy of. Everything else is run from the package and never duplicated. */
export const SEEDED = Object.freeze(['architecture/theme.json', 'architecture/viewer.html']);

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
const version = () => { try { return JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).version; } catch { return '0.0.0'; } };

/** What the repo has, against what the package ships. */
export function compare(root) {
  const rows = [];
  for (const rel of SEEDED) {
    const mine = path.join(PKG, rel), theirs = path.join(root, rel);
    if (!fs.existsSync(mine)) { rows.push({ rel, state: 'UNEVALUABLE', why: 'the package is missing this file' }); continue; }
    if (!fs.existsSync(theirs)) { rows.push({ rel, state: 'MISSING', why: 'not in this repo — run init' }); continue; }
    const a = sha(mine), b = sha(theirs);
    rows.push({ rel, state: a === b ? 'same' : 'DIFFERENT', mine: a, theirs: b,
                why: a === b ? '' : 'the repo copy differs from the package — yours may be edited on purpose, or stale' });
  }
  return rows;
}

/**
 * Write the seed files. An existing file is NEVER overwritten without --force: theme.json is the one
 * file a repo is expected to edit, and silently replacing someone's palette would be the worst
 * possible behaviour for a command whose whole point is that copies drift.
 */
export function init(root, { force = false } = {}) {
  const rows = [];
  for (const rel of SEEDED) {
    const from = path.join(PKG, rel), to = path.join(root, rel);
    if (!fs.existsSync(from)) { rows.push({ rel, state: 'UNEVALUABLE', why: 'the package is missing this file' }); continue; }
    if (fs.existsSync(to) && !force) {
      const same = sha(from) === sha(to);
      rows.push({ rel, state: same ? 'same' : 'kept', why: same ? 'already in step' : 'kept your version — pass --force to take the package copy' });
      continue;
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    rows.push({ rel, state: 'written', why: `from drawing-office ${version()}` });
  }
  return rows;
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const verb = argv[0];
  const i = argv.indexOf('--root');
  const root = path.resolve(i >= 0 && argv[i + 1] ? argv[i + 1] : process.cwd());

  if (verb !== 'init' && verb !== 'check') {
    console.error('usage: drawing-office <init|check> [--root <dir>] [--force]');
    console.error('  init   write architecture/theme.json and architecture/viewer.html into <root>');
    console.error('  check  report where <root> differs from what this package ships');
    process.exit(2);
  }

  const rows = verb === 'init' ? init(root, { force: argv.includes('--force') }) : compare(root);
  console.log(`\n  drawing-office ${verb} ${version()} · ${path.relative(process.cwd(), root) || '.'}`);
  for (const r of rows) console.log(`    ${String(r.state).padEnd(11)} ${r.rel.padEnd(28)} ${r.why}`);

  const bad = rows.filter((r) => r.state === 'DIFFERENT' || r.state === 'MISSING');
  const unev = rows.filter((r) => r.state === 'UNEVALUABLE');
  if (unev.length) { console.log(`\n  ${unev.length} file(s) UNEVALUABLE — the package itself is incomplete`); process.exit(3); }
  if (verb === 'check' && bad.length) { console.log(`\n  ${bad.length} of ${rows.length} out of step`); process.exit(1); }
  console.log(`\n  ${rows.length} file(s) in step`);
  process.exit(0);
}
