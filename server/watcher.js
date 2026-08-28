import fs from 'node:fs/promises';
import path from 'node:path';
import chokidar from 'chokidar';
import { TailReader } from './tail-reader.js';
import { parseLine, subagentMeta } from './jsonl.js';

/** Cold start only looks at files touched in the last 30 minutes (plan 2.2). */
export const COLD_WINDOW = 30 * 60_000;
/** Per-file debounce window for `change` bursts. */
export const DEBOUNCE = 120;

/**
 * Decodes a project directory name back into a path.
 * Claude Code slugifies `/Users/x/Desktop/app` into `-Users-x-Desktop-app`.
 */
export function projectNameFromSlug(slug) {
  const parts = String(slug).split('-').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : slug;
}

/**
 * Describes one transcript file: whether it is a main session or a subagent,
 * and which session it belongs to.
 */
export function describeFile(projectsDir, filePath) {
  const rel = path.relative(projectsDir, filePath);
  const parts = rel.split(path.sep);
  if (parts.length < 2 || !filePath.endsWith('.jsonl')) return null;
  const slug = parts[0];
  const project = projectNameFromSlug(slug);

  if (parts.length === 2) {
    return {
      kind: 'session',
      project,
      slug,
      sessionId: path.basename(parts[1], '.jsonl'),
      path: filePath,
    };
  }
  if (parts.length === 4 && parts[2] === 'subagents') {
    const base = path.basename(parts[3], '.jsonl');
    return {
      kind: 'subagent',
      project,
      slug,
      sessionId: parts[1],
      agentId: base.startsWith('agent-') ? base.slice('agent-'.length) : base,
      metaPath: path.join(path.dirname(filePath), `${base}.meta.json`),
      path: filePath,
    };
  }
  return null;
}

/**
 * Watches ~/.claude/projects for appended transcript lines and hands each
 * parsed line to `onLine(line, source)`.
 */
export class TranscriptWatcher {
  constructor({ projectsDir, onLine, onError, coldWindow = COLD_WINDOW, tailBytes }) {
    this.projectsDir = projectsDir;
    this.onLine = onLine;
    this.onError = onError || (() => {});
    this.coldWindow = coldWindow;
    this.tailBytes = tailBytes;
    this.readers = new Map();
    this.timers = new Map();
    this.metaCache = new Map();
    this.parseErrors = 0;
    this.watcher = null;
  }

  async start() {
    const exists = await fs.stat(this.projectsDir).catch(() => null);
    if (!exists) {
      this.onError(new Error(`projects directory not found: ${this.projectsDir}`), 'missing-dir');
      return;
    }

    this.watcher = chokidar.watch(this.projectsDir, {
      ignoreInitial: false,
      depth: 4,
      awaitWriteFinish: false,
      ignored: (p) => p.endsWith('.tmp'),
    });

    this.watcher.on('add', (p) => this.#onAdd(p));
    this.watcher.on('change', (p) => this.#schedule(p));
    this.watcher.on('unlink', (p) => {
      this.readers.delete(p);
      this.metaCache.delete(p);
    });
    this.watcher.on('error', (e) => this.onError(e, 'watch'));

    await new Promise((resolve) => this.watcher.once('ready', resolve));
  }

  async stop() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    await this.watcher?.close();
  }

  async #onAdd(filePath) {
    const source = describeFile(this.projectsDir, filePath);
    if (!source) return;
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) return;

    const reader = new TailReader(filePath);
    this.readers.set(filePath, reader);

    if (Date.now() - stat.mtimeMs > this.coldWindow) {
      // too old to matter: park the reader at EOF so only new writes are read
      reader.offset = stat.size;
      reader.inode = stat.ino;
      reader.started = true;
      return;
    }

    await reader.prime({ tailBytes: this.tailBytes });
    await this.#drain(filePath, source);
  }

  #schedule(filePath) {
    if (this.timers.has(filePath)) return;
    const timer = setTimeout(() => {
      this.timers.delete(filePath);
      const source = describeFile(this.projectsDir, filePath);
      if (source) this.#drain(filePath, source).catch((e) => this.onError(e, 'read'));
    }, DEBOUNCE);
    timer.unref?.();
    this.timers.set(filePath, timer);
  }

  async #drain(filePath, source) {
    let reader = this.readers.get(filePath);
    if (!reader) {
      reader = new TailReader(filePath);
      await reader.prime({ tailBytes: this.tailBytes });
      this.readers.set(filePath, reader);
    }

    const meta = source.kind === 'subagent' ? await this.#meta(source) : null;
    const raws = await reader.read().catch((e) => {
      this.onError(e, 'read');
      return [];
    });

    for (const raw of raws) {
      const line = parseLine(raw);
      if (!line) {
        if (raw.trim()) this.parseErrors += 1;
        continue;
      }
      try {
        this.onLine(line, { ...source, meta });
      } catch (error) {
        this.onError(error, 'ingest');
      }
    }
  }

  /**
   * Reads a subagent's `.meta.json` sidecar. Misses are never cached: the
   * sidecar is written around the same time as the transcript, so an early
   * drain can legitimately see the file before its metadata exists.
   */
  async #meta(source) {
    if (!source.metaPath) return null;
    const cached = this.metaCache.get(source.metaPath);
    if (cached) return cached;
    const text = await fs.readFile(source.metaPath, 'utf8').catch(() => null);
    if (!text) return null;
    let value = null;
    try {
      const parsed = subagentMeta.safeParse(JSON.parse(text));
      value = parsed.success ? parsed.data : null;
    } catch {
      value = null;
    }
    if (value) this.metaCache.set(source.metaPath, value);
    return value;
  }
}
