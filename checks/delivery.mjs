/**
 * DELIVERY STATE — which boxes are the thing we are proposing, and why anyone should believe it.
 *
 * WHAT IT IS FOR. A diagram of a system you are extending shows two different kinds of box and draws
 * them identically: the parts that already ship, and the parts you are asking for. A reader cannot
 * tell them apart, so a proposal reads as a description of something that exists — which is the most
 * expensive misreading an architecture diagram can produce.
 *
 * THREE STATES, taken from a real model rather than invented. In dshEgressObsSlack the three are
 * genuinely different things and cost different amounts to land:
 *
 *   ships as-is   dsh-session-telemetry-otel — an existing plugin, used unmodified
 *   Modified      the injection scorer — a NEW RULE in an existing redact/score waterfall that
 *                 ships empty, so the seat exists and is vacant
 *   Proposal      the exfiltration-chain invariant and the payload-compose guard — new companions
 *                 and registrations, for which the harness offers a plugin point and nothing else
 *
 * Two states would merge the middle one into the last, and the middle one is the cheap half.
 *
 * IT IS THE STROKE, NOT THE FILL, and that is a ruling rather than a preference. ADR 0002 spends hue
 * on ownership — violet is ours, green is not — and chapter 10's rule is that a colour must encode a
 * dimension the reader cannot already read off the page. A second meaning in the same channel makes
 * both unreadable. So delivery state took the stroke: one amber hue so it reads as one dimension,
 * with lightness and width carrying the degree, which survives colour vision deficiency and a
 * black-and-white printer the same way the ownership ramp does.
 *
 * THE RULE THAT MATTERS IS NOT THE COLOUR. A box marked Proposal with nothing saying what it adds or
 * why is a claim with no argument, and the diagram is exactly where a reader will go looking. So a
 * proposed element must be governed by a decision — which is chapter 12's own mechanism, already
 * modelled and already checked by checks/decisions.mjs.
 *
 * exit 0 clean · 1 findings · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { elements, decisions, views } from './model.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'ABSENT', 'UNEVALUABLE']);

/* THE VOCABULARY IS THE THEME'S, not this file's. A repo that wants different words edits its
   palette and both the styling and this check follow, which is the same one-home rule the channel
   tags and the perspective names already obey. */
export const DEFAULT_STATES = Object.freeze(['Modified', 'Proposal']);

/**
 * THE STATES COME FROM THE MACHINE, and the fallback is REPORTED rather than silent.
 *
 * theme.json declares `delivery` — a machine adapted from design-loop's core/machines.json, where
 * every state names what makes it OBSERVABLE: the fact on disk that proves a component is in it. A
 * tag nobody can check is an assertion; a state with an observable is a measurement. Two of its four
 * guards say NOT BUILT, which is the honest shape — a machine whose later states cannot be observed
 * would sit in its third state forever and read as progress.
 *
 * `tagFor` maps a state to the tag the DSL actually writes, because Proposal and proposed are one
 * concept and two spellings is the inconsistency this repo keeps paying for.
 *
 * MEASURED WHILE BUILDING THIS: deleting `deliveryStates` and adding the machine left `statesOf`
 * reading a field that no longer existed and falling through to DEFAULT_STATES. It kept working and
 * said nothing — a silent divergence between what the palette declares and what the checker reads,
 * which is exactly the two-homes fault the machine was added to end. The fallback now announces
 * itself in the returned `basis`.
 */
export function statesOf(theme) {
  const tagFor = theme?.delivery?.tagFor;
  if (tagFor && Object.keys(tagFor).length) return Object.values(tagFor);
  if (Array.isArray(theme?.deliveryStates)) return theme.deliveryStates;
  return DEFAULT_STATES;
}

export function basisOf(theme) {
  if (theme?.delivery?.tagFor) return 'delivery machine';
  if (Array.isArray(theme?.deliveryStates)) return 'deliveryStates list (no machine declared)';
  return 'DEFAULT_STATES — the theme declares neither a machine nor a list';
}

