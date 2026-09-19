#!/usr/bin/env node
/* build — regenerate the palette, the two exports and the project index for EVERY model in this
 * repo, or for one named on the command line.
 *
 *   node tools/build.mjs [<project>] [--json]
 *
 * WHY IT EXISTS, and it is a defect the census names rather than a convenience.
 * NINETEEN modules under checks/ and tools/ discover their subjects: they walk architecture/ and
 * take every directory holding a workspace. Exactly one place in this repo named a single project —
 * package.json — and it is the only one a newcomer reads:
 *
 *     "write":  ... --write architecture/internet-banking/workspace.dsl
 *     "export": structurizr-cli export -w architecture/internet-banking/workspace.dsl ...
 *
 * So the README's own five-command flow, and its "Adding your own system" step 3, exported the BANK
 * whatever model you had just written. The checking half of this machine was N-project and the
 * generating half was one-project, and the two halves disagreed in the direction that is silent.
 *
 * WHAT THE SILENCE COSTS. checks/projects.mjs discovers by workspace.json, which the export writes.
 * A new project that was never exported therefore has no workspace.json, so it is not a project to
 * any check, does not appear in architecture/index.json, and is missing from the viewer's rail. It
 * is not REFUSED anywhere — there is nothing to refuse. Twenty checks stay green about a model none
 * of them has read. An absence that reads as a pass is the failure mode this whole repo exists to
 * argue against, and it sat in the one file that is read before any of them.
 *
 * THE LIST IS COMPUTED, NOT PASSED. Asking the caller which project to build is asking them for
 * something this module is better placed to know — the same red flag as a configuration parameter
 * that exists because nobody worked out the answer. A name narrows it; the default is all of them.
 *
 * IT NAMES A MISSING TOOL RATHER THAN THROWING, for the reason tools/browser.mjs carries at length.
 * structurizr-cli and Graphviz are separate installs, and without `dot` the static export
 * half-writes and then throws — which reads as this repo being broken.
 *
 * exit 0 written · 1 a project failed to export · 2 usage · 3 UNEVALUABLE, with the reason */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['written', 'FAILED', 'ABSENT', 'UNEVALUABLE']);

/**
 * Every model in the repo: a directory under architecture/ holding a workspace.dsl.
 * THE SOURCE IS THE DSL, NOT THE EXPORT, and that is the whole correction. checks/projects.mjs
 * discovers by workspace.json because it reads exports; a builder that did the same could only ever
 * rebuild what had already been built, so the new model — the one case this exists for — would be
 * invisible to it too.
 */
export function projects(root = HERE, { read = fs } = {}) {
  const dir = path.join(root, 'architecture');
  let entries;
  try { entries = read.readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, dir: path.join(dir, e.name), dsl: path.join(dir, e.name, 'workspace.dsl') }))
    .filter((p) => read.existsSync(p.dsl))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The toolchain, or the reason there is not one. Never throws — a caller asking "can I build?"
 * should not have to catch an answer.
 */
export function need({ run = (cmd) => execSync(cmd, { stdio: 'pipe' }) } = {}) {
  for (const [cmd, why] of [
    ['structurizr-cli version', 'structurizr-cli is not on PATH — it turns the DSL into the workspace and the site: brew install structurizr-cli'],
    ['dot -V', 'Graphviz is not on PATH — the static export lays out with it and half-writes without it: brew install graphviz'],
  ]) {
    try { run(cmd); } catch { return { why }; }
  }
  return { ok: true };
}

/* ── the planted faults ───────────────────────────────────────────────────────────────────────
   The subject is DISCOVERY and the dependency answer. The export itself is structurizr-cli's and
   asserting it here would make this a control over somebody else's software. */
