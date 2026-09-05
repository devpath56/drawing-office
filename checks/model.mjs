/**
 * MODEL — one reader for an exported workspace, because three checks were each walking it
 * differently and calling the walk a different name.
 *
 * THE DEFECT, as found by an Ousterhout review of checks/diagram-key.mjs:
 *
 *   checks/perspectives.mjs   elementsOf(ws)     people + systems + containers + components
 *   checks/diagram-key.mjs    elementsById(ws)   the same, plus deploymentNodes, keyed by id
 *   checks/pubsub.mjs         containersOf(ws)   containers only, carrying their system
 *
 * One concept, three spellings, three slightly different answers. That is inconsistency (row 23 of
 * the catalogue) sitting on top of repetition (row 6), and its cost is specific rather than
 * aesthetic: a tag that one walker sees and another misses produces two verdicts about the same
 * model, and nothing in the repo would say which is right. diagram-key already walks deployment
 * nodes and perspectives does not, so today the two disagree about whether a deployment node is
 * part of the model — which is exactly the question the Deployment Node palette hole turned on.
 *
 * WHY THIS IS BUILT RATHER THAN ADOPTED — the receipt, recorded 2026-09-04.
 *
 *   THE REQUIREMENT, stated before the search: walk an ALREADY-EXPORTED workspace.json and yield
 *   every element with id, name, kind, tags and perspectives, adding no runtime dependency — this
 *   repo has none, and its browser tools already refuse legibly rather than assume one.
 *
 *   capability.lookup('model walker for exported architecture workspace elements') → ABSENT across
 *   11 registries. That is an answer about THIS repo's declarations, not about the world, so:
 *
 *   OSS-SEARCH  2026-09-04
 *     queried   "npm package parse structurizr workspace.json model javascript library"
 *     found     structurizr-typescript — a full TypeScript implementation of the Structurizr object
 *               model for AUTHORING and serialising workspaces, published to npm —
 *               https://github.com/ChristianEder/structurizr-typescript
 *     found     structurizr-parser — parses Structurizr DSL source in TypeScript, not the exported
 *               JSON — https://github.com/Gerry-rohling/structurizr-parser
 *     verdict   BUILD, because neither reads an exported workspace.json for a checker: the first
 *               constructs and serialises workspaces, the second parses the DSL we do not read.
 *               Adopting either adds a runtime dependency to replace thirty lines of object walking
 *               over a schema the CLI has already resolved for us.
 *
 * WHAT IT DELIBERATELY IS NOT. It does not interpret. Tags are returned as declared, kinds as the
 * position in the tree says, and every judgement stays in the check that owns it. A shared reader
 * that started ruling on what a tag MEANS would put three checks' opinions in one file, which is the
 * fault this one is fixing, wearing a different hat.
 */

export const STATES = Object.freeze(['read', 'ABSENT']);

/**
 * Every element the model declares, in tree order.
 * KINDS ARE THE RENDERER'S OWN, so a caller comparing them against a theme tag matches without
 * translating: "Person", "Software System", "Container", "Component", "Deployment Node".
 */
