import { classifyHeuristic } from './heuristic.js';
import { loadAgentDoc } from './agent-docs.js';
import { ClassifyCache, cacheKey } from './cache.js';
import { classifyBatch } from './deepseek.js';

const BATCH_WINDOW = 400;
const BATCH_SIZE = 8;
const MAX_INFLIGHT = 4;
const RETRIES = 3;
/** A re-ask is allowed once, if the agent's evidence changed radically. */
const RECHECK_AFTER = 30_000;
const RECHECK_OVERLAP = 0.4;

/**
 * Agent classification pipeline (plan 4).
 *
 * The heuristic answers immediately and unconditionally; DeepSeek, when a key
 * is configured, refines the answer in batches and its verdicts are cached on
 * disk so repeated pipeline runs cost one call.
 */
export class Classifier {
  constructor(store, { apiKey = '', cacheFile, enabled = true, fetchImpl = fetch } = {}) {
    this.store = store;
    this.apiKey = apiKey;
    this.enabled = enabled && !!apiKey;
    this.fetchImpl = fetchImpl;
    this.cache = cacheFile ? new ClassifyCache(cacheFile) : null;
    this.queue = new Map();
    this.timer = null;
    this.inflight = 0;
    this.seen = new Map();
  }

  async init() {
    if (this.cache) await this.cache.load();
    if (!this.enabled) this.store.warn('classifier.offline');
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.cache?.stop();
  }

  /**
   * Called whenever an agent produced new evidence.
   *
   * The heuristic is free, so it re-runs on every call and keeps improving as
   * tools and files accumulate. Only the paid DeepSeek call is throttled: once
   * per agent, plus at most one re-ask after 30s if the evidence changed
   * radically (plan 4.3).
   */
  async consider(agent) {
    const evidence = this.#evidence(agent);
    evidence.agentDoc = await this.#doc(agent);

    const heuristic = classifyHeuristic(evidence);
    const current = agent.classification;
    const heuristicOwnsIt = !current || current.source === 'heuristic';
    if (heuristicOwnsIt && (!current || current.floor !== heuristic.floor)) {
      this.store.classify(agent.id, heuristic);
    }

    if (!this.enabled) return;

    const previous = this.seen.get(agent.id);
    if (!previous) {
      this.seen.set(agent.id, { at: Date.now(), tools: new Set(evidence.tools) });
      await this.#ask(agent, evidence);
      return;
    }

    if (agent.reclassifiedAt) return;
    if (Date.now() - previous.at < RECHECK_AFTER) return;

    const now = new Set(evidence.tools);
    if (intersectionRatio(previous.tools, now) >= RECHECK_OVERLAP) return;

    agent.reclassifiedAt = Date.now();
    this.seen.set(agent.id, { at: Date.now(), tools: now });
    await this.#ask(agent, evidence, { force: true });
  }

  async #doc(agent) {
    if (agent.agentDocLoaded) return agent.agentDoc;
    agent.agentDoc = await loadAgentDoc(agent.subagentType, agent.cwd);
    agent.agentDocLoaded = true;
    return agent.agentDoc;
  }

  #evidence(agent) {
    return {
      id: agent.id,
      agentName: agent.name,
      subagentType: agent.subagentType,
      description: agent.task,
      promptExcerpt: agent.promptExcerpt,
      tools: [...agent.toolNames],
      files: [...agent.files].slice(0, 20),
      cwd: agent.cwd,
    };
  }

  async #ask(agent, evidence, { force = false } = {}) {
    const key = cacheKey(evidence);
    const cached = !force && this.cache?.get(key);
    if (cached) {
      this.store.classify(agent.id, { ...cached, source: 'cache' });
      return;
    }
    this.queue.set(agent.id, { evidence, key });
    this.#schedule();
  }

  #schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.#drain().catch(() => {});
    }, BATCH_WINDOW);
    this.timer.unref?.();
  }

  async #drain() {
    while (this.queue.size && this.inflight < MAX_INFLIGHT) {
      const slice = [...this.queue.entries()].slice(0, BATCH_SIZE);
      for (const [id] of slice) this.queue.delete(id);
      this.inflight += 1;
      this.#send(slice).finally(() => {
        this.inflight -= 1;
        if (this.queue.size) this.#schedule();
      });
    }
    if (this.queue.size) this.#schedule();
  }

  async #send(slice) {
    const items = slice.map(([, v]) => v.evidence);
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      try {
        const results = await classifyBatch(items, {
          apiKey: this.apiKey,
          fetchImpl: this.fetchImpl,
        });
        for (const [id, entry] of slice) {
          const result = results.get(id);
          if (!result) continue;
          this.cache?.set(entry.key, result);
          this.store.classify(id, result);
        }
        return;
      } catch (error) {
        const retriable = !error.status || error.status === 429 || error.status >= 500;
        if (!retriable || attempt === RETRIES - 1) {
          this.store.warn('classifier.degraded', { message: String(error.message || error) });
          return;
        }
        await sleep(2 ** attempt * 600);
      }
    }
  }
}

function intersectionRatio(a, b) {
  if (!a.size && !b.size) return 1;
  let shared = 0;
  for (const value of b) if (a.has(value)) shared += 1;
  const union = new Set([...a, ...b]).size;
  return union ? shared / union : 1;
}

function sleep(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });
}

export { classifyHeuristic };
