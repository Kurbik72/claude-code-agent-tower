import path from 'node:path';
import crypto from 'node:crypto';
import { blocksOf, timeOf } from './jsonl.js';

/** Tool names that spawn a subagent. Older builds call it `Task`. */
const SPAWN_TOOLS = new Set(['Agent', 'Task']);

const KEBAB = /[^a-z0-9]+/g;

export function kebab(value) {
  return String(value || '')
    .toLowerCase()
    .replace(KEBAB, '-')
    .replace(/^-+|-+$/g, '');
}

export function shortHash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 4);
}

/** Strip a plugin prefix: `oh-my-claudecode:executor` -> `executor`. */
export function shortType(subagentType) {
  const raw = String(subagentType || '');
  const tail = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : raw;
  return kebab(tail);
}

/** Agent name by the priority in plan 3.2. */
export function agentName({ subagentType, description, name, cwd, sessionId }) {
  const fromType = shortType(subagentType);
  if (fromType) return fromType;
  if (name) return kebab(name);
  if (description) return kebab(description).slice(0, 24).replace(/-+$/, '');
  const project = cwd ? path.basename(cwd) : 'session';
  return `${kebab(project)}·${shortHash(sessionId || cwd || 'x')}`;
}

/** Human-readable label for a tool row: `Read(src/api.ts)`. */
export function toolLabel(name, input) {
  if (!input || typeof input !== 'object') return name;
  const arg =
    input.file_path ||
    input.path ||
    input.pattern ||
    input.command ||
    input.query ||
    input.url ||
    input.description ||
    input.notebook_path;
  if (!arg) return name;
  const text = String(arg).replace(/\s+/g, ' ').trim();
  return `${name}(${text.length > 46 ? `${text.slice(0, 45)}…` : text})`;
}

/** Absolute-looking paths a tool call touched, for the classifier. */
export function filesFromInput(input) {
  if (!input || typeof input !== 'object') return [];
  const out = [];
  for (const key of ['file_path', 'path', 'notebook_path', 'pattern']) {
    if (typeof input[key] === 'string') out.push(input[key]);
  }
  if (typeof input.command === 'string') {
    for (const token of input.command.split(/\s+/)) {
      if (/[/.][\w-]+\.\w{1,5}$/.test(token)) out.push(token);
    }
  }
  return out;
}

function firstText(blocks) {
  for (const b of blocks) {
    if (b.type === 'text' && b.text.trim()) return b.text.trim();
  }
  return '';
}

/**
 * Turns transcript lines into store mutations.
 *
 * One instance per process. It owns the mapping between the `Agent` tool calls
 * seen in a parent transcript and the `subagents/agent-*.jsonl` files that
 * Claude Code writes for the same spawn, so a subagent is counted exactly once
 * whichever of the two the watcher happens to see first.
 */
export class Normalizer {
  constructor(store, { onAgentReady } = {}) {
    this.store = store;
    this.onAgentReady = onAgentReady || (() => {});
    /** spawn key (`sessionId|name`) -> agent id */
    this.spawnKeys = new Map();
    /** parent tool_use id -> agent id */
    this.spawnTools = new Map();
  }

  /**
   * @param {object} line     parsed transcript line
   * @param {object} source   { sessionId, project, kind: 'session'|'subagent', meta }
   */
  ingest(line, source) {
    if (!line || line.isMeta) return;
    const at = timeOf(line);
    const agent = this.#agentFor(line, source, at);
    if (!agent) return;

    if (line.cwd && !agent.cwd) agent.cwd = line.cwd;

    switch (line.type) {
      case 'assistant':
        this.#ingestAssistant(agent, line, at, source);
        break;
      case 'user':
        this.#ingestUser(agent, line, at);
        break;
      case 'system':
        if (line.level === 'error' || line.subtype === 'error') {
          this.store.touch(agent, at, 'error');
        }
        break;
      default:
        break;
    }
  }

  #ingestAssistant(agent, line, at, source) {
    const blocks = blocksOf(line);
    if (line.message?.model && !agent.model) agent.model = line.message.model;
    this.store.addUsage(agent, line.message?.usage);

    let sawToolUse = false;
    for (const block of blocks) {
      if (block.type === 'thinking') {
        for (const para of String(block.thinking).split(/\n{2,}/)) {
          const text = para.trim();
          if (text) this.store.addThinking(agent, text, at);
        }
        this.store.touch(agent, at, 'thinking');
      } else if (block.type === 'text') {
        const text = String(block.text).trim();
        if (text) this.store.addThinking(agent, text, at);
      } else if (block.type === 'tool_use') {
        sawToolUse = true;
        this.store.addToolUse(
          agent,
          { id: block.id, name: block.name, label: toolLabel(block.name, block.input) },
          at,
        );
        for (const f of filesFromInput(block.input)) agent.files.add(f);
        this.store.touch(agent, at, 'tool_use');
        if (SPAWN_TOOLS.has(block.name)) this.#spawn(block, agent, source, at);
      }
    }

