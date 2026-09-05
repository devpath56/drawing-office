/**
 * CONTROL for checks/model.mjs, and for the rule that it is the ONLY model reader.
 *
 * WHY BOTH HALVES. The defect this module fixed was not that any one walk was wrong; it was that
 * three of them existed under three names and disagreed. perspectives.mjs never saw a deployment
 * node, so a perspective declared on one was invisible to its coverage report while diagram-key
 * counted the same element; diagram-key read deployment nodes one level deep, so a container
 * instance nested inside a node was outside the model as far as it was concerned; pubsub saw only
 * containers. A behavioural test on the surviving reader would have passed on all three of those.
 *
 * So the second half is a grep, and it is the load-bearing one: no file under checks/ except this
 * module's subject may walk the model itself. That is the rule that stays true when someone adds a
 * fourth check in a year and reaches for the obvious loop.
 *
 * exit 0 all held · 1 something did not
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as model from './model.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKS = path.join(ROOT, 'checks');

let bad = 0;
const ok = (n, c, saw) => { console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${c || saw === undefined ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 260)}`}`); if (!c) bad++; };

/* One fixture carrying every shape the three old walkers disagreed about. */
const WS = {
  model: {
    people: [{ id: 'p1', name: 'Cardholder', perspectives: [{ name: 'Ownership', description: 'nobody' }] }],
    softwareSystems: [{
      id: 's1', name: 'Payments',
      containers: [
        { id: 'c1', name: 'Checkout', technology: 'Java', tags: 'Element,Container', relationships: [{ id: 'r1', destinationId: 'c2', description: 'calls', tags: 'Relationship,Asynchronous' }] },
        { id: 'c2', name: 'Queue', tags: ' Element , Container , Channel ', components: [{ id: 'k1', name: 'Reader', tags: 'Element,Component' }] },
      ],
    }],
    deploymentNodes: [{
      id: 'd1', name: 'AWS', environment: 'Live',
      children: [{ id: 'd2', name: 'Fargate', children: [{ id: 'd3', name: 'Task' }] }],
      infrastructureNodes: [{ id: 'i1', name: 'Load balancer' }],
    }],
  },
  views: { containerViews: [{ key: 'Containers', elements: [{ id: 'c1' }, { id: 'c2' }], relationships: [{ id: 'r1' }] }] },
};

const els = model.elements(WS);
const named = (n) => els.find((e) => e.name === n);

/* NINE: one person, one system, two containers, one component, three deployment nodes and one
   infrastructure node. The count is spelled out because the first draft said eight and the failure
   was the assertion's arithmetic rather than the module's — a pinned number nobody can re-derive is
   a number that gets edited to match whatever the code did. */
ok('every declared element is read, people and deployment nodes included',
  els.length === 9, els.map((e) => e.name));

/* THE DEPTH DIAGRAM-KEY'S OWN WALKER MISSED. It read ws.model.deploymentNodes one level deep, so a
   node nested two down was outside the model and a deployment plate could look fully judged. */
ok('a deployment node nested two levels down is read',
  !!named('Task') && named('Task').kind === 'Deployment Node', named('Task'));
ok('an infrastructure node inside a deployment node is read',
  !!named('Load balancer') && named('Load balancer').kind === 'Infrastructure Node', named('Load balancer'));
/* THE DEPTH PERSPECTIVES' WALKER MISSED ENTIRELY: it never looked at deployment nodes at all. */
ok('a perspective on a person is reachable, which one old walker saw and another did not',
  named('Cardholder').perspectives.length === 1, named('Cardholder').perspectives);

ok('tags come back as a trimmed list, so a caller never splits a string again',
  JSON.stringify(named('Queue').tags) === JSON.stringify(['Element', 'Container', 'Channel']), named('Queue').tags);

ok('a container carries the system it lives in',
  named('Checkout').systemName === 'Payments' && named('Checkout').kind === 'Container', named('Checkout'));

ok('a component is read, and knows its container',
  named('Reader')?.containerId === 'c2', named('Reader'));

const rels = model.relationships(WS);
ok('a relationship resolves both ends rather than leaving ids',
  rels.length === 1 && rels[0].source.name === 'Checkout' && rels[0].destination.name === 'Queue', rels[0]);
ok('a relationship\'s tags come from the model, as a list',
  JSON.stringify(rels[0].tags) === JSON.stringify(['Relationship', 'Asynchronous']), rels[0].tags);

ok('an empty workspace reads as nothing rather than throwing',
  model.elements({}).length === 0 && model.relationships({}).length === 0, model.elements({}));

ok('views are labelled with the kind of view they are',
  model.views(WS)[0].kind === 'containers', model.views(WS));

/* ── THE RULE THAT MATTERS: ONE READER ───────────────────────────────────────────────────────── */

/* The shape of a hand-rolled walk. Any of these in a check other than model.mjs means a second
   reader has appeared, which is the defect rather than a style preference. */
const WALK = /ws\?*\.model\?*\.(softwareSystems|people|deploymentNodes)/;

export function selfWalkers(dir = CHECKS) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.mjs') || f === 'model.mjs' || f === 'test-model.mjs') continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    if (WALK.test(src)) out.push(f);
  }
  return out;
}

const rogue = selfWalkers();
ok('no check walks the model itself — there is one reader and every check asks it',
  rogue.length === 0, rogue);

/* THE GREP MUST BE ABLE TO FIRE, or a green line here means nothing. The pattern is run against the
   old walker's own text, restored as a string. */
const OLD = `export function elementsOf(ws) { for (const s of ws?.model?.softwareSystems ?? []) {} }`;
ok('the one-reader rule can still detect a hand-rolled walk',
  WALK.test(OLD), OLD);
/* AND IT MUST NOT FIRE ON A COMMENT, because every one of those files explains the defect it had. */
ok('a walk quoted inside a comment is not a second reader',
  !WALK.test(`/* it used to read ws?.model?.softwareSystems */ const x = 1;`.replace(/\/\*[\s\S]*?\*\//g, ' ')), 'comment stripped');

console.log(`\n${bad ? `${bad} FAIL` : 'all ok'}`);
process.exit(bad ? 1 : 0);
