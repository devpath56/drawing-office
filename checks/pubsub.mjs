/**
 * PUB/SUB — the message-driven rules, taken from the book rather than invented.
 *
 * WHY A CHECK AND NOT A RENDERER. Queues and topics need no new diagram type: chapter 11 is explicit
 * that a queue or topic IS a C4 container, so the container view already draws them. What goes wrong
 * is the MODEL, and it goes wrong the same handful of ways every time — which is a check's job, not a
 * renderer's. The chapter names the commonest mistake in a figure caption: Figure 11-19 is titled
 * "incorrectly representing the message bus as a C4 container", and Figure 11-20 is the same
 * architecture done right. A rule that can tell those two models apart is the whole of this file.
 *
 * WHAT THE BOOK RULES, AND WHERE. Five of the six rules below quote a chapter; the sixth is ours and
 * says so. That separation is deliberate — a check that launders its author's taste as the author's
 * ruling is unarguable for the wrong reason.
 *
 *   ch11  "A C4 container is an application or a data store, but the message bus is neither."
 *   ch11  "think about each separate queue and topic as being a data store (a C4 container),
 *          rather than the message bus itself"
 *   ch11  "'Sends messages to' is very generic. This label can be improved by including the type of
 *          message or event, such as 'Sends customer update events to'"
 *   ch10  "Pipes to represent message queues/topics"
 *   ch10  "synchronous relationships could be illustrated using solid lines, whereas asynchronous
 *          relationships could be illustrated using dashed lines"
 *   ch11  "you additionally need to consider who owns the queues and topics ... The ownership will
 *          impact the diagrams"
 *
 * THE TWO CHAPTER-10 RULES ARE OFFERED, NOT MANDATED, and this file binds them. The book says a pipe
 * and a dashed line "could" be used; C4 is notation independent and chapter 10 opens by saying so. So
 * these two rules are not "the book requires this" — they are this repo choosing one of the book's
 * offered conventions and then holding every diagram to it, which is the only way a convention buys
 * a reader anything. The theme is where that choice lives, so a repo that wants another one edits
 * architecture/theme.json rather than arguing with this file.
 *
 * WHAT IT CANNOT SEE. It reads the exported model, so it knows what you declared, not what your
 * system does. A topic with one consumer in the model and nine in production is clean here. This
 * check finds diagrams that lie about the model, never models that lie about the world.
 *
 * exit 0 clean · 1 findings · 2 usage · 3 UNEVALUABLE, with the reason
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STATES = Object.freeze(['clean', 'findings', 'ABSENT', 'UNEVALUABLE']);

/* THE VOCABULARY, IN ONE PLACE, because three modules spelling "topic" differently is a fault this
   repo has already paid for once. A CHANNEL is one queue or one topic — the thing chapter 11 says to
   model as a container. A BROKER is the bus, cluster or server those channels are hosted on — the
   thing chapter 11 says is neither an application nor a data store. */
export const CHANNEL_WORDS = ['queue', 'topic', 'stream', 'subject', 'channel', 'exchange', 'subscription', 'dead letter'];
export const BROKER_WORDS = ['message bus', 'message broker', 'event bus', 'service bus', 'broker', 'kafka', 'rabbitmq', 'rabbit mq', 'activemq', 'pulsar', 'nats', 'redpanda', 'event hub', 'eventbridge'];

const words = (el) => [el.name, el.technology, el.description, el.tags].filter(Boolean).join(' ').toLowerCase();

/**
 * Which of the three an element is. THE ORDER MATTERS AND IS THE WHOLE TRICK: a channel is named for
 * itself and hosted on a broker, so "Payment requested queue / Amazon SQS" carries both vocabularies
 * and is a channel. Only an element that names a broker and NO channel is the bus itself.
 */
export function classify(el) {
  const w = words(el);
  if (CHANNEL_WORDS.some((k) => w.includes(k))) return 'channel';
  if (BROKER_WORDS.some((k) => w.includes(k))) return 'broker';
  return 'other';
}

/* A description is generic when removing the verb and the preposition leaves nothing a reader could
   not have guessed. "Sends messages to" leaves "messages"; "Sends payment requested events to"
   leaves "payment requested events", which is the improvement chapter 11 asks for by name. */
