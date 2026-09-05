/**
 * CONTROL for architecture/viewer.html — the wrapper every repo copies.
 *
 * WHY IT EXISTS, and it is two defects rather than a policy. Both were found by opening a SECOND
 * project in a wrapper that had only ever been opened on the first, and both are the same shape: a
 * fact about one workspace, written into a file that serves all of them.
 *
 *   1. THE OPENING VIEW WAS A LITERAL. The expression read `(location.hash || '') || <a view key>` —
 *      and the key was the bank's. The payments workspace calls its context view something else, so
 *      the iframe was sent to a view that does not exist, the renderer logged "A view must be
 *      specified", and the canvas came up blank beside a rail that had loaded perfectly. Any repo
 *      whose first view is spelled differently would have opened on nothing, and the file's own
 *      comment three paragraphs above that line claimed "nothing about any one system is written
 *      here now".
 *
 *   2. THE ROW LABEL HAD TWO WRITERS. A row with children was built in one branch and a leaf in the
 *      other, each creating its own name and kind spans. The queue chip was added to the first, so it
 *      appeared on the trace row and on nothing else — every container is a leaf. The rail went on
 *      calling a queue "Container · Amazon SQS", truncated in a 272px rail to "Con...".
 *
 * THE FIRST RULE IS NARROWER THAN IT WAS, AND THE FIRST DRAFT IS WHY. It began as "no string literal
 * anywhere in this file may equal any view key of any exported workspace", which fired on the rail's
 * row label 'Containers' — a display string that happens to collide with a view key in one project.
 * True by the rule as written and wrong as a rule: a label is not a reference. What is checked now is
 * the ONE expression that decides which view opens, which is where the defect lived and where a
 * literal is never right. It needs no exported workspace to say so, and it catches a key belonging to
 * a repo that is not even checked out.
 *
 * WHY GREP RATHER THAN A BROWSER. Both defects are visible in the source: one is a literal that must
 * not be there, the other is a duplicated writer. Driving a headless browser would find them too, at
 * the cost of a dependency this control does not otherwise need — and would find the first only for
 * the projects that happen to be checked out, which is the blind spot that let it ship.
 *
 * exit 0 all held · 1 something did not · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['held', 'FAILED', 'UNEVALUABLE']);

/* Comments are where a defect gets EXPLAINED, so they must not be where it gets detected. This file's
   own account of defect 1 sits a few lines up and must not trip it. */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
}

/**
 * The statement that decides which view opens: from `location.hash` to the end of its statement.
 * Returns null when the wrapper does not read the hash at all, which is a different answer from a
 * clean one and is reported as such.
 */
export function openingViewStatement(src) {
  const clean = stripComments(src);
  const at = clean.indexOf('location.hash');
  if (at < 0) return null;
  const start = clean.lastIndexOf('\n', at) + 1;
  const end = clean.indexOf(';', at);
  return end < 0 ? clean.slice(start) : clean.slice(start, end + 1);
}

/** Non-empty quoted strings in a fragment. An empty '' is how the hash is defaulted and is fine. */
export function nonEmptyLiterals(fragment) {
  const out = [];
  for (const m of String(fragment).matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"/g)) {
    const s = m[1] ?? m[2];
    if (s !== '') out.push(s);
  }
  return out;
}