    if (!sawToolUse && blocks.some((b) => b.type === 'text')) {
      // a final assistant answer with no tool call: the agent is waiting on a human
      this.store.touch(agent, at, 'answer');
    }
    this.onAgentReady(agent);
  }

  #ingestUser(agent, line, at) {
    const blocks = blocksOf(line);
    let sawResult = false;
    for (const block of blocks) {
      if (block.type !== 'tool_result') continue;
      sawResult = true;
      this.store.resolveTool(agent, block.tool_use_id, block.is_error === true);
      if (block.is_error) {
        const text = typeof block.content === 'string' ? block.content : '';
        if (/does not want to proceed|requires approval|permission/i.test(text)) {
          this.store.markToolWaiting(agent, block.tool_use_id);
        }
      }
      const spawned = this.spawnTools.get(block.tool_use_id);
      if (spawned) {
        // the subagent's Task returned: it closes immediately (plan 3.3)
        this.spawnTools.delete(block.tool_use_id);
        this.store.removeAgent(spawned, 'finished');
      }
      this.store.touch(agent, at, 'tool_result');
    }
    if (!sawResult) {
      const text = firstText(blocks);
      if (text && !text.startsWith('<')) {
        agent.task = text.split('\n')[0].slice(0, 120);
        if (!agent.promptExcerpt) agent.promptExcerpt = text.slice(0, 500);
      }
      this.store.touch(agent, at, 'prompt');
    }
  }

  #spawn(block, parent, source, at) {
    const input = block.input && typeof block.input === 'object' ? block.input : {};
    const sessionId = source.sessionId || parent.sessionId;
    const keys = [input.name, input.description]
      .filter(Boolean)
      .map((k) => `${sessionId}|${k}`);

    let agentId = keys.map((k) => this.spawnKeys.get(k)).find(Boolean);
    if (!agentId) {
      agentId = `a:${block.id}`;
      const created = this.store.upsertAgent({
        id: agentId,
        kind: 'subagent',
        name: agentName({
          subagentType: input.subagent_type,
          description: input.description,
          name: input.name,
        }),
        role: shortType(input.subagent_type) || 'agent',
        subagentType: input.subagent_type || '',
        project: source.project,
        cwd: parent.cwd,
        sessionId,
        model: input.model || '',
        task: input.description || '',
        promptExcerpt: String(input.prompt || '').slice(0, 500),
        at,
      });
      this.onAgentReady(created);
    }
    for (const key of keys) this.spawnKeys.set(key, agentId);
    this.spawnTools.set(block.id, agentId);
  }

  #agentFor(line, source, at) {
    if (source.kind === 'subagent') {
      const meta = source.meta || {};
      // The transcript's own agentId is the stable identity; the meta name is
      // an alias so the parent's `Agent` tool call resolves to the same record
      // whichever of the two the watcher sees first.
      const idKey = `${source.sessionId}|#${source.agentId}`;
      const aliases = [meta.name, meta.description]
        .filter(Boolean)
        .map((k) => `${source.sessionId}|${k}`);

      let agentId =
        this.spawnKeys.get(idKey) || aliases.map((k) => this.spawnKeys.get(k)).find(Boolean);
      if (!agentId) agentId = `a:${source.sessionId}:${source.agentId}`;
      this.spawnKeys.set(idKey, agentId);
      for (const key of aliases) this.spawnKeys.set(key, agentId);

      return this.store.upsertAgent({
        id: agentId,
        kind: 'subagent',
        name: agentName({
          subagentType: meta.agentType,
          description: meta.description,
          name: meta.name,
          cwd: line.cwd,
          sessionId: source.agentId,
        }),
        role: shortType(meta.agentType) || 'agent',
        subagentType: meta.agentType || '',
        project: source.project,
        cwd: line.cwd,
        sessionId: source.sessionId,
        model: meta.model || '',
        task: meta.description || '',
        at,
      });
    }

    const agent = this.store.upsertAgent({
      id: `s:${source.sessionId}`,
      kind: 'session',
      name: agentName({ cwd: line.cwd || source.cwd, sessionId: source.sessionId }),
      role: source.project,
      project: source.project,
      cwd: line.cwd || source.cwd,
      sessionId: source.sessionId,
      at,
    });

    // The directory slug maps both "/" and "-" to "-", so it cannot be decoded
    // back into a path: once a line carries its own cwd, that is the authority
    // for the project and for the agent's name. Not every line has one, hence
    // the correction here rather than in the spec above.
    if (line.cwd) {
      const project = path.basename(line.cwd);
      agent.project = project;
      agent.role = project;
      // a session name already ends in its own session hash, so it is unique
      agent.name = agentName({ cwd: line.cwd, sessionId: source.sessionId });
    }
    return agent;
  }
}
