/**
 * Everything both sides of the wire need to agree on.
 *
 * This module is imported by the local classifier *and* bundled into the
 * Cloudflare worker, so it must stay pure ESM: no node builtins, no zod, no
 * dependencies at all. If the prompt lived in two places it would drift, and a
 * drifted prompt is a silently wrong floor.
 */

export const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
export const MODEL = 'deepseek-chat';
export const CONFIDENCE_FLOOR = 0.55;

/** The proxy refuses anything larger; the client batches to match. */
export const MAX_BATCH = 8;

export const FLOORS = ['frontend', 'testers', 'qa', 'devops', 'backend', 'unknown'];

export const SYSTEM = `You place software agents into one of five floors of an office building.
floors: frontend (UI, styling, components), testers (writing and running tests),
qa (review, verification, audit, linting), devops (CI, deploy, containers, infra),
backend (APIs, databases, queues, server code).
Answer with JSON only: {"results":[{"id":string,"floor":string,"confidence":number,"reason":string}]}.
"reason" must be at most 80 characters. Use "unknown" when the evidence is thin.`;

const LIMITS = {
  id: 64,
  agentName: 80,
  subagentType: 64,
  description: 300,
  agentDoc: 300,
  tool: 40,
  file: 200,
  promptExcerpt: 500,
};
const MAX_LIST = 20;

function str(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function list(value, max, cap) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string').slice(0, max).map((v) => v.slice(0, cap));
}

/**
 * Clamp one batch down to the shape the prompt actually uses.
 *
 * The proxy runs this on untrusted input, so it is a whitelist: anything not
 * named here is dropped. That is what stops the public endpoint from being
 * repurposed as a general-purpose model — a caller cannot smuggle their own
 * text through in a field we forward verbatim.
 */
export function sanitizeItems(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === 'object' && typeof item.id === 'string' && item.id)
    .slice(0, MAX_BATCH)
    .map((item) => ({
      id: str(item.id, LIMITS.id),
      agentName: str(item.agentName, LIMITS.agentName),
      subagentType: str(item.subagentType, LIMITS.subagentType),
      description: str(item.description, LIMITS.description),
      agentDoc: item.agentDoc?.description
        ? { description: str(item.agentDoc.description, LIMITS.agentDoc) }
        : undefined,
      tools: list(item.tools, MAX_LIST, LIMITS.tool),
      files: list(item.files, MAX_LIST, LIMITS.file),
      promptExcerpt: str(item.promptExcerpt, LIMITS.promptExcerpt),
    }));
}

export function promptFor(items) {
  return items
    .map((item) => {
      const lines = [
        `id: ${item.id}`,
        `name: ${item.agentName}`,
        item.subagentType ? `type: ${item.subagentType}` : null,
        item.description ? `task: ${item.description}` : null,
        item.agentDoc?.description ? `definition: ${item.agentDoc.description}` : null,
        item.tools?.length ? `tools: ${item.tools.slice(0, MAX_LIST).join(', ')}` : null,
        item.files?.length ? `files: ${item.files.slice(0, MAX_LIST).join(', ')}` : null,
        item.promptExcerpt ? `prompt: ${item.promptExcerpt.slice(0, LIMITS.promptExcerpt)}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n---\n');
}

/** The exact body sent upstream. Built here so the proxy cannot be told what to ask. */
export function deepseekBody(items) {
  return {
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: promptFor(items) },
    ],
  };
}
