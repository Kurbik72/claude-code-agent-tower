import { EventEmitter } from 'node:events';
import {
  FLOORS,
  FLOOR_BY_KEY,
  OVERFLOW_FLOOR_ID,
  floorById,
  slotsOf,
} from './floors.js';

/** Status thresholds, in ms (plan 3.3). */
export const WORK_WINDOW = 60_000;
export const WAIT_WINDOW = 15 * 60_000;
export const LEAVE_AFTER = 30 * 60_000;
/**
 * An agent that finished its turn — a final assistant answer with no tool call —
 * and then stayed quiet has nothing left to do: it gets up and rides the lift
 * down without waiting out the full idle timeout. A subagent leaves the moment
 * its Task returns, so this is the session's equivalent of the same event.
 */
export const DONE_AFTER = 3 * 60_000;

/** Per-agent retention caps (plan 6). */
const MAX_THINKING = 200;
const MAX_TOOLS = 100;
/** Event feed ring buffer (plan 10). */
const MAX_EVENTS = 300;

/**
 * Context windows a Claude Code session can be running with.
 *
 * The model id alone does not say which one is in play — the same model runs
 * with a 200k or a 1M window depending on how the session was started — so the
 * limit is the smallest standard window that actually fits what we have seen.
 */
const CONTEXT_WINDOWS = [200_000, 1_000_000];

export function contextLimitFor(model, observed = 0) {
  const fits = CONTEXT_WINDOWS.find((limit) => observed <= limit);
  return fits ?? CONTEXT_WINDOWS[CONTEXT_WINDOWS.length - 1];
}

/**
 * In-memory world state: every live agent, where it sits, what it is doing and
 * the event feed. Emits `patch` for every incremental change; the SSE layer
 * turns those into wire messages.
 */
export class Store extends EventEmitter {
  constructor({ now = () => Date.now() } = {}) {
    super();
    this.now = now;
    this.agents = new Map();
    this.events = [];
    this.eventSeq = 0;
    this.parseErrors = 0;
    this.focused = new Set();
    this.warnings = [];
    this.startedAt = this.now();
  }

  // ---------------------------------------------------------------- agents

  /** Create an agent if it is new; returns the record either way. */
  upsertAgent(spec) {
    const existing = this.agents.get(spec.id);
    if (existing) {
      let changed = false;
      for (const key of ['role', 'project', 'cwd', 'task', 'model', 'subagentType']) {
        if (spec[key] != null && spec[key] !== existing[key]) {
          existing[key] = spec[key];
          changed = true;
        }
      }
      if (spec.name && spec.name !== existing.name) {
        const next = this.#uniqueName(spec.name, existing.id, existing.id);
        if (next !== existing.name) {
          existing.name = next;
          changed = true;
        }
      }
      if (changed) this.#patch('agent.update', this.publicAgent(existing));
      return existing;
    }

    const agent = {
      id: spec.id,
      kind: spec.kind || 'session',
      name: spec.name || spec.id.slice(0, 12),
      role: spec.role || '',
      subagentType: spec.subagentType || '',
      project: spec.project || '',
      cwd: spec.cwd || '',
      sessionId: spec.sessionId || '',
      task: spec.task || '',
      model: spec.model || '',
      status: 'work',
      lastKind: 'text',
      createdAt: spec.at ?? this.now(),
      lastEventAt: spec.at ?? this.now(),
      closed: false,
      floorId: null,
      slotIndex: -1,
      x: 0,
      y: 0,
      z: 0,
      classification: null,
      unknownFloor: true,
      thinking: [],
      thinkingSeq: 0,
      tools: [],
      toolIndex: new Map(),
      usage: { input: 0, output: 0, cacheRead: 0, contextPct: 0 },
      tokens: 0,
      files: new Set(),
      toolNames: new Set(),
      promptExcerpt: spec.promptExcerpt || '',
      reclassifiedAt: 0,
    };

    agent.name = this.#uniqueName(agent.name, agent.id);
    this.agents.set(agent.id, agent);
    this.place(agent, FLOOR_BY_KEY.unknown, { silent: true });
    this.#patch('agent.enter', this.publicAgent(agent));
    this.pushEvent('agent.enter', { name: agent.name, floor: floorById(agent.floorId)?.num });
    // the shift counter and the lit-floor tally move the moment somebody
    // walks in, not five seconds later when a status happens to change
    this.emitStats();
    return agent;
  }

