/**
 * agent-tower classification proxy.
 *
 * The one piece of this project that runs on a server, and the only place the
 * DeepSeek key exists. Clients send a list of agents and get back a list of
 * floors; the key is never sent to them, never logged, and never echoed in an
 * error. `env.DEEPSEEK_API_KEY` is a Cloudflare secret - set it with
 * `wrangler secret put`, never in wrangler.toml.
 *
 * The endpoint is public by necessity (its URL ships in an open-source repo),
 * so it is built to be worthless to anyone but this app: the prompt and the
 * model are fixed here, and the request body is whitelisted down to the fields
 * the prompt uses. There is no way to make it answer an arbitrary question.
 */
import { DEEPSEEK_ENDPOINT, MAX_BATCH, deepseekBody, sanitizeItems } from '../server/classifier/prompt.js';

/** Per-IP budget. Generous for a real tower, useless for scraping. */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
/** A whole batch is 8 agents; nobody legitimately posts more than this. */
const MAX_BODY_BYTES = 32 * 1024;

/**
 * Best-effort limiter, in the isolate's memory.
 *
 * Cloudflare may run several isolates, so this is a speed bump rather than a
 * guarantee - the hard ceiling is the spend limit on the DeepSeek account. It
 * is deliberately dependency-free: no KV namespace, no Durable Object, no beta
 * bindings to keep working.
 */
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const window = hits.get(ip);

  if (!window || now - window.start >= WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    if (hits.size > 10_000) {
      for (const [key, value] of hits) if (now - value.start >= WINDOW_MS) hits.delete(key);
    }
    return false;
  }

  window.count += 1;
  return window.count > MAX_REQUESTS;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      // the tower's own server calls this, but a browser build should work too
      'access-control-allow-origin': '*',
    },
  });
}

/** Fixed text: an upstream error body is never forwarded, in case it quotes the request. */
function fail(status, error) {
  return json({ error }, status);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }

    if (url.pathname === '/health') return json({ ok: true, configured: !!env.DEEPSEEK_API_KEY });
    if (url.pathname !== '/classify') return fail(404, 'not found');
    if (request.method !== 'POST') return fail(405, 'method not allowed');
    if (!env.DEEPSEEK_API_KEY) return fail(503, 'proxy is not configured');

    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (rateLimited(ip)) return fail(429, 'rate limited');

    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_BODY_BYTES) return fail(413, 'body too large');

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail(413, 'body too large');

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail(400, 'body must be JSON');
    }

    // whitelist: only these fields survive, and only MAX_BATCH of them
    const items = sanitizeItems(body?.items);
    if (!items.length) return fail(400, `items must be 1..${MAX_BATCH} agents`);

    let upstream;
    try {
      upstream = await fetch(DEEPSEEK_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        // built locally from the fixed prompt - the caller cannot influence it
        body: JSON.stringify(deepseekBody(items)),
      });
    } catch {
      return fail(502, 'upstream unreachable');
    }

    if (!upstream.ok) {
      // pass the class of failure through so the client can back off, but not the body
      const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 502 : 500;
      return fail(status, 'upstream error');
    }

    const answer = await upstream.json().catch(() => null);
    const text = answer?.choices?.[0]?.message?.content ?? '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail(502, 'upstream returned malformed JSON');
    }

    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    return json({ results });
  },
};