const VERB = /^(sends?|publish(?:es)?|puts?|posts?|writes?|emits?|reads?|consumes?|receives?|gets?|takes?|subscribes? to|pulls?|polls?)\b/i;
const PREP = /\b(to|from|onto|into|off|on)\s*$/i;
const NOUN = /^(the\s+)?(messages?|events?|data|items?|records?|payloads?|notifications?)$/i;

export function isGeneric(description) {
  const rest = String(description ?? '').replace(VERB, '').replace(PREP, '').trim();
  return rest === '' || NOUN.test(rest);
}

/** Every container in the model, each carrying the system it lives in. */
export function containersOf(ws) {
  const out = [];
  for (const s of ws?.model?.softwareSystems ?? []) {
    for (const c of s.containers ?? []) out.push({ ...c, systemId: String(s.id), systemName: s.name });
  }
  return out;
}

/** The style an element ends up with, resolving its tags against the theme in declared order. */
export function styleOf(el, theme) {
  const rows = theme?.elements ?? [];
  const out = {};
  for (const tag of String(el.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean)) {
    const row = rows.find((r) => r.tag === tag);
    if (row) Object.assign(out, row);
  }
  return out;
}

/** Whether a relationship's tags resolve to a dashed line under this theme. */
export function isDashed(rel, theme) {
  const rows = theme?.relationships ?? [];
  let dashed = false;
  for (const tag of String(rel.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean)) {
    const row = rows.find((r) => r.tag === tag);
    if (row && row.dashed !== undefined) dashed = row.dashed === true || row.dashed === 'true';
  }
  return dashed;
}

/**
 * THE SIX RULES. Each finding names the element, the rule, and the chapter it comes from, so a reader
 * can disagree with the book rather than with this script.
 */
