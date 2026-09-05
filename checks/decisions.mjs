/**
 * DECISIONS — the why beside the what, and the three ways it goes missing.
 *
 * THE BOOK'S ARGUMENT, ch12, and it is one sentence: the C4 views "show the outcome of the
 * decision-making process. The diagrams don't tell you why those decisions were made." The chapter's
 * recommendation is a collection of architecture decision records beside the diagrams.
 *
 * MEASURED 2026-09-04, against checkpoint 12's two preregistered ways of being dead.
 *
 *   "!adrs content is dropped by the static export"        — TRUE. This is the one that fired. The
 *     exported workspace.json carries every decision in full, workspace-scoped and element-scoped
 *     alike. The static site's own bundle carries NONE: documentation is an empty object, zero
 *     decisions at either scope. The reasoning is in the model and absent from the picture.
 *
 *   "a decision cannot be reached from its element"        — FALSE in the model, TRUE in the site.
 *     `!adrs <dir>` inside a container block nests the decision under that element, so the link
 *     exists and is the position in the tree rather than an elementId field. It is dropped with
 *     everything else on the way to the site.
 *
 * SO THE PANEL IS OURS, which the plan preregistered as the fallback, and architecture/viewer.html
 * reads the decisions out of workspace.json — the file that still has them. This check guards the
 * half a panel cannot: whether the decisions are worth reaching.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decisions as modelDecisions, elements, views } from './model.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'ABSENT', 'UNEVALUABLE']);

/* Nygard's own vocabulary, which the Structurizr importer reads out of the `## Status` heading. A
   status outside it is almost always a typo, and a typo here reads as a weaker or stronger claim
   than the author made. */
export const STATUSES = Object.freeze(['Proposed', 'Accepted', 'Rejected', 'Deprecated', 'Superseded']);