export function elements(ws) {
  const out = [];
  const push = (e, kind, extra = {}) => out.push({
    id: String(e.id),
    name: e.name,
    kind,
    technology: e.technology ?? null,
    description: e.description ?? null,
    group: e.group ?? null,
    tags: String(e.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    perspectives: e.perspectives ?? [],
    ...extra,
  });

  for (const p of ws?.model?.people ?? []) push(p, 'Person', { systemId: null, systemName: null });
  for (const s of ws?.model?.softwareSystems ?? []) {
    push(s, 'Software System', { systemId: String(s.id), systemName: s.name });
    for (const c of s.containers ?? []) {
      push(c, 'Container', { systemId: String(s.id), systemName: s.name });
      for (const k of c.components ?? []) push(k, 'Component', { systemId: String(s.id), systemName: s.name, containerId: String(c.id) });
    }
  }
  /* DEPLOYMENT NODES NEST, and a flat walk that stopped at the first level would miss the container
     instances inside them — which is how a deployment plate can look complete and be half-read. */
  const nodes = (list, environment) => {
    for (const n of list ?? []) {
      const env = n.environment ?? environment ?? null;
      push(n, 'Deployment Node', { systemId: null, systemName: null, environment: env });
      nodes(n.children, env);
      for (const i of n.infrastructureNodes ?? []) push(i, 'Infrastructure Node', { systemId: null, systemName: null, environment: env });
      /* INSTANCES ARE ELEMENTS THE RENDERER DRAWS AND THIS WALK DID NOT READ (CF-104). A deployment
         view is mostly instances — 12 of them in the No-Leak-MCP model — and because they never
         reached this list, checks/diagram-key.mjs was never offered their tags, the theme styled
         neither, and 26 shapes rendered in Structurizr's default #1abc9c while all seven checks
         exited 0. An instance carries its OWN tags ("Container Instance", "Software System
         Instance"), which is what the renderer styles on, so those are the kinds returned. */
      for (const i of n.containerInstances ?? []) push(i, 'Container Instance', { systemId: null, systemName: null, environment: env, ofId: String(i.containerId), name: i.name ?? null });
      for (const i of n.softwareSystemInstances ?? []) push(i, 'Software System Instance', { systemId: null, systemName: null, environment: env, ofId: String(i.softwareSystemId), name: i.name ?? null });
    }
  };
  nodes(ws?.model?.deploymentNodes, null);
  return out;
}

/**
 * WHAT THIS READER READ, AND WHAT IT IGNORED — the denominator for its own walk.
 *
 * CF-104 IS THE REASON, and adding two lines to the walk would have fixed the instance and left the
 * CLASS open: a shared reader's omissions are inherited by every consumer and none of them can see
 * past it. Five checks ask this module what the model contains; when it silently returned 30 of 42
 * elements, five checks were wrong at once and all five said clean.
 *
 * So the reader reports its own coverage against the keys the export ACTUALLY carries, rather than
 * against a list of keys someone remembered. A key present in the workspace and absent from
 * READS is returned in `ignored`, and checks/test-model.mjs refuses a non-empty one. The next node
 * kind Structurizr adds cannot be silently dropped: it arrives as a name in that array.
 */
export const READS = Object.freeze({
  model: ['people', 'softwareSystems', 'deploymentNodes'],
  element: ['containers', 'components'],
  node: ['children', 'infrastructureNodes', 'containerInstances', 'softwareSystemInstances'],
});

export function coverage(ws) {
  const ignored = new Set();
  const seen = { model: new Set(), element: new Set(), node: new Set() };

  const note = (obj, where) => {
    for (const k of Object.keys(obj ?? {})) {
      if (!Array.isArray(obj[k]) || !obj[k].length) continue;
      seen[where].add(k);
      if (!READS[where].includes(k)) ignored.add(`${where}.${k}`);
    }
  };
  /* `relationships`, `perspectives`, `documentation` and `tags` are READ by other exports of this
     module and are not element containers, so they are not part of this walk's population. */
  const NOT_A_CHILD_LIST = ['relationships', 'perspectives', 'properties'];
  const drop = (s) => [...s].filter((k) => !NOT_A_CHILD_LIST.includes(k));

  note(ws?.model, 'model');
  for (const s of ws?.model?.softwareSystems ?? []) {
    note(s, 'element');
    for (const c of s.containers ?? []) note(c, 'element');
  }
  const walk = (list) => { for (const n of list ?? []) { note(n, 'node'); walk(n.children); } };
  walk(ws?.model?.deploymentNodes);

  return {
    read: { model: drop(seen.model), element: drop(seen.element), node: drop(seen.node) },
    ignored: [...ignored].filter((k) => !NOT_A_CHILD_LIST.includes(k.split('.')[1])),
  };
}

/** The same, keyed by id, for the callers that resolve a view's element references. */
export function byId(ws) {
  return new Map(elements(ws).map((e) => [e.id, e]));
}

/** Only the containers, each carrying the system it lives in — pubsub's shape, from one walk. */
export function containers(ws) {
  return elements(ws).filter((e) => e.kind === 'Container');
}

/**
 * Every relationship the model declares, with both ends resolved.
 * A RELATIONSHIP IS DECLARED ON ITS SOURCE, which is the fact each of the three checks had rewritten
 * for itself, and the reason a view's own relationship list carries no tags: the view references a
 * model relationship by id and the tags live on the model.
 */
export function relationships(ws) {
  const index = byId(ws);
  const out = [];
  for (const owner of elements(ws)) {
    const raw = rawOf(ws, owner.id);
    for (const r of raw?.relationships ?? []) {
      out.push({
        id: String(r.id),
        sourceId: owner.id,
        destinationId: String(r.destinationId),
        source: index.get(owner.id) ?? null,
        destination: index.get(String(r.destinationId)) ?? null,
        description: r.description ?? null,
        technology: r.technology ?? null,
        tags: String(r.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      });
    }
  }
  return out;
}

/* The original node for an id, so relationships can be read off it without a second walk shape. */
function rawOf(ws, id) {
  const want = String(id);
  for (const p of ws?.model?.people ?? []) if (String(p.id) === want) return p;
  for (const s of ws?.model?.softwareSystems ?? []) {
    if (String(s.id) === want) return s;
    for (const c of s.containers ?? []) {
      if (String(c.id) === want) return c;
      for (const k of c.components ?? []) if (String(k.id) === want) return k;
    }
  }
  const hunt = (list) => {
    for (const n of list ?? []) {
      if (String(n.id) === want) return n;
      const deeper = hunt(n.children);
      if (deeper) return deeper;
      for (const i of n.infrastructureNodes ?? []) if (String(i.id) === want) return i;
    }
    return null;
  };
  return hunt(ws?.model?.deploymentNodes);
}

/** The decisions the workspace declares, workspace-scoped and element-scoped alike. */
export function decisions(ws) {
  const out = [];
  const take = (holder, owner) => {
    for (const d of holder?.documentation?.decisions ?? []) {
      out.push({
        id: String(d.id),
        title: d.title,
        status: d.status ?? null,
        date: d.date ?? null,
        format: d.format ?? null,
        content: d.content ?? '',
        /* THE ELEMENT IT GOVERNS, or null for a decision about the whole workspace. Structurizr does
           not put an elementId on the record — it nests the decision UNDER the element — so the link
           is the position in the tree, and it is read here once rather than rediscovered. */
        elementId: owner ? owner.id : null,
        elementName: owner ? owner.name : null,
      });
    }
  };
  take(ws, null);
  for (const e of elements(ws)) take(rawOf(ws, e.id), e);
  return out;
}

/** Every view the workspace declares, each labelled with the kind of view it is. */
export function views(ws) {
  const out = [];
  const kinds = {
    systemLandscapeViews: 'landscape',
    systemContextViews: 'context',
    containerViews: 'containers',
    componentViews: 'components',
    dynamicViews: 'dynamic',
    deploymentViews: 'deployment',
  };
  for (const [field, kind] of Object.entries(kinds)) {
    for (const v of ws?.views?.[field] ?? []) out.push({ ...v, kind });
  }
  return out;
}

/**
 * WHICH TAGS ACTUALLY CONTAIN SOMETHING, read from a model rather than declared.
 *
 * THE LIST WAS CALIBRATED TO ITS AUTHOR'S MISTAKE, which is why this exists. `noClaim` names the
 * rows allowed to decline a hue, and its argument is that a BOUNDARY says where something runs
 * rather than whose it is. "Infrastructure Node" was written into that list by analogy with the
 * line above it — and an infrastructure node holds nothing. The detection worker then rendered as a
 * 450x300 empty-looking box, and the operator found it by hand, one commit after this very check
 * shipped claiming to guard the palette. A rule whose exemptions are a hand-typed list inherits
 * every error in that list.
 *
 * So the exemption is now EARNED against the model: a tag whose elements never contain another
 * element is not a boundary and may not take the frame treatment. With no model to read the rule
 * stays silent rather than guessing — `boundaries.size` is the denominator, and an empty one means
 * NOT-CHECKED rather than clean.
 */
export function boundaryTags(ws) {
  const tags = new Set();
  const of = (o) => String(o?.tags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const walk = (list) => {
    for (const n of list ?? []) {
      const holds = (n.children?.length ?? 0) + (n.containerInstances?.length ?? 0)
        + (n.softwareSystemInstances?.length ?? 0) + (n.infrastructureNodes?.length ?? 0);
      if (holds > 0) for (const t of of(n)) tags.add(t);
      walk(n.children);
    }
  };
  walk(ws?.model?.deploymentNodes);
  for (const s of ws?.model?.softwareSystems ?? []) {
    if ((s.containers?.length ?? 0) > 0) for (const t of of(s)) tags.add(t);
    for (const c of s.containers ?? []) if ((c.components?.length ?? 0) > 0) for (const t of of(c)) tags.add(t);
  }
  return tags;
}

/** The styles the export carries, which is the theme after the CLI has resolved it. */
export function styles(ws) {
  return {
    elements: ws?.views?.configuration?.styles?.elements ?? [],
    relationships: ws?.views?.configuration?.styles?.relationships ?? [],
  };
}