  /**
   * Two agents of the same `subagent_type` would otherwise share a name, so a
   * collision gets a short stable suffix rather than a second identical label.
   */
  #uniqueName(name, id, exceptId = null) {
    const taken = new Set(
      [...this.agents.values()].filter((a) => a.id !== exceptId).map((a) => a.name),
    );
    if (!taken.has(name)) return name;
    for (let n = 2; n < 100; n++) {
      const candidate = `${name}-${n}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${name}-${id.slice(-4)}`;
  }

  getAgent(id) {
    return this.agents.get(id) || null;
  }

  /** Remove an agent from the world (idle timeout, or its Task returned). */
  removeAgent(id, reason = 'idle') {
    const agent = this.agents.get(id);
    if (!agent) return;
    this.agents.delete(id);
    this.#patch('agent.leave', { id, reason });
    this.pushEvent('agent.leave', { name: agent.name, reason });
    this.rebalance();
    this.emitStats();
  }

  /**
   * A session went away — its transcript was deleted — so everybody who belongs
   * to it goes with it, subagents included: their transcripts live inside the
   * session's own directory and cannot outlive it.
   */
  removeSession(sessionId, reason = 'closed') {
    if (!sessionId) return 0;
    const doomed = [...this.agents.values()].filter(
      (a) => a.sessionId === sessionId || a.id === `s:${sessionId}`,
    );
    for (const agent of doomed) this.removeAgent(agent.id, reason);
    return doomed.length;
  }

  // ----------------------------------------------------------- placement

  /**
   * Seat an agent on a floor. A full floor pushes its `wait` agents down to
   * floor 00 first; `work` agents keep their seat (plan 5.2).
   */
  place(agent, floorId, { silent = false, reason = '' } = {}) {
    const target = floorById(floorId) ? floorId : FLOOR_BY_KEY.unknown;
    const previous = agent.floorId;
    // already seated on the right floor: keep the seat, agents should not hop
    if (previous === target && agent.slotIndex >= 0) return agent;
    let seat = this.#freeSlot(target);

    if (!seat && agent.status === 'work') {
      const victim = [...this.agents.values()]
        .filter((a) => a.floorId === target && a.id !== agent.id && a.status !== 'work')
        .sort((a, b) => a.lastEventAt - b.lastEventAt)[0];
      if (victim) {
        this.#seat(victim, OVERFLOW_FLOOR_ID, this.#freeSlot(OVERFLOW_FLOOR_ID));
        this.#patch('agent.move', this.publicAgent(victim));
        seat = this.#freeSlot(target);
      }
    }

    if (!seat) {
      seat = this.#freeSlot(OVERFLOW_FLOOR_ID);
      if (seat) {
        this.#seat(agent, OVERFLOW_FLOOR_ID, seat);
        if (!silent && previous !== agent.floorId) {
          this.#patch('agent.move', this.publicAgent(agent));
        }
        return agent;
      }
      // Everything is full: park the agent on the target floor without a seat.
      this.#seat(agent, target, null);
      return agent;
    }

    this.#seat(agent, target, seat);
    if (!silent && previous && previous !== target) {
      this.#patch('agent.move', this.publicAgent(agent));
      this.pushEvent('agent.move', {
        name: agent.name,
        floor: floorById(target)?.num,
        reason,
      });
      // a move empties one floor and lights another
      this.emitStats();
    }
    return agent;
  }