/** The delivery state an element declares, or null for one that ships as-is. */
export function stateOf(el, states) {
  const hits = el.tags.filter((t) => states.includes(t));
  return { state: hits[0] ?? null, all: hits };
}

/* THE WORD ON THE BOX. A stroke colour is a signal only to a reader who has been told what it means,
   and the operator's verdict on stroke alone was that it does not work. So a marked element also
   carries the state in words, in its DESCRIPTION, which is the one field Structurizr renders inside
   the box body — the technology line is grey and small, and the name belongs to the element.

   THE WORDS ARE THE THEME'S. deliveryLabels maps a state tag to the phrase, so a repo that wants
   different wording edits its palette rather than every model, and this check reads the same map the
   stamper writes from. */
export const labelFor = (theme, state) => (theme?.deliveryLabels ?? {})[state] ?? null;

/**
 * FIVE RULES.
 *   1 unstated-proposal   — marked as ours and no decision says what it adds
 *   2 two-states          — marked Modified AND Proposal, which are different claims
 *   3 state-not-styled    — a state the theme does not style, so the box does not pop
 *   4 proposal-undrawn    — marked, and in no view, so nobody meets the proposal
 *   5 label-missing       — marked, and the box does not say so in words
 */
export function inspect(ws, theme) {
  const states = statesOf(theme);
  const styled = new Set((theme?.elements ?? []).map((r) => r.tag));
  const els = elements(ws);
  const marked = els.map((e) => ({ el: e, ...stateOf(e, states) })).filter((x) => x.state);
  if (!marked.length) return { state: 'ABSENT', states, marked: [], findings: [] };

  const governed = new Set(decisions(ws).map((d) => d.elementId).filter(Boolean));
  const drawn = new Set();
  for (const v of views(ws)) for (const e of v.elements ?? []) drawn.add(String(e.id));

  const findings = [];

  /* ── THE STATE MUST REACH THE READER, NOT JUST THE ELEMENT (CF-106) ─────────────────────────
     A diagram is read one level at a time. Agent runtime held the payload-compose guard and
     Observability held the injection scorer and the chain invariant, and BOTH containers rendered
     as plain violet boxes with the ordinary stroke — so on the container view, the plate a reviewer
     opens to ask what this project changes, every box we touch looked exactly like the ones we did
     not. The tags were correct on the components; nothing carried the fact upward.
     A parent holding a changed child must say so. */
  const markedIds = new Set(marked.map((x) => x.el.id));
  const childrenOf = new Map();
  for (const e of els) {
    const parent = e.containerId ?? (e.kind === 'Container' ? e.systemId : null);
    if (!parent) continue;
    if (!childrenOf.has(String(parent))) childrenOf.set(String(parent), []);
    childrenOf.get(String(parent)).push(e);
  }
  for (const e of els) {
    const kids = childrenOf.get(e.id) ?? [];
    const changed = kids.filter((k) => markedIds.has(k.id));
    if (!changed.length) continue;
    if (stateOf(e, states).state) continue;
    findings.push({
      rule: 'change-not-surfaced',
      where: `${e.name} holds ${changed.map((k) => k.name).join(', ')}`,
      why: `${changed.length === 1 ? 'a child carries' : `${changed.length} children carry`} a delivery state and this parent carries none, `
         + 'so one level up — the plate a reviewer actually opens to ask what changed — it is drawn as untouched',
      cite: 'ours, not the book — a state that only exists on a plate the reader has to open is invisible to the reader who stops above it',
    });
  }
  for (const m of marked) {
    if (m.all.length > 1) {
      findings.push({
        rule: 'two-states',
        where: m.el.name,
        why: `marked ${m.all.join(' and ')}, which are different claims — one fills a seat the harness already offers, the other asks for a seat that does not exist`,
        cite: 'ours — a box in two states tells a reader nothing about what it costs to land',
      });
    }
    const label = labelFor(theme, m.state);
    if (label && !String(m.el.description ?? '').includes(label)) {
      findings.push({
        rule: 'label-missing',
        where: `${m.el.name} · ${m.state}`,
        why: `the box does not say "${label}" anywhere a reader can see it, so the state is carried by a stroke colour alone and only a reader who already knows the code can read it`,
        cite: 'ch10 — notation is described with a diagram key, and a colour nobody can decode on the box is a key nobody opened',
      });
    }
    /* A DERIVED STATE INHERITS ITS ARGUMENT. A parent is marked because its CHILDREN are (CF-106),
       and the decision that justifies the change already sits beside the child that makes it. Asking
       the parent for its own ADR would put one argument in two places — the duplication row 24 of
       the review catalogue exists to catch — and the second copy is the one that goes stale.
       An element with no marked child still needs its own decision: that is the original rule and
       it is untouched. */
    /* TRANSITIVE, because the levels are. The system dsh harness is marked BECAUSE its containers
       are, and their argument sits on a COMPONENT two levels down. A one-level lookup asked the
       system for its own ADR and would have grown a duplicate at every level of nesting. */
    const inheritsFrom = (id, depth = 0) => {
      if (depth > 8) return false;
      return (childrenOf.get(id) ?? []).some((k) =>
        (markedIds.has(k.id) && governed.has(k.id)) || inheritsFrom(k.id, depth + 1));
    };
    const inherits = inheritsFrom(m.el.id);
    if (!governed.has(m.el.id) && !inherits) {
      findings.push({
        rule: 'unstated-proposal',
        where: `${m.el.name} · ${m.state}`,
        why: 'marked as our addition and no decision governs it, so the diagram makes a claim and offers no argument for it',
        cite: 'ch12 — the diagrams "show the outcome of the decision-making process", so the reasoning belongs beside them',
      });
    }
    if (!drawn.has(m.el.id)) {
      findings.push({
        rule: 'proposal-undrawn',
        where: `${m.el.name} · ${m.state}`,
        why: 'marked as our addition and drawn in no view, so the one reader who needs to see it never will',
        cite: 'ours — a proposal nobody meets is not a proposal',
      });
    }
  }

  for (const s of states) {
    if (styled.has(s)) continue;
    findings.push({
      rule: 'state-not-styled',
      where: s,
      why: 'declared a delivery state and the theme gives it no style, so a box in this state looks exactly like one that ships as-is',
      cite: 'ch10 — notation used to differentiate elements is described with a diagram key, and an unstyled state differentiates nothing',
    });
  }

  return {
    state: findings.length ? 'findings' : 'clean',
    states,
    marked: marked.map((m) => ({ name: m.el.name, kind: m.el.kind, state: m.state, governed: governed.has(m.el.id), drawn: drawn.has(m.el.id) })),
    findings,
  };
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
    const theme = { deliveryStates: ['Modified', 'Proposal'], elements: [{ tag: 'Modified', stroke: '#b8863b' }, { tag: 'Proposal', stroke: '#ffb454' }] };
    const rules = (ws, t = theme) => inspect(ws, t).findings.map((f) => f.rule);

    const build = ({ tags, decided = true, drawn = true }) => ({
      /* THE SYSTEM CARRIES THE STATE ITS CONTAINER DOES (CF-106). This fixture predates that rule
         and the rule caught it: a Guard system holding a marked Scorer, drawn as untouched. */
      model: { softwareSystems: [{ id: 's1', name: 'Guard', tags: `Element,Software System${/Proposal|Modified/.test(tags) ? ',' + (tags.match(/Proposal|Modified/) ?? [''])[0] : ''}`, description: 'modified — hover for details. holder',
        containers: [{ id: 'c1', name: 'Scorer', tags, description: 'modified — hover for details. leaf', documentation: decided ? { decisions: [{ id: '1', title: 'why', status: 'Accepted', content: 'because' }] } : undefined }] }] },
      views: { containerViews: [{ key: 'Containers', elements: drawn ? [{ id: 's1' }, { id: 'c1' }] : [] }] },
    });

    say('a model marking nothing is ABSENT, which is an answer and not a pass', inspect(build({ tags: 'Element,Container' }), theme).state === 'ABSENT', inspect(build({ tags: 'Element,Container' }), theme).state);

    const good = build({ tags: 'Element,Container,Proposal' });
    say('a proposal that is drawn and governed by a decision is clean', rules(good).length === 0, inspect(good, theme).findings);

    say('a proposal with no decision is caught', rules(build({ tags: 'Element,Container,Proposal', decided: false })).includes('unstated-proposal'), rules(build({ tags: 'Element,Container,Proposal', decided: false })));

    /* THE WORD ON THE BOX. A stroke alone was the operator's verdict on what does not work, so a
       marked box that never says which state it is in is a finding. */
    const worded = { ...theme, deliveryLabels: { Proposal: 'proposed — hover for details' } };
    const silent = build({ tags: 'Element,Container,Proposal' });
    say('a marked box that never says so in words is caught', rules(silent, worded).includes('label-missing'), rules(silent, worded));
    const spoken = JSON.parse(JSON.stringify(silent));
    spoken.model.softwareSystems[0].containers[0].description = 'proposed — hover for details. Scores text.';
    say('and one carrying the label is accepted', !rules(spoken, worded).includes('label-missing'), rules(spoken, worded));
    /* A THEME THAT DECLARES NO WORDING CANNOT DEMAND IT. */
    say('a theme with no label declared never fires the rule', !rules(silent).includes('label-missing'), rules(silent));
    say('a proposal in no view is caught', rules(build({ tags: 'Element,Container,Proposal', drawn: false })).includes('proposal-undrawn'), rules(build({ tags: 'Element,Container,Proposal', drawn: false })));
    say('Modified and Proposal on one box is caught, because they cost different things', rules(build({ tags: 'Element,Container,Modified,Proposal' })).includes('two-states'), rules(build({ tags: 'Element,Container,Modified,Proposal' })));

    /* AN UNSTYLED STATE MAKES THE WHOLE THING DECORATIVE. */
    const noStyle = { deliveryStates: ['Modified', 'Proposal'], elements: [{ tag: 'Modified', stroke: '#b8863b' }] };
    say('a declared state the theme does not style is caught', rules(good, noStyle).includes('state-not-styled'), rules(good, noStyle));

    /* THE VOCABULARY IS THE THEME'S. A repo renaming its states must have them honoured, or this
       check quietly measures words nobody uses. */
    const own = { deliveryStates: ['Spike'], elements: [{ tag: 'Spike', stroke: '#ffb454' }] };
    const spiked = build({ tags: 'Element,Container,Spike' });
    say('a repo that renames its states is measured on its own words', inspect(spiked, own).marked[0]?.state === 'Spike', inspect(spiked, own).marked);
    say('and a box carrying another repo\'s word is then not marked at all', inspect(good, own).state === 'ABSENT', inspect(good, own).state);

    /* ── CF-106: THE STATE MUST REACH THE READER ─────────────────────────────────────────────── */
    /* THE SYSTEM IS A PARENT TOO, and the first draft of these fixtures forgot it: tagging only the
       container left the SYSTEM holding a marked child and saying nothing, so the rule fired and the
       assertion read as a bug in the rule. It is not — it is the rule working two levels up, which
       is exactly what it did on the live model when dsh harness turned up beside its containers.
       `sysTags` makes the level explicit rather than implied. */
    const nested = (childTags, parentTags = 'Element,Container', withAdr = true, sysTags = 'Element,Software System') => ({
      documentation: {},
      model: { softwareSystems: [{ id: 's1', name: 'Sys', tags: sysTags,
        containers: [{ id: 'c1', name: 'Obs', tags: parentTags, description: 'modified — hover for details. x',
          components: [{ id: 'k1', name: 'Scorer', tags: childTags, description: 'modified — hover for details. y',
            documentation: withAdr ? { decisions: [{ id: '1', title: 'why', status: 'Accepted', content: 'because' }] } : undefined }] }] }] },
      views: { componentViews: [{ key: 'C', elements: [{ id: 'c1' }, { id: 'k1' }] }] },
    });
    const rulesIn = (ws, th = theme) => inspect(ws, th).findings.map((f) => f.rule);

    /* THE DEFECT: a parent holding a marked child and carrying nothing itself. */
    const unsurfaced = nested('Element,Component,Modified', 'Element,Container');
    say('the incident fires — a parent holding a changed child and saying nothing',
      rulesIn(unsurfaced).includes('change-not-surfaced'), inspect(unsurfaced, theme).findings.map((f) => f.where));
    say('and it names WHAT the parent holds, so the fix is obvious from the line',
      /Obs holds Scorer/.test(inspect(unsurfaced, theme).findings.find((f) => f.rule === 'change-not-surfaced')?.where ?? ''),
      inspect(unsurfaced, theme).findings.find((f) => f.rule === 'change-not-surfaced')?.where);

    /* THE FIX PASSES: the parent carries the state too. */
    const surfaced = nested('Element,Component,Modified', 'Element,Container,Modified', true, 'Element,Software System,Modified');
    say('a parent that carries the state is clean', !rulesIn(surfaced).includes('change-not-surfaced'), rulesIn(surfaced));

    /* AND A DERIVED STATE INHERITS ITS ARGUMENT rather than needing a second ADR. */
    say('the parent is not asked for its own decision when its marked child has one',
      !rulesIn(surfaced).includes('unstated-proposal'), rulesIn(surfaced));
    const orphan = nested('Element,Component,Modified', 'Element,Container,Modified', false, 'Element,Software System,Modified');
    say('but with NO decision anywhere on the branch it is still unstated',
      rulesIn(orphan).includes('unstated-proposal'), rulesIn(orphan));

    /* A PARENT HOLDING NOTHING MARKED MUST NOT FIRE — the rule is about containment, not depth. */
    const plain = nested('Element,Component', 'Element,Container');
    say('a parent whose children are all unchanged is not asked to claim anything',
      !rulesIn(plain).includes('change-not-surfaced'), rulesIn(plain));

    /* THE VOCABULARY COMES FROM THE MACHINE, and a silent fallback was the bug that shipped it. */
    say('statesOf reads the delivery machine when the theme declares one',
      JSON.stringify(statesOf({ delivery: { tagFor: { proposed: 'P', modified: 'M' } } })) === JSON.stringify(['P', 'M']),
      statesOf({ delivery: { tagFor: { proposed: 'P', modified: 'M' } } }));
    say('and the BASIS says which source answered, so a fallback cannot pass for a declaration',
      basisOf({}) !== basisOf({ delivery: { tagFor: { a: 'A' } } }) && /DEFAULT_STATES/.test(basisOf({})),
      { none: basisOf({}), machine: basisOf({ delivery: { tagFor: { a: 'A' } } }) });

    console.log(`\n${ok} of 18 held`);
    process.exit(ok === 18 ? 0 : 1);
  }

  let theme;
  try { theme = JSON.parse(fs.readFileSync(path.join(root, 'architecture', 'theme.json'), 'utf8')); }
  catch (e) { console.log(`UNEVALUABLE — architecture/theme.json could not be read (${e.message})`); process.exit(3); }

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
    const r = inspect(ws, theme);
    console.log(`\n  delivery · ${path.relative(process.cwd(), f)} · states: ${r.states.join(', ')}`);
    if (r.state === 'ABSENT') { console.log('    ABSENT — nothing here is marked as our addition, so every box reads as something that already ships'); continue; }
    for (const m of r.marked) console.log(`    ${m.state.padEnd(10)} ${m.kind.padEnd(16)} ${m.name}${m.governed ? '' : '  · no decision'}${m.drawn ? '' : '  · in no view'}`);
    for (const x of r.findings) { bad++; console.log(`    FAIL ${x.rule}\n         ${x.where}\n         ${x.why}\n         ${x.cite}`); }
  }
  console.log(`\n  ${bad} finding(s)`);
  process.exit(bad ? 1 : 0);
}