/** The three rules. */
export function inspect(ws) {
  const list = modelDecisions(ws);
  if (!list.length) return { state: 'ABSENT', decisions: [], findings: [] };

  const findings = [];
  const drawn = new Set();
  for (const v of views(ws)) for (const e of v.elements ?? []) drawn.add(String(e.id));
  const byId = new Map(elements(ws).map((e) => [e.id, e]));

  for (const d of list) {
    /* 1 — A STATUS IS A CLAIM, and an absent one reads as Accepted to every reader who skims. */
    if (!d.status || !STATUSES.includes(d.status)) {
      findings.push({
        rule: 'status-not-declared',
        where: `${d.elementName ?? 'workspace'} · ${d.id} ${d.title}`,
        why: d.status
          ? `status "${d.status}" is not one of ${STATUSES.join(', ')}; a status outside the vocabulary reads as a stronger or weaker claim than was made`
          : 'no status, and a decision with no status reads as Accepted to anyone skimming',
        cite: 'Nygard\'s ADR format, which the Structurizr importer reads from the "## Status" heading',
      });
    }

    /* 2 — A DECISION ABOUT AN ELEMENT NOBODY DRAWS cannot be reached from any picture, which is the
       entire point of putting it beside the diagrams rather than in a wiki. */
    if (d.elementId && !drawn.has(d.elementId)) {
      findings.push({
        rule: 'governs-an-undrawn-element',
        where: `${d.elementName} · ${d.id} ${d.title}`,
        why: `${d.elementName} appears in no view, so this decision is reachable only by reading the DSL — the picture cannot offer it`,
        cite: 'ch12 — the decisions exist because "the diagrams don\'t tell you why those decisions were made"',
      });
    }

    /* 3 — A SUPERSEDED DECISION MUST SAY BY WHAT. Nygard's form ends a decision by pointing at its
       replacement; one that just stops leaves a reader holding a rule nobody has withdrawn. */
    if (d.status === 'Superseded' && !/supersede|replaced by|see (adr|decision) ?\d/i.test(d.content)) {
      findings.push({
        rule: 'superseded-by-nothing',
        where: `${d.elementName ?? 'workspace'} · ${d.id} ${d.title}`,
        why: 'this is marked Superseded and its text names no successor, so a reader learns the rule is dead and not what replaced it',
        cite: 'Nygard\'s ADR format — a superseded record points at the record that replaced it',
      });
    }
  }

  const rows = list.map((d) => ({
    id: d.id,
    scope: d.elementName ?? '(workspace)',
    status: d.status ?? 'none',
    title: d.title,
    reachable: d.elementId ? drawn.has(d.elementId) : true,
    kind: d.elementId ? byId.get(d.elementId)?.kind ?? 'unknown' : 'workspace',
  }));

  return { state: findings.length ? 'findings' : 'clean', decisions: rows, findings };
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
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 280)}`}`); if (pass) ok++; };
    const rules = (ws) => inspect(ws).findings.map((f) => f.rule);

    const base = (decision, { drawContainer = true } = {}) => ({
      documentation: { decisions: [{ id: '1', title: 'Workspace rule', status: 'Accepted', content: 'why' }] },
      model: { softwareSystems: [{ id: 's1', name: 'P', containers: [{ id: 'c1', name: 'Checkout', documentation: { decisions: [decision] } }] }] },
      views: { containerViews: [{ key: 'Containers', elements: drawContainer ? [{ id: 'c1' }] : [] }] },
    });

    const good = base({ id: '1', title: 'Validate first', status: 'Accepted', content: 'because' });
    say('a decision with a known status on a drawn element is clean', rules(good).length === 0, inspect(good).findings);

    say('a workspace with no decisions at all is ABSENT, which is an answer and not a pass', inspect({ model: {}, views: {} }).state === 'ABSENT', inspect({ model: {}, views: {} }));

    const noStatus = base({ id: '1', title: 'Validate first', content: 'because' });
    say('a decision with no status is caught, because a reader reads it as Accepted', rules(noStatus).includes('status-not-declared'), rules(noStatus));

    const typo = base({ id: '1', title: 'Validate first', status: 'Aceppted', content: 'because' });
    say('a status outside the vocabulary is caught rather than passed through', rules(typo).includes('status-not-declared'), inspect(typo).findings[0]?.why);

    /* THE ONE THAT MATTERS: a decision hanging off an element no view draws. */
    const undrawn = base({ id: '1', title: 'Validate first', status: 'Accepted', content: 'because' }, { drawContainer: false });
    say('a decision governing an element no view draws is caught', rules(undrawn).includes('governs-an-undrawn-element'), rules(undrawn));

    /* A WORKSPACE-SCOPED DECISION MUST NOT FIRE THAT RULE — it governs no element by design. */
    const wsOnly = { documentation: { decisions: [{ id: '1', title: 'Palette', status: 'Accepted', content: 'why' }] }, model: {}, views: {} };
    say('a workspace-scoped decision is never called unreachable', !rules(wsOnly).includes('governs-an-undrawn-element'), rules(wsOnly));

    const dangling = base({ id: '1', title: 'Old rule', status: 'Superseded', content: 'we no longer do this' });
    say('a superseded decision naming no successor is caught', rules(dangling).includes('superseded-by-nothing'), rules(dangling));

    const replaced = base({ id: '1', title: 'Old rule', status: 'Superseded', content: 'Superseded by decision 4.' });
    say('a superseded decision that names its successor is accepted', !rules(replaced).includes('superseded-by-nothing'), rules(replaced));

    console.log(`\n${ok} of 8 held`);
    process.exit(ok === 8 ? 0 : 1);
  }

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
    const r = inspect(ws);
    console.log(`\n  decisions · ${path.relative(process.cwd(), f)}`);
    if (r.state === 'ABSENT') { console.log('    ABSENT — this workspace records no decisions, so the diagrams say what and nothing says why'); continue; }
    for (const d of r.decisions) console.log(`    ${String(d.status).padEnd(11)} ${d.scope.padEnd(18)} ${d.id}. ${d.title}`);
    for (const x of r.findings) { bad++; console.log(`    FAIL ${x.rule}\n         ${x.where}\n         ${x.why}\n         ${x.cite}`); }
  }
  console.log(`\n  ${bad} finding(s)`);
  console.log('  the static export drops every decision — measured 2026-09-04 — so the wrapper reads them from workspace.json instead');
  process.exit(bad ? 1 : 0);
}
