/**
 * PROJECTS — where the exported models are, asked once.
 *
 * WHAT WAS WRONG. Eleven modules under checks/ and tools/ each carried their own copy of "list the
 * directories under architecture/ and keep the ones holding a workspace.json", and seven carried
 * their own copy of "read architecture/theme.json or exit 3". The copies had already drifted into
 * three shapes — one returns paths, one returns directory NAMES, one iterates inline and never
 * builds a list — and three different variable names for the same thing. That is not untidiness:
 * it is eleven places to edit when the layout changes, and eleven chances to miss one.
 *
 * WHY IT IS NOT IN checks/model.mjs. That module reads a WORKSPACE — given the parsed export, what
 * does the model say. This one reads a FILESYSTEM — which exports exist and where. Different layer,
 * different abstraction; folding the second into the first would put `fs.readdirSync` inside the one
 * module whose whole value is that it is the single interpreter of the export's shape.
 *
 * THE STATES ARE THE ANSWER, NOT AN ERROR. `ABSENT` is a repo with an architecture/ directory and no
 * export yet, which is a project's first day and not a fault; `UNEVALUABLE` is a directory that
 * could not be read at all. A caller that cannot tell those apart will report the first as the
 * second, which is how "you have not exported yet" turns into "something is broken".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['found', 'ABSENT', 'UNEVALUABLE']);

/** The one name of the one file every check reads. */
export const EXPORT = 'workspace.json';
export const THEME = 'theme.json';

/**
 * Every exported model under `<root>/architecture`, as { dir, name, file }.
 *
 * THREE FIELDS BECAUSE THE ELEVEN COPIES WANTED THREE DIFFERENT THINGS — the path to the export, the
 * directory holding it (for the sibling site/, adrs/, stage.json) and the bare project name (for a
 * URL). Returning one shape that carries all three is what lets every caller use the same door
 * instead of three that agree until they do not.
 */
export function projects(root = HERE, { read = fs } = {}) {
  const dir = path.join(root, 'architecture');
  if (!read.existsSync(dir)) return { state: 'ABSENT', why: `${path.join('architecture')} is not there, so this tree holds no models`, dir, list: [] };
  let entries;
  try { entries = read.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return { state: 'UNEVALUABLE', why: `architecture/ could not be read (${e.message})`, dir, list: [] }; }
  const list = entries.filter((d) => d.isDirectory())
    .map((d) => ({ dir: path.join(dir, d.name), name: d.name, file: path.join(dir, d.name, EXPORT) }))
    .filter((p) => read.existsSync(p.file));
  if (!list.length) return { state: 'ABSENT', why: `no ${EXPORT} under architecture/; export the DSL first`, dir, list: [] };
  return { state: 'found', dir, list };
}

/**
 * The palette, or the reason there is none.
 *
 * IT RETURNS THE REASON RATHER THAN EXITING, which is the difference from the seven copies it
 * replaces: every one of them called process.exit(3) from inside the read, so the function could
 * not be used by anything that wanted to CONTINUE — a check with two workspaces, or a test. The
 * caller decides what a missing palette costs it.
 */
