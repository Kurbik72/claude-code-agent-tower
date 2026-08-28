/**
 * Wire layer between the store and the browser (plan 2.3).
 *
 * Every patch gets a monotonic id and is kept in a 500-entry ring buffer so a
 * reconnect carrying `Last-Event-ID` can be replayed; an id that has already
 * scrolled out of the buffer gets a `resync` instead.
 */

const RING = 500;
/** Patches about the same agent coalesce inside this window. */
const THROTTLE = 100;

export class Hub {
  constructor(store) {
    this.store = store;
    this.seq = 0;
    this.ring = [];
    this.clients = new Set();
    this.pending = new Map();
    this.timer = null;
    store.on('patch', (patch) => this.push(patch));
  }

  push(patch) {
    const key = coalesceKey(patch);
    if (!key) {
      this.#emit(patch);
      return;
    }
    this.pending.set(key, patch);
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const batch = [...this.pending.values()];
      this.pending.clear();
      for (const item of batch) this.#emit(item);
    }, THROTTLE);
    this.timer.unref?.();
  }

  #emit(patch) {
    const message = { id: ++this.seq, type: patch.type, data: patch.data };
    this.ring.push(message);
    if (this.ring.length > RING) this.ring.shift();
    for (const client of this.clients) client(message);
  }

  /** Messages after `lastId`, or null when the client must resync. */
  replay(lastId) {
    if (!lastId) return [];
    const id = Number(lastId);
    if (!Number.isFinite(id)) return [];
    if (id >= this.seq) return [];
    const oldest = this.ring[0]?.id ?? this.seq + 1;
    if (id < oldest - 1) return null;
    return this.ring.filter((m) => m.id > id);
  }

  add(client) {
    this.clients.add(client);
    return () => this.clients.delete(client);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.clients.clear();
  }
}

function coalesceKey(patch) {
  switch (patch.type) {
    case 'agent.update':
    case 'agent.move':
      return `${patch.type}:${patch.data.id}`;
    case 'stats.update':
      return 'stats';
    default:
      return null;
  }
}