  #seat(agent, floorId, slot) {
    agent.floorId = floorId;
    agent.slotIndex = slot ? slot.index : -1;
    agent.x = slot ? slot.x : 380;
    agent.y = slot ? slot.y : 380;
    agent.z = slot ? slot.z : 380;
  }

  #freeSlot(floorId) {
    const taken = new Set(
      [...this.agents.values()].filter((a) => a.floorId === floorId).map((a) => a.slotIndex),
    );
    return slotsOf(floorId).find((s) => !taken.has(s.index)) || null;
  }

  /** Pull agents back off floor 00 once their own floor has room again. */
  rebalance() {
    const stranded = [...this.agents.values()].filter((a) => a.floorId === OVERFLOW_FLOOR_ID);
    for (const agent of stranded) {
      const home = this.homeFloor(agent);
      if (home === OVERFLOW_FLOOR_ID) continue;
      const seat = this.#freeSlot(home);
      if (!seat) continue;
      this.#seat(agent, home, seat);
      this.#patch('agent.move', this.publicAgent(agent));
    }
  }

  homeFloor(agent) {
    const key = agent.classification?.floor;
    return FLOOR_BY_KEY[key] || FLOOR_BY_KEY.unknown;
  }

  /** Apply a classification result and move the agent if its floor changed. */
  classify(agentId, result) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    agent.classification = result;
    agent.unknownFloor = result.floor === 'unknown';
    const target = this.homeFloor(agent);
    if (agent.floorId !== target) {
      this.place(agent, target, { reason: result.reason });
    } else {
      this.#patch('agent.update', this.publicAgent(agent));
    }
  }

  // -------------------------------------------------------------- content

  touch(agent, at, kind) {
    agent.lastEventAt = at;
    agent.lastKind = kind;
  }

  addThinking(agent, text, at) {
    if (!text) return;
    // The counter is monotonic rather than derived from the array length: once
    // the 200-line cap starts shifting, `length` stops growing and every new
    // line would be handed the id of the one before it.
    const line = { id: `${agent.id}:t${agent.thinkingSeq++}`, text, at };
    agent.thinking.push(line);
    if (agent.thinking.length > MAX_THINKING) agent.thinking.shift();
    if (this.focused.has(agent.id)) {
      this.#patch('thinking.append', { agentId: agent.id, line });
    }
  }

  addToolUse(agent, { id, name, label }, at) {
    const row = { id, name, label, status: 'идёт', at };
    agent.tools.push(row);
    agent.toolIndex.set(id, row);
    agent.toolNames.add(name);
    if (agent.tools.length > MAX_TOOLS) {
      const dropped = agent.tools.shift();
      agent.toolIndex.delete(dropped.id);
    }
    if (this.focused.has(agent.id)) this.#patch('tools.update', { agentId: agent.id, row });
  }

  resolveTool(agent, toolUseId, isError) {
    const row = agent.toolIndex.get(toolUseId);
    if (!row) return;
    row.status = isError ? 'упал' : 'ок';
    if (this.focused.has(agent.id)) this.#patch('tools.update', { agentId: agent.id, row });
  }

  markToolWaiting(agent, toolUseId) {
    const row = agent.toolIndex.get(toolUseId);
    if (!row) return;
    row.status = 'ждёт';
    if (this.focused.has(agent.id)) this.#patch('tools.update', { agentId: agent.id, row });
  }

  addUsage(agent, usage) {
    if (!usage) return;
    const input = usage.input_tokens || 0;
    const cacheRead = usage.cache_read_input_tokens || 0;
    const cacheCreate = usage.cache_creation_input_tokens || 0;
    agent.usage.input = input;
    agent.usage.cacheRead = cacheRead;
    agent.usage.output += usage.output_tokens || 0;
    agent.tokens = agent.usage.output;
    const used = input + cacheRead + cacheCreate;
    const limit = contextLimitFor(agent.model, used);
    agent.usage.contextPct = Math.min(100, Math.round((used / limit) * 100));
  }

  // -------------------------------------------------------------- statuses

  /**
   * Recompute every agent's status from `lastEventAt` alone — no disk access
   * (plan 3.3). Returns the ids whose status changed.
   */
  refreshStatuses(now = this.now()) {
    const changed = [];
    const gone = [];
    for (const agent of this.agents.values()) {
      const idle = now - agent.lastEventAt;
      let next;
      if (agent.lastKind === 'error') next = 'dead';
      else if (idle >= WAIT_WINDOW) next = 'dead';
      else if (agent.lastKind === 'answer') next = 'wait';
      else if (idle >= WORK_WINDOW) next = 'wait';
      else next = 'work';

      if (next !== agent.status) {
        agent.status = next;
        changed.push(agent.id);
        this.#patch('agent.update', this.publicAgent(agent));
        if (next === 'dead') this.pushEvent('agent.dead', { name: agent.name });
      }
      // an agent that answered and then went quiet has finished its work: it
      // stands up and leaves rather than sitting out the full idle timeout
      if (idle >= LEAVE_AFTER) gone.push([agent.id, 'idle']);
      else if (agent.lastKind === 'answer' && idle >= DONE_AFTER) {
        gone.push([agent.id, 'finished']);
      }
    }
    for (const [id, reason] of gone) this.removeAgent(id, reason);
    if (changed.length || gone.length) this.emitStats();
    return changed;
  }

  // ---------------------------------------------------------------- events

  pushEvent(kind, params = {}) {
    const entry = { id: ++this.eventSeq, at: this.now(), kind, params };
    this.events.unshift(entry);
    if (this.events.length > MAX_EVENTS) this.events.pop();
    this.#patch('event.append', entry);
    return entry;
  }

  warn(code, params = {}) {
    if (this.warnings.some((w) => w.code === code)) return;
    this.warnings.push({ code, params });
    this.pushEvent('warn', { code, ...params });
  }

  // ----------------------------------------------------------------- views

  stats() {
    const agents = [...this.agents.values()];
    const perFloor = new Map();
    for (const a of agents) perFloor.set(a.floorId, (perFloor.get(a.floorId) || 0) + 1);
    const overflowUsed = (perFloor.get(OVERFLOW_FLOOR_ID) || 0) > 0;
    const visible = FLOORS.filter((f) => !f.overflow || overflowUsed);
    const lit = visible.filter((f) => (perFloor.get(f.id) || 0) > 0).length;
    return {
      shift: agents.filter((a) => a.status !== 'dead').length,
      lit,
      dark: visible.length - lit,
      floorCount: visible.length,
      tokens: agents.reduce((sum, a) => sum + a.tokens, 0),
      events: this.events.length,
      projects: new Set(agents.map((a) => a.project).filter(Boolean)).size,
      overflowUsed,
      parseErrors: this.parseErrors,
    };
  }

  emitStats() {
    this.#patch('stats.update', this.stats());
  }

  publicAgent(agent) {
    return {
      id: agent.id,
      kind: agent.kind,
      name: agent.name,
      role: agent.role,
      project: agent.project,
      task: agent.task,
      status: agent.status,
      floorId: agent.floorId,
      slotIndex: agent.slotIndex,
      x: agent.x,
      y: agent.y,
      z: agent.z,
      unknownFloor: agent.unknownFloor,
      classification: agent.classification,
      tokens: agent.tokens,
      contextPct: agent.usage.contextPct,
      lastEventAt: agent.lastEventAt,
    };
  }

  /** Everything a freshly connected browser needs (plan 2.3). */
  snapshot() {
    const overflowUsed = this.stats().overflowUsed;
    return {
      floors: FLOORS.filter((f) => !f.overflow || overflowUsed).map((f) => ({
        id: f.id,
        num: f.num,
        key: f.key,
        top: f.top,
        tone: f.tone,
        noWhip: !!f.noWhip,
        overflow: !!f.overflow,
        capacity: slotsOf(f.id).length,
      })),
      agents: [...this.agents.values()].map((a) => this.publicAgent(a)),
      events: this.events.slice(0, 200),
      stats: this.stats(),
      warnings: this.warnings,
      serverTime: this.now(),
    };
  }

  /** Accumulated thinking and tools for one agent (inspector open). */
  agentDetail(id) {
    const agent = this.agents.get(id);
    if (!agent) return null;
    return {
      agentId: id,
      thinking: agent.thinking.slice(-MAX_THINKING),
      tools: agent.tools.slice(-MAX_TOOLS),
      contextPct: agent.usage.contextPct,
    };
  }

  focus(id, on) {
    if (on) this.focused.add(id);
    else this.focused.delete(id);
  }

  #patch(type, data) {
    this.emit('patch', { type, data });
  }
}