export function theme(root = HERE, { read = fs } = {}) {
  const file = path.join(root, 'architecture', THEME);
  if (!read.existsSync(file)) return { state: 'ABSENT', why: `architecture/${THEME} is not there`, file, theme: null };
  try { return { state: 'found', file, theme: JSON.parse(read.readFileSync(file, 'utf8')) }; }
  catch (e) { return { state: 'UNEVALUABLE', why: `architecture/${THEME} could not be read (${e.message})`, file, theme: null }; }
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
    const say = (n, pass, saw) => { total++; console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 260)}`}`); if (pass) ok++; };

    /* A FAKE TREE, laid out exactly as a repo is: architecture/<project>/workspace.json. */
    const tree = (map, { throwOnRead = false } = {}) => ({
      existsSync: (p) => Object.prototype.hasOwnProperty.call(map, p) || Object.keys(map).some((k) => k.startsWith(p + path.sep)),
      readdirSync: (p) => {
        if (throwOnRead) throw new Error('EACCES');
        const names = new Set();
        for (const k of Object.keys(map)) if (k.startsWith(p + path.sep)) names.add(k.slice(p.length + 1).split(path.sep)[0]);
        return [...names].map((name) => ({ name, isDirectory: () => !name.includes('.') }));
      },
      readFileSync: (p) => { if (map[p] === undefined) throw new Error('ENOENT'); return map[p]; },
    });
    const A = (r) => path.join(r, 'architecture');
    const full = tree({
      [path.join(A('/r'), 'bank', EXPORT)]: '{}',
      [path.join(A('/r'), 'payments', EXPORT)]: '{}',
      [path.join(A('/r'), THEME)]: '{"canvas":"#111"}',
    });

    const p = projects('/r', { read: full });
    say('every directory holding an export is found, and none that does not',
      p.state === 'found' && p.list.map((x) => x.name).sort().join(',') === 'bank,payments', p);
    say('each one carries the path, the directory and the bare name, so no caller needs a fourth shape',
      p.list.every((x) => x.file && x.dir && x.name), p.list[0]);

    /* ── ABSENT AND UNEVALUABLE ARE DIFFERENT ANSWERS, and conflating them is the whole point ── */
    const empty = tree({ [path.join(A('/r'), THEME)]: '{}' });
    say('a tree with architecture/ and no export is ABSENT — a project\'s first day, not a fault',
      projects('/r', { read: empty }).state === 'ABSENT', projects('/r', { read: empty }));
    say('and it says so in words, so a caller printing `why` does not have to invent the reason',
      /export the DSL first/.test(projects('/r', { read: empty }).why ?? ''), projects('/r', { read: empty }).why);
    say('no architecture/ at all is also ABSENT, and names the directory it looked in',
      projects('/r', { read: tree({}) }).state === 'ABSENT', projects('/r', { read: tree({}) }));
    say('a directory that cannot be READ is UNEVALUABLE, never an empty list',
      projects('/r', { read: tree({ [path.join(A('/r'), 'bank', EXPORT)]: '{}' }, { throwOnRead: true }) }).state === 'UNEVALUABLE',
      projects('/r', { read: tree({ [path.join(A('/r'), 'bank', EXPORT)]: '{}' }, { throwOnRead: true }) }));

    /* A DIRECTORY WITHOUT AN EXPORT IS NOT A PROJECT — site/, svg/ and adrs/ all live here. */
    const noisy = tree({
      [path.join(A('/r'), 'bank', EXPORT)]: '{}',
      [path.join(A('/r'), 'svg', 'Containers.svg')]: '<svg/>',
    });
    say('a sibling directory holding no export is skipped, because svg/ and site/ live there too',
      projects('/r', { read: noisy }).list.map((x) => x.name).join(',') === 'bank', projects('/r', { read: noisy }).list);

    /* ── THE PALETTE ─────────────────────────────────────────────────────────────────────────── */
    say('the theme is parsed and returned with the file it came from',
      theme('/r', { read: full }).state === 'found' && theme('/r', { read: full }).theme.canvas === '#111', theme('/r', { read: full }));
    say('a theme that is not there is ABSENT, and the caller decides what that costs',
      theme('/r', { read: tree({}) }).state === 'ABSENT', theme('/r', { read: tree({}) }));
    const broken = tree({ [path.join(A('/r'), THEME)]: '{oh dear' });
    say('a theme that does not parse is UNEVALUABLE with the parser\'s own message',
      theme('/r', { read: broken }).state === 'UNEVALUABLE' && /JSON|Unexpected|token/i.test(theme('/r', { read: broken }).why),
      theme('/r', { read: broken }));
    say('and neither one exits the process, which is what let the seven copies be unusable twice over',
      theme('/r', { read: broken }).theme === null, theme('/r', { read: broken }));

    const PINNED = 11;
    console.log(`\n${ok} of ${total} held` + (total === PINNED ? '' : `  · MISCOUNT: ${PINNED} pinned`));
    process.exit(ok === total && total === PINNED ? 0 : 1);
  }

  const p = projects(root);
  const t = theme(root);
  console.log(`\n  projects · ${path.relative(process.cwd(), p.dir)} · ${p.state}${p.why ? ` — ${p.why}` : ''}`);
  for (const x of p.list) console.log(`    ${x.name.padEnd(20)} ${path.relative(process.cwd(), x.file)}`);
  console.log(`  theme · ${t.state}${t.why ? ` — ${t.why}` : ''}`);
  process.exit(p.state === 'UNEVALUABLE' || t.state === 'UNEVALUABLE' ? 3 : 0);
}
