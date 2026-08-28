import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { Store } from './store.js';
import { Normalizer } from './normalizer.js';
import { TranscriptWatcher } from './watcher.js';
import { Classifier } from './classifier/index.js';
import { Hub } from './sse.js';
import { CACHE_FILE, DEFAULT_PROJECTS_DIR } from './config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.join(here, '..', 'web', 'dist');

/** Statuses are recomputed from memory on this cadence (plan 3.3). */
const STATUS_TICK = 5000;

/**
 * Wires the whole pipeline together and returns a started Fastify instance.
 * The server binds 127.0.0.1 only and has no CORS: transcripts contain full
 * prompts and source code, so nothing leaves the machine.
 */
export async function createServer({
  projectsDir = DEFAULT_PROJECTS_DIR,
  deepseekKey = '',
  noAi = false,
  logger = false,
} = {}) {
  const store = new Store();
  const classifier = new Classifier(store, {
    apiKey: deepseekKey,
    cacheFile: CACHE_FILE,
    enabled: !noAi,
  });
  await classifier.init();

  const normalizer = new Normalizer(store, {
    onAgentReady: (agent) => {
      classifier.consider(agent).catch(() => {});
    },
  });

  const watcher = new TranscriptWatcher({
    projectsDir,
    onLine: (line, source) => normalizer.ingest(line, source),
    // A deleted session transcript is the one unambiguous "session closed" the
    // format gives us; a subagent file going away means nothing on its own,
    // because its Task returning has already sent that agent home.
    onGone: (source) => {
      if (source.kind === 'session') store.removeSession(source.sessionId, 'closed');
    },
    onError: (error, kind) => {
      if (kind === 'missing-dir') store.warn('projects.missing', { dir: projectsDir });
      else store.warn(`watch.${kind}`, { message: String(error.message || error) });
    },
  });

  store.pushEvent('tower.up', {});
  await watcher.start();

  const hub = new Hub(store);
  const statusTimer = setInterval(() => {
    store.parseErrors = watcher.parseErrors;
    store.refreshStatuses();
  }, STATUS_TICK);
  statusTimer.unref?.();

  const app = Fastify({ logger });

  const hasWeb = await fs.stat(WEB_DIST).then(() => true, () => false);
  if (hasWeb) {
    await app.register(fastifyStatic, { root: WEB_DIST, index: ['index.html'] });
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith('/api/')) return reply.code(404).send({ error: 'not found' });
      return reply.sendFile('index.html');
    });
  }

  app.get('/api/state', async () => store.snapshot());

  app.get('/api/agents/:id', async (request, reply) => {
    const detail = store.agentDetail(request.params.id);
    if (!detail) return reply.code(404).send({ error: 'unknown agent' });
    return detail;
  });

  /** Turn the thinking/tool stream for one agent on or off (plan 2.3). */
  app.post('/api/focus/:id', async (request, reply) => {
    const { id } = request.params;
    const on = request.body?.on !== false;
    store.focus(id, on);
    if (!on) return { ok: true };
    const detail = store.agentDetail(id);
    if (!detail) return reply.code(404).send({ error: 'unknown agent' });
    return detail;
  });

  app.get('/api/stream', (request, reply) => {
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });

    const send = (message) => {
      reply.raw.write(`id: ${message.id}\n`);
      reply.raw.write(`event: ${message.type}\n`);
      reply.raw.write(`data: ${JSON.stringify(message.data)}\n\n`);
    };

    const lastId = request.headers['last-event-id'];
    const backlog = hub.replay(lastId);
    if (backlog === null) {
      reply.raw.write('event: resync\ndata: {}\n\n');
    } else {
      for (const message of backlog) send(message);
    }

    const remove = hub.add(send);
    const ping = setInterval(() => reply.raw.write(': ping\n\n'), 25_000);
    ping.unref?.();

    request.raw.on('close', () => {
      clearInterval(ping);
      remove();
    });
  });

  app.addHook('onClose', async () => {
    clearInterval(statusTimer);
    hub.stop();
    classifier.stop();
    await watcher.stop();
  });

  return { app, store, hub, watcher, classifier, normalizer, hasWeb };
}

/** Bind to the first free port at or above `port`. */
export async function listen(app, port, host = '127.0.0.1', attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try {
      const address = await app.listen({ port: port + i, host });
      return address;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(`no free port in ${port}..${port + attempts - 1}`);
}