if (process.argv.includes('--negative')) {
  let ok = 0, n = 0;
  const say = (name, pass, saw) => { n++; console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${pass ? '' : `\n       saw: ${JSON.stringify(saw)}`}`); if (pass) ok++; };

  const tree = (map) => ({
    readdirSync: (p) => (map[p] ?? []).map((name) => ({ name, isDirectory: () => !name.includes('.') })),
    existsSync: (p) => Object.keys(map).some((k) => (map[k] ?? []).includes(path.basename(p)) && path.dirname(p) === k) || map[path.dirname(p)]?.includes(path.basename(p)),
  });

  const arch = (root) => path.join(root, 'architecture');
  const full = tree({ [arch('/r')]: ['payments', 'bank'], [path.join(arch('/r'), 'payments')]: ['workspace.dsl'], [path.join(arch('/r'), 'bank')]: ['workspace.dsl'] });
  say('every model with a dsl is found, not just the one a script names', projects('/r', { read: full }).length === 2, projects('/r', { read: full }).map((p) => p.name));

  const half = tree({ [arch('/r')]: ['payments', 'notes'], [path.join(arch('/r'), 'payments')]: ['workspace.dsl'], [path.join(arch('/r'), 'notes')]: ['README.md'] });
  say('a directory with no workspace.dsl is not offered as a project', projects('/r', { read: half }).map((p) => p.name).join() === 'payments', projects('/r', { read: half }).map((p) => p.name));

  /* AN EMPTY REPO IS EMPTY, NOT BROKEN — but it must not look like a successful build of nothing,
     which is why main() turns this into ABSENT rather than exit 0. */
  const none = { readdirSync: () => { throw new Error('ENOENT'); }, existsSync: () => false };
  say('a repo with no architecture directory yields no projects rather than throwing', projects('/r', { read: none }).length === 0, projects('/r', { read: none }));

  say('a missing structurizr-cli is named, never thrown',
      /structurizr-cli is not on PATH/.test(need({ run: () => { throw new Error('not found'); } }).why ?? ''),
      need({ run: () => { throw new Error('not found'); } }));

  const onlyStructurizr = (cmd) => { if (cmd.startsWith('dot')) throw new Error('not found'); };
  say('a missing Graphviz is named separately, because it is a separate install',
      /Graphviz is not on PATH/.test(need({ run: onlyStructurizr }).why ?? ''), need({ run: onlyStructurizr }));

  say('every declared state is one this module can return', STATES.length === 4 && STATES.includes('ABSENT'), STATES);

  console.log(`\n${ok} of ${n} held`);
  process.exit(ok === n ? 0 : 1);
}

/* ── the build ───────────────────────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const json = argv.includes('--json');
const only = argv.find((a) => !a.startsWith('--'));

const gate = need();
if (gate.why) { console.log(`\n  build · UNEVALUABLE — ${gate.why}`); process.exit(3); }

let list = projects();
if (only) {
  list = list.filter((p) => p.name === only);
  if (!list.length) { console.error(`no model named ${only} — architecture/ holds: ${projects().map((p) => p.name).join(', ') || 'none'}`); process.exit(2); }
}
if (!list.length) { console.log('\n  build · ABSENT — architecture/ holds no workspace.dsl, so there is nothing to build'); process.exit(0); }

const rows = [];
for (const p of list) {
  const step = (label, fn) => { try { fn(); return null; } catch (e) { return `${label}: ${String(e.stderr ?? e.message ?? e).trim().split('\n')[0]}`; } };
  const failed =
    step('palette', () => execFileSync('node', [path.join(HERE, 'checks/diagram-contrast.mjs'), '--write', p.dsl], { stdio: 'pipe' })) ??
    step('json',    () => execFileSync('structurizr-cli', ['export', '-w', p.dsl, '-f', 'json',   '-o', p.dir], { stdio: 'pipe' })) ??
    step('site',    () => execFileSync('structurizr-cli', ['export', '-w', p.dsl, '-f', 'static', '-o', path.join(p.dir, 'site')], { stdio: 'pipe' }));
  rows.push({ project: p.name, state: failed ? 'FAILED' : 'written', why: failed ?? '' });
}

/* THE INDEX IS WRITTEN LAST AND ONCE. It is the file the viewer reads to know what exists, so it is
   derived from the exports rather than from this loop's intentions. */
let index = 'written';
try { execFileSync('node', [path.join(HERE, 'checks/diagram-contrast.mjs'), '--index'], { stdio: 'pipe' }); }
catch (e) { index = `FAILED: ${String(e.stderr ?? e.message).trim().split('\n')[0]}`; }

const bad = rows.filter((r) => r.state === 'FAILED');
if (json) console.log(JSON.stringify({ state: bad.length ? 'FAILED' : 'written', index, rows }, null, 2));
else {
  console.log(`\n  build · ${list.length} model(s) in architecture/`);
  for (const r of rows) console.log(`    ${r.state === 'written' ? 'ok  ' : 'FAIL'} ${r.project}${r.why ? `\n         ${r.why}` : '  ·  workspace.json and site/ rewritten'}`);
  console.log(`    ${index === 'written' ? 'ok  ' : 'FAIL'} architecture/index.json${index === 'written' ? '  ·  the list the viewer reads' : `\n         ${index}`}`);
  console.log(`\n  ${bad.length ? `FAILED — ${bad.length} of ${rows.length}` : `written — ${rows.length} of ${rows.length}`}`);
}
process.exit(bad.length || index !== 'written' ? 1 : 0);