export function inspect(ws, theme) {
  const findings = [];
  const containers = containersOf(ws);
  const byId = new Map(containers.map((c) => [String(c.id), c]));
  for (const p of ws?.model?.people ?? []) byId.set(String(p.id), { ...p, systemId: null, systemName: null });
  for (const s of ws?.model?.softwareSystems ?? []) byId.set(String(s.id), { ...s, systemId: String(s.id), systemName: s.name });

  /* Every relationship in the model, flattened, with both ends resolved. */
  const rels = [];
  const collect = (owner) => {
    for (const r of owner.relationships ?? []) {
      rels.push({ ...r, source: byId.get(String(owner.id)), destination: byId.get(String(r.destinationId)) });
    }
  };
  for (const p of ws?.model?.people ?? []) collect(p);
  for (const s of ws?.model?.softwareSystems ?? []) { collect(s); for (const c of s.containers ?? []) collect(c); }

  const channels = containers.filter((c) => classify(c) === 'channel');
  const add = (rule, where, why, cite) => findings.push({ rule, where, why, cite });

  /* 1 — THE BUS IS NOT A CONTAINER. The book's Figure 11-19, by its own caption. */
  for (const c of containers) {
    if (classify(c) !== 'broker') continue;
    add('bus-as-container', `${c.systemName} / ${c.name}`,
      'the message bus is modelled as a container; model each queue and topic as its own container instead, and the bus not at all',
      'ch11, Figure 11-19 — "incorrectly representing the message bus as a C4 container"');
  }

  /* 2 — A CHANNEL IS A DATA STORE, DRAWN AS A PIPE. Chapter 10's offered convention, bound here. */
  for (const c of channels) {
    const shape = styleOf(c, theme).shape;
    if (shape === 'Pipe' || shape === 'Cylinder') continue;
    add('channel-drawn-as-an-application', `${c.systemName} / ${c.name}`,
      `a queue or topic is a data store and is drawn as a pipe here; this one resolves to ${shape ? `shape ${shape}` : 'no shape at all, so it renders as a plain box'} — tag it so the theme can style it`,
      'ch10 — "Pipes to represent message queues/topics"; ch11 — a queue or topic "is essentially a data store too"');
  }

  /* 3 — SAY WHAT THE MESSAGE IS. The one improvement chapter 11 spells out with an example. */
  for (const r of rels) {
    /* A HOP IS A MESSAGE HOP IF EITHER END IS A MESSAGE ELEMENT, and that includes the bus. The
       chapter criticises "Sends messages to" while discussing Figure 11-19, whose middle element IS
       the bus — so a rule that only looked at channels went quiet on exactly the diagram the chapter
       was talking about. Measured on a real export of that figure: only bus-as-container fired. */
    const messaging = (e) => ['channel', 'broker'].includes(classify(e ?? {}));
    const touches = messaging(r.source) || messaging(r.destination);
    if (!touches || !isGeneric(r.description)) continue;
    add('generic-message-label', `${r.source?.name} → ${r.destination?.name}`,
      `"${r.description ?? ''}" says nothing a reader could not guess; name the message or event, as in "Sends customer update events to"`,
      'ch11 — "‘Sends messages to’ is very generic"');
  }

  /* 4 — ASYNCHRONOUS LINES ARE DASHED. Chapter 10's other offered convention, bound here. */
  for (const r of rels) {
    /* A HOP IS A MESSAGE HOP IF EITHER END IS A MESSAGE ELEMENT, and that includes the bus. The
       chapter criticises "Sends messages to" while discussing Figure 11-19, whose middle element IS
       the bus — so a rule that only looked at channels went quiet on exactly the diagram the chapter
       was talking about. Measured on a real export of that figure: only bus-as-container fired. */
    const messaging = (e) => ['channel', 'broker'].includes(classify(e ?? {}));
    const touches = messaging(r.source) || messaging(r.destination);
    if (!touches || isDashed(r, theme)) continue;
    add('async-drawn-solid', `${r.source?.name} → ${r.destination?.name}`,
      'a relationship through a queue or topic is asynchronous and is drawn dashed here; this one resolves to a solid line, so it reads as a blocking call',
      'ch10, Figure 10-11 — "solid for synchronous, dashed for asynchronous"');
  }

  /* 5 — OURS, NOT THE BOOK'S. A channel with only one end declared is a half-drawn story: either a
     producer nobody reads, or a consumer of messages nobody sends. Both are almost always an omission
     from the diagram rather than a fact about the system, which is exactly what a reader cannot tell. */
  for (const c of channels) {
    /* THE ARROWS MAY POINT EITHER WAY, and that is the book's ruling rather than a concession:
       chapter 11 says to flip them to show publisher and subscriber roles, so counting inbound
       against outbound would refuse Figure 11-22. What is counted instead is NEIGHBOURS — a channel
       is half-open when fewer than two distinct elements touch it, whichever way the arrows run. */
    const touching = rels.filter((r) => String(r.destinationId) === String(c.id) || String(r.source?.id) === String(c.id));
    const neighbours = new Set(touching.map((r) => (String(r.source?.id) === String(c.id) ? String(r.destinationId) : String(r.source?.id))));
    if (neighbours.size >= 2) continue;
    const producers = touching.filter((r) => String(r.destinationId) === String(c.id));
    const consumers = touching.filter((r) => String(r.source?.id) === String(c.id));
    add('half-open-channel', `${c.systemName} / ${c.name}`,
      producers.length || consumers.length
        ? 'only one end of this queue is drawn, so the diagram cannot say who is on the other side of it'
        : 'nothing is drawn producing or consuming this queue, so it reads as decoration',
      'ours, not the book — a data store with one end missing is an omission a reader cannot detect');
  }

  /* 6 — WHO OWNS THE QUEUE. Chapter 11's closing point, asked as a statement rather than an answer. */
  for (const c of channels) {
    const ends = rels
      .filter((r) => String(r.destinationId) === String(c.id) || String(r.source?.id) === String(c.id))
      .map((r) => (String(r.source?.id) === String(c.id) ? r.destination : r.source))
      .filter(Boolean);
    const systems = new Set(ends.map((e) => e.systemId ?? String(e.id)));
    if (systems.size < 2) continue;
    /* AN OWNERSHIP PERSPECTIVE IS THE BOOK'S OWN ANSWER TO THIS RULE. Chapter 11 says to consider
       who owns a queue; chapter 12 says the place to put that without cluttering the diagram is a
       perspective. A rule that demanded a group or a tag would have refused the model that answers
       it in the way the same book recommends. */
    const owned = (c.perspectives ?? []).some((p) => /owner/i.test(p.name ?? ''));
    if (owned || c.group || /owner:/i.test(String(c.tags ?? '')) || /owner:/i.test(String(c.description ?? ''))) continue;
    add('unowned-channel', `${c.systemName} / ${c.name}`,
      `${systems.size} software systems meet at this queue and none of them is declared its owner; put it in a group, or tag it "owner: <team>"`,
      'ch11 — "you additionally need to consider who owns the queues and topics"');
  }

  return { channels: channels.map((c) => `${c.systemName} / ${c.name}`), findings };
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  const root = flag('--root', HERE);

  if (argv.includes('--negative')) {
    /* THE PLANTED FAULTS. Every case is a model this check must judge, built as a workspace rather
       than described — and cases 1 and 2 are the book's own Figures 11-19 and 11-20, the same
       architecture modelled wrongly and then rightly, which is the pair this file exists to tell
       apart. If it cannot separate those two, nothing else it says is worth reading. */
    const theme = {
      elements: [{ tag: 'Container' }, { tag: 'Channel', shape: 'Pipe' }],
      relationships: [{ tag: 'Relationship' }, { tag: 'Asynchronous', dashed: true }],
    };
    const sys = (containers) => ({ model: { softwareSystems: [{ id: 's1', name: 'Payments', containers }] } });
    const chan = (id, name) => ({ id, name, technology: 'Amazon SQS', tags: 'Element,Container,Channel' });
    const svc = (id, name) => ({ id, name, tags: 'Element,Container', relationships: [] });
    const to = (dest, description, tags = 'Relationship,Asynchronous') => ({ id: `r${dest}${Math.random()}`, destinationId: dest, description, tags });

    let ok = 0;
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 300)}`}`); if (pass) ok++; };
    const rulesOf = (ws) => inspect(ws, theme).findings.map((f) => f.rule);

    /* Figure 11-20, done right: a producer, a named queue, a consumer, dashed, message named. */
    const right = sys([
      { ...svc('a', 'Checkout service'), relationships: [to('q1', 'Sends payment requested events to')] },
      chan('q1', 'Payment requested queue'),
      { ...svc('c', 'Settlement service'), relationships: [] },
    ]);
    right.model.softwareSystems[0].containers[1].relationships = [to('c', 'Sends payment requested events to')];
    say('the book\'s Figure 11-20 model is clean', rulesOf(right).length === 0, inspect(right, theme).findings);

    /* Figure 11-19, the mistake the chapter names: one bus in the middle. */
    /* THE LABELS HERE ARE THE CHAPTER'S OWN. Figure 11-19 is drawn with "Sends messages to" on both
       hops, and the paragraph under it quotes that exact string as the thing to improve. An earlier
       draft of this fixture put a good label on a bad diagram, so the case passed while the rule was
       still blind — the fixture was wrong, not the rule. */
    const wrong = sys([
      { ...svc('a', 'Checkout service'), relationships: [to('bus', 'Sends messages to')] },
      { id: 'bus', name: 'Message Bus', technology: 'Apache Kafka', tags: 'Element,Container', relationships: [to('c', 'Sends messages to')] },
      svc('c', 'Settlement service'),
    ]);
    say('the book\'s Figure 11-19 mistake is caught — the bus modelled as a container', rulesOf(wrong).includes('bus-as-container'), rulesOf(wrong));
    /* THE CHAPTER CRITICISES THE LABEL IN THE SAME BREATH AS THE BUS, so the label rule must reach
       the bus too. Measured on a real export before this case existed: only bus-as-container fired. */
    say('the generic label on Figure 11-19 is caught even though the middle element is a bus', rulesOf(wrong).includes('generic-message-label'), rulesOf(wrong));

    /* A broker's name on a CHANNEL must not fire rule 1: a topic is hosted on Kafka and says so. */
    const hosted = structuredClone(right);
    hosted.model.softwareSystems[0].containers[1].technology = 'Apache Kafka topic';
    say('a queue hosted on Kafka is not mistaken for the bus itself', !rulesOf(hosted).includes('bus-as-container'), rulesOf(hosted));

    const generic = structuredClone(right);
    generic.model.softwareSystems[0].containers[0].relationships[0].description = 'Sends messages to';
    say('"Sends messages to" is refused', rulesOf(generic).includes('generic-message-label'), rulesOf(generic));

    const named = structuredClone(right);
    named.model.softwareSystems[0].containers[0].relationships[0].description = 'Sends customer update events to';
    say('the chapter\'s own improved label is accepted', !rulesOf(named).includes('generic-message-label'), rulesOf(named));

    const plain = structuredClone(right);
    plain.model.softwareSystems[0].containers[1].tags = 'Element,Container';
    say('a topic that renders as a plain box is refused', rulesOf(plain).includes('channel-drawn-as-an-application'), rulesOf(plain));

    const solid = structuredClone(right);
    solid.model.softwareSystems[0].containers[0].relationships[0].tags = 'Relationship';
    say('an asynchronous hop drawn as a solid line is refused', rulesOf(solid).includes('async-drawn-solid'), rulesOf(solid));

    const halfOpen = structuredClone(right);
    halfOpen.model.softwareSystems[0].containers[1].relationships = [];
    say('a queue nobody consumes is refused', rulesOf(halfOpen).includes('half-open-channel'), rulesOf(halfOpen));

    /* FAN-OUT IS NOT A HALF-OPEN CHANNEL. One publisher, two subscribers, arrows drawn from the
       subscribers inward — chapter 11 says the direction is the author's choice, so a rule that
       demanded one direction would refuse Figure 11-22. */
    const fanout = sys([
      { ...svc('a', 'Ledger service'), relationships: [to('t1', 'Publishes statement events to')] },
      { ...chan('t1', 'Statement events topic'), relationships: [] },
      { ...svc('c', 'Notification service'), relationships: [to('t1', 'Subscribes to statement events from')] },
      { ...svc('d', 'Audit archive'), relationships: [to('t1', 'Subscribes to statement events from')] },
    ]);
    say('a topic with two subscribers drawn inward is not called half-open', !rulesOf(fanout).includes('half-open-channel'), rulesOf(fanout));

    /* Ownership fires only when the ends are in different software systems. */
    const across = {
      model: {
        softwareSystems: [
          { id: 's1', name: 'Payments', containers: [{ ...svc('a', 'Checkout service'), relationships: [to('q1', 'Sends payment requested events to')] }, chan('q1', 'Payment requested queue')] },
          { id: 's2', name: 'Fulfilment', containers: [{ ...svc('c', 'Settlement service'), relationships: [to('q1', 'Reads payment requested events from')] }] },
        ],
      },
    };
    say('a queue joining two software systems with no stated owner is refused', rulesOf(across).includes('unowned-channel'), rulesOf(across));
    across.model.softwareSystems[0].containers[1].group = 'Payments platform';
    say('the same queue with a declared owner is accepted', !rulesOf(across).includes('unowned-channel'), rulesOf(across));

    say('a model with no queues at all is clean rather than empty of opinion', inspect({ model: { softwareSystems: [] } }, theme).findings.length === 0, inspect({ model: { softwareSystems: [] } }, theme));

    console.log(`\n${ok} of 13 held`);
    process.exit(ok === 13 ? 0 : 1);
  }

  let theme;
  try { theme = JSON.parse(fs.readFileSync(path.join(root, 'architecture', 'theme.json'), 'utf8')); }
  catch (e) { console.log(`UNEVALUABLE — architecture/theme.json could not be read (${e.message}); two of the six rules resolve shapes and line styles through it`); process.exit(3); }

  const targets = flag('--workspace', null)
    ? [flag('--workspace', null)]
    : fs.existsSync(path.join(root, 'architecture'))
      ? fs.readdirSync(path.join(root, 'architecture'), { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => path.join(root, 'architecture', d.name, 'workspace.json'))
          .filter((f) => fs.existsSync(f))
      : [];

  if (!targets.length) { console.log('UNEVALUABLE — no exported workspace.json found; export the DSL first'); process.exit(3); }

  let total = 0, channels = 0;
  const json = [];
  for (const f of targets) {
    let ws;
    try { ws = JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) { console.log(`UNEVALUABLE — ${f} does not parse: ${e.message}`); process.exit(3); }
    const r = inspect(ws, theme);
    channels += r.channels.length;
    total += r.findings.length;
    json.push({ workspace: path.relative(root, f), ...r });
    if (argv.includes('--json')) continue;
    console.log(`\n  pubsub · ${path.relative(process.cwd(), f)}`);
    console.log(`    ${r.channels.length} queue(s)/topic(s): ${r.channels.join(', ') || 'none — the model declares no message channel, which is an answer, not a pass'}`);
    for (const x of r.findings) console.log(`    FAIL ${x.rule}\n         ${x.where}\n         ${x.why}\n         ${x.cite}`);
  }

  if (argv.includes('--json')) { console.log(JSON.stringify(json, null, 2)); process.exit(total ? 1 : 0); }
  console.log(`\n  ${total} finding(s) across ${channels} channel(s) in ${targets.length} workspace(s)`);
  console.log('  five rules are the book\'s (ch10, ch11); half-open-channel is this repo\'s own and is marked as such');
  process.exit(total ? 1 : 0);
}
