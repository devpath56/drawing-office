#!/usr/bin/env node
/**
 * SERVE — a static server for the viewer that never serves a stale answer.
 *
 * WHY IT REPLACES `python3 -m http.server`. Measured 2026-09-05, and it cost an operator two
 * reloads and a wrong diagnosis from me. SimpleHTTPRequestHandler sends `Last-Modified` and NOTHING
 * ELSE — no `ETag`, no `Cache-Control` — so a browser applies HEURISTIC freshness and keeps the
 * file. Three things then compound:
 *
 *   the viewer navigates its frame by HASH, so the frame's document is never re-fetched;
 *   site/workspace.js is a sub-resource of that document, so it is never re-fetched either;
 *   viewer.html itself is cached the same way, so the fix shipped INTO the wrapper was also stale.
 *
 * The result was a fresh model, a five-view page, and a rail offering a sixth view that rendered as
 * an empty canvas — with every check green, because every check reads the model and none of them
 * reads what the browser is executing.
 *
 * `no-store` IS DELIBERATE AND `no-cache` IS NOT ENOUGH. `no-cache` permits a stored copy revalidated
 * by ETag or Last-Modified, and Last-Modified has one-second granularity: two exports inside the
 * same second are indistinguishable, which is exactly the shape of an edit-export-reload loop. This
 * is a development preview; correctness beats a warm cache.
 *
 *   node tools/serve.mjs [port] [--root <dir>]
 *   node tools/serve.mjs --negative
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0';

export const TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
});

/**
 * The file a request names, or null when it escapes the root.
 * A `..` THAT CLIMBS OUT IS REFUSED rather than clamped, because a server that quietly serves a
 * different file than the one asked for is worse than one that says no.
 */
export function resolveRequest(url, root) {
  const clean = decodeURIComponent(String(url).split('?')[0].split('#')[0]);
  const full = path.resolve(root, '.' + path.posix.normalize(clean));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  try { if (fs.statSync(full).isDirectory()) return path.join(full, 'index.html'); } catch { /* fall through */ }
  return full;
}

export function handler(root) {
  return (req, res) => {
    const file = resolveRequest(req.url, root);
    if (!file) { res.writeHead(403, { 'Cache-Control': NO_STORE }); res.end('outside the served root'); return; }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': NO_STORE });
        res.end(`404 ${path.relative(root, file)}\n`);
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': body.length,
        /* EVERY RESPONSE, not only the html. The bundle is the one that went stale. */
        'Cache-Control': NO_STORE,
      });
      res.end(body);
    });
  };
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────── */
const real = (q) => { try { return fs.realpathSync(q); } catch { return path.resolve(q); } };
const IS_MAIN = process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));

if (IS_MAIN) {
  const argv = process.argv.slice(2);

  if (argv.includes('--negative')) {
    let ok = 0;
    const say = (n, pass, saw) => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${n}${pass ? '' : `\n       saw: ${JSON.stringify(saw)?.slice(0, 200)}`}`); if (pass) ok++; };

    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'serve-'));
    fs.writeFileSync(path.join(dir, 'a.js'), 'one');
    fs.mkdirSync(path.join(dir, 'sub'));
    fs.writeFileSync(path.join(dir, 'sub', 'index.html'), '<p>sub</p>');
    const root = fs.realpathSync(dir);
    const server = http.createServer(handler(root));
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    const get = async (p) => { const r = await fetch(`http://127.0.0.1:${port}${p}`); return { status: r.status, cc: r.headers.get('cache-control'), body: await r.text() }; };

    const one = await get('/a.js');
    say('a file is served', one.status === 200 && one.body === 'one', one);
    /* THE WHOLE POINT. */
    say('and it carries no-store, which is the defect this module exists for', one.cc === NO_STORE, one.cc);
    say('no-cache alone is refused as the header, because it permits a revalidated stored copy',
      NO_STORE.includes('no-store'), NO_STORE);

    /* THE RE-EXPORT CASE, END TO END: overwrite the file and ask again. */
    fs.writeFileSync(path.join(root, 'a.js'), 'two');
    const two = await get('/a.js');
    say('a file rewritten between requests is served fresh, which is the whole reload story',
      two.body === 'two', two.body);

    say('a directory serves its index.html', (await get('/sub/')).body.includes('sub'), await get('/sub/'));
    const missing = await get('/nope.js');
    say('a missing file is 404 with the path, never an empty 200', missing.status === 404 && missing.body.includes('nope.js'), missing);
    say('and the 404 is uncacheable too, so a file created later is not shadowed by it', missing.cc === NO_STORE, missing.cc);

    /* A CLIMB OUT OF THE ROOT IS REFUSED, not clamped. */
    const esc = await get('/../../etc/hosts');
    say('a path climbing out of the root does not serve another file', esc.status !== 200 || !esc.body.includes('localhost'), { status: esc.status });
    /* WHAT ACTUALLY MATTERS IS THE ROOT, NOT THE SHAPE OF THE PATH, and the first draft of this
       assertion tested the wrong thing. `path.posix.normalize('/../../etc/passwd')` is `/etc/passwd`
       — the climb is CLAMPED before resolve ever sees it — so the answer is <root>/etc/passwd, a
       harmless miss inside the served tree. The old predicate looked for the substring '/etc/' and
       failed on a correct answer. The rule is one sentence: whatever comes back is under the root. */
    const climbed = resolveRequest('/../../etc/passwd', root);
    say('a resolved path is always inside the served root, whatever the request asked for',
      climbed === null || climbed === root || climbed.startsWith(root + path.sep), { climbed, root });
    say('and an absolute path in the request cannot reach outside it either',
      (() => { const r = resolveRequest('//etc/passwd', root); return r === null || r.startsWith(root + path.sep); })(), resolveRequest('//etc/passwd', root));

    say('a query string and a hash are stripped before the file is looked up',
      (await get('/a.js?v=123')).body === 'two', await get('/a.js?v=123'));

    server.close();
    console.log(`\n${ok} of 11 held`);
    process.exit(ok === 11 ? 0 : 1);
  }

  const i = argv.indexOf('--root');
  const root = fs.realpathSync(i >= 0 && argv[i + 1] ? argv[i + 1] : HERE);
  const port = Number(argv.find((a) => /^\d+$/.test(a)) ?? 8015);
  http.createServer(handler(root)).listen(port, () => {
    console.log(`\n  serving ${root} on http://localhost:${port}`);
    console.log(`  every response carries Cache-Control: ${NO_STORE}`);
    console.log(`  so a re-export is visible on a plain reload — no hard refresh needed\n`);
    console.log(`  http://localhost:${port}/architecture/viewer.html\n`);
  });
}