/** The two rules, over one source string. */
export function inspect(src) {
  const clean = stripComments(src);
  const stmt = openingViewStatement(src);
  /* ONE HOME FOR A ROW LABEL. Counted by the class it applies, because that is the thing that must
     exist exactly once however the surrounding code is arranged. */
  const rowtext = (clean.match(/'rowtext'/g) ?? []).length;
  /* ONE CALLER FOR THE MODE NOTICE. Same rule, second instance, and the second instance is why the
     rule generalises: a wrapper that can put the diagram into a mode — a layer on, a walk running —
     must announce it, and an announcement written at each branch stops covering the branch someone
     adds next year. Counted as calls, so the definition does not inflate it. */
  /* A WRAPPER MUST NOT WITHHOLD WHAT THE EXPORT HAS. The renderer advertises full screen on its own
     welcome panel, and an iframe refuses it unless the embedder says otherwise — so a reader presses
     the key they were told about, nothing happens, and the tool looks broken when the wrapper is.
     Checked as a property of the tag rather than of the file, because a second iframe added later
     would need it too. */
  const frames = clean.match(/<iframe\b[^>]*>/g) ?? [];
  const framesWithoutFullscreen = frames.filter((f) => !/allowfullscreen|allow\s*=\s*["'][^"']*fullscreen/.test(f)).length;
  /* PROGRESSIVE DISCLOSURE HAS ONE WRITER, and the defect it replaces is why this is counted.
     A branch unfolds for two different reasons — the reader CLICKED it, or it is on the path to the
     view on screen — and the first draft wrote both into the same Set. That turned "you are looking
     at this" into "you asked for this, forever": every branch that had ever held the current view
     stayed open, and the payments rail came up with the trace, three decisions and seven containers
     listed at once, which is a list rather than a rail. The remembered state now has exactly one
     writer, in the click handler; the path is recomputed on every draw and never stored. */
  const opens = (clean.match(/\bopen\.add\s*\(/g) ?? []).length;
  const mentions = (clean.match(/\bsayLayer\s*\(/g) ?? []).length;
  const defined = /function\s+sayLayer\s*\(/.test(clean);
  const sayLayerCalls = mentions - (defined ? 1 : 0);
  return { statement: stmt, literals: stmt === null ? [] : nonEmptyLiterals(stmt), rowtext, sayLayerCalls, frames: frames.length, framesWithoutFullscreen, opens };
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  let bad = 0;
  const ok = (n, c, saw) => { console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${c || saw === undefined ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 240)}`}`); if (!c) bad++; };

  if (process.argv.includes('--negative')) {
    /* THE PLANTED FAULTS ARE THE TWO REAL ONES, restored rather than described — a rule that cannot
       be shown failing on the code it was written for is a rule nobody can trust on the next one. */
    let held = 0;
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 240)}`}`); if (pass) held++; };

    const clean = `<script>const ASKED = (location.hash || '').replace(/^#/, '') || null;
      const label = (n) => { const t = document.createElement('span'); t.className = 'rowtext'; return t; };
      const groupRow = { name: 'Containers' };</script>`;

    const r0 = inspect(clean);
    say('a wrapper with no literal fallback and one row labeller is clean', r0.literals.length === 0 && r0.rowtext === 1, r0);

    const bank = clean.replace('|| null;', `|| 'SystemContext';`);
    say('the opening view falling back to one repo\'s key is caught', inspect(bank).literals.includes('SystemContext'), inspect(bank).literals);

    const other = clean.replace('|| null;', `|| 'Context';`);
    say('the same defect wearing a different repo\'s key is caught, with no workspace consulted', inspect(other).literals.length === 1, inspect(other).literals);

    /* THE FIRST DRAFT FAILED HERE. 'Containers' is a row label in the rail and also a view key in one
       project; flagging it taught the reader that a working file was broken. */
    say('a display label that happens to match a view key elsewhere is not a finding', inspect(clean).literals.length === 0, inspect(clean).literals);

    const twice = clean + `<script>const t2 = document.createElement('span'); t2.className = 'rowtext';</script>`;
    say('a second row-label writer is caught', inspect(twice).rowtext === 2, inspect(twice));

    /* THE MODE NOTICE, SECOND INSTANCE OF THE ONE-HOME RULE. */
    const mode = `<script>function sayLayer(k){} function sayOrder(k){ fillOrder(k); sayLayer(k); }
      const label = (n) => { const t = document.createElement('span'); t.className = 'rowtext'; return t; };
      const ASKED = (location.hash || '').replace(/^#/, '') || null;</script>`;
    say('a mode notice called once is clean', inspect(mode).sayLayerCalls === 1, inspect(mode));

    const modeTwice = mode.replace('sayLayer(k); }', 'sayLayer(k); if (x) sayLayer(k); }');
    say('a mode notice called from two branches is caught', inspect(modeTwice).sayLayerCalls === 2, inspect(modeTwice));

    const modeNever = mode.replace('fillOrder(k); sayLayer(k);', 'fillOrder(k);');
    say('a mode notice that is never called is caught', inspect(modeNever).sayLayerCalls === 0, inspect(modeNever));

    /* ONE WRITER FOR THE REMEMBERED FOLD STATE. */
    const fold = `<script>const ASKED=(location.hash||'').replace(/^#/,'')||null;
      const t=document.createElement('span'); t.className='rowtext';
      const unfolded = node.children.length > 0 && (open.has(id) || holdsHere(node));
      b.addEventListener('click', () => { if (node.children.length) { if (open.has(id)) open.delete(id); else open.add(id); } });</script>`;
    say('a rail that remembers only what was clicked is clean', inspect(fold).opens === 1, inspect(fold).opens);
    const sticky = fold.replace('(open.has(id) || holdsHere(node));', '(open.has(id) || holdsHere(node));\n      if (unfolded) open.add(id);');
    say('an auto-unfold written into the remembered state is caught', inspect(sticky).opens === 2, inspect(sticky).opens);

    /* THE WRAPPER MUST NOT WITHHOLD FULL SCREEN. */
    const bare = `<script>const ASKED=(location.hash||'').replace(/^#/,'')||null; const t=document.createElement('span'); t.className='rowtext';</script><iframe title="x"></iframe>`;
    say('an iframe with no fullscreen permission is caught', inspect(bare).framesWithoutFullscreen === 1, inspect(bare));
    say('the attribute spelling is accepted', inspect(bare.replace('title="x"', 'title="x" allowfullscreen')).framesWithoutFullscreen === 0, inspect(bare.replace('title="x"', 'title="x" allowfullscreen')));
    say('the allow= policy spelling is accepted too', inspect(bare.replace('title="x"', 'title="x" allow="fullscreen"')).framesWithoutFullscreen === 0, inspect(bare.replace('title="x"', 'title="x" allow="fullscreen"')));
    say('a page with no iframe at all reports none rather than a finding', inspect(bare.replace(/<iframe[^>]*><\/iframe>|<iframe[^>]*>/, '')).frames === 0, inspect(bare.replace(/<iframe[^>]*>/, '')));

    const explained = clean.replace('<script>', `<script>/* it used to read || 'SystemContext', which was the bank's key */`);
    say('the forbidden literal quoted inside a comment is not a finding', inspect(explained).literals.length === 0, inspect(explained).literals);

    const silent = `<script>const ASKED = null;</script>`;
    say('a wrapper that never reads the hash is UNEVALUABLE, not clean', inspect(silent).statement === null, inspect(silent));

    console.log(`\n${held} of 16 held`);
    process.exit(held === 16 ? 0 : 1);
  }

  const file = path.join(ROOT, 'architecture', 'viewer.html');
  if (!fs.existsSync(file)) { console.log('UNEVALUABLE — architecture/viewer.html is not on disk'); process.exit(3); }

  const r = inspect(fs.readFileSync(file, 'utf8'));
  if (r.statement === null) {
    console.log('UNEVALUABLE — this wrapper never reads location.hash, so there is no opening-view expression to judge');
    process.exit(3);
  }

  console.log('\n  viewer · architecture/viewer.html');
  ok('the opening view is taken from the model, never from a literal, so it opens on any repo',
    r.literals.length === 0, r.literals);
  ok('a row label is written in exactly one place, so a chip cannot reach only half the rows',
    r.rowtext === 1, `${r.rowtext} writer(s) of class rowtext`);
  ok('the mode notice is called from exactly one place, so a new branch cannot stop announcing it',
    r.sayLayerCalls === 1, `${r.sayLayerCalls} call site(s) of sayLayer`);
  ok('every iframe passes full screen through, so a key the renderer advertises is not withheld here',
    r.framesWithoutFullscreen === 0, `${r.framesWithoutFullscreen} of ${r.frames} iframe(s) withhold it`);
  ok('the fold state is written in exactly one place, so being somewhere cannot be mistaken for asking for it',
    r.opens === 1, `${r.opens} writer(s) of open.add`);

  console.log(`\n${bad ? `${bad} FAIL` : 'all ok'}`);
  process.exit(bad ? 1 : 0);
}
