import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

/** Persistent classification cache: ~/.agent-tower/classify-cache.json, TTL 30 days. */
const TTL = 30 * 24 * 60 * 60 * 1000;
const FLUSH_DELAY = 2000;

export function cacheKey(input) {
  const exts = [...new Set((input.files || []).map((f) => path.extname(f).toLowerCase()))].sort();
  const payload = [
    input.subagentType || '',
    input.agentDoc?.description || '',
    [...(input.tools || [])].sort().join(','),
    exts.join(','),
  ].join('|');
  return crypto.createHash('sha1').update(payload).digest('hex');
}

export class ClassifyCache {
  constructor(file) {
    this.file = file;
    this.map = new Map();
    this.timer = null;
  }

  async load() {
    const text = await fs.readFile(this.file, 'utf8').catch(() => null);
    if (!text) return;
    try {
      const raw = JSON.parse(text);
      const now = Date.now();
      for (const [key, entry] of Object.entries(raw)) {
        if (entry && now - entry.at < TTL) this.map.set(key, entry);
      }
    } catch {
      // a corrupt cache is not worth failing over
    }
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at >= TTL) {
      this.map.delete(key);
      return null;
    }
    return entry.result;
  }

  set(key, result) {
    this.map.set(key, { at: Date.now(), result });
    this.#scheduleFlush();
  }

  #scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch(() => {});
    }, FLUSH_DELAY);
    this.timer.unref?.();
  }

  async flush() {
    const out = Object.fromEntries(this.map);
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(out), { mode: 0o600 });
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
