import { z } from 'zod';

/**
 * Schemas for Claude Code transcript lines.
 *
 * Transcripts are append-only JSONL under ~/.claude/projects/<slug>/<session>.jsonl,
 * with subagent transcripts in <session>/subagents/agent-<agentId>.jsonl.
 * The format carries far more than we need, so every schema is deliberately
 * loose: unknown keys pass through and anything we do not understand is skipped.
 */

const contentBlock = z.union([
  z.object({ type: z.literal('text'), text: z.string().default('') }).passthrough(),
  z.object({ type: z.literal('thinking'), thinking: z.string().default('') }).passthrough(),
  z
    .object({
      type: z.literal('tool_use'),
      id: z.string(),
      name: z.string(),
      input: z.unknown().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal('tool_result'),
      tool_use_id: z.string(),
      is_error: z.boolean().optional(),
      content: z.unknown().optional(),
    })
    .passthrough(),
  z.object({ type: z.string() }).passthrough(),
]);

const usage = z
  .object({
    input_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
    cache_read_input_tokens: z.number().optional(),
    cache_creation_input_tokens: z.number().optional(),
  })
  .passthrough();

const message = z
  .object({
    role: z.string().optional(),
    model: z.string().optional(),
    content: z.union([z.string(), z.array(contentBlock)]).optional(),
    usage: usage.optional(),
  })
  .passthrough();

export const transcriptLine = z
  .object({
    type: z.string(),
    uuid: z.string().optional(),
    parentUuid: z.string().nullable().optional(),
    sessionId: z.string().optional(),
    agentId: z.string().optional(),
    isSidechain: z.boolean().optional(),
    isMeta: z.boolean().optional(),
    timestamp: z.string().optional(),
    cwd: z.string().optional(),
    gitBranch: z.string().optional(),
    version: z.string().optional(),
    message: message.optional(),
    toolUseResult: z.unknown().optional(),
    subtype: z.string().optional(),
    level: z.string().optional(),
  })
  .passthrough();

/** Sidecar written next to a subagent transcript. */
export const subagentMeta = z
  .object({
    agentType: z.string().optional(),
    description: z.string().optional(),
    name: z.string().optional(),
    model: z.string().optional(),
    taskKind: z.string().optional(),
    teamName: z.string().optional(),
  })
  .passthrough();

/**
 * Parse one JSONL line. Returns null for blank lines, malformed JSON and lines
 * that do not match the schema — the caller counts those as parse errors
 * rather than letting one bad byte take the stream down.
 */
export function parseLine(raw) {
  const text = raw.trim();
  if (!text) return null;
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const result = transcriptLine.safeParse(json);
  return result.success ? result.data : null;
}

/** Content blocks of a line, always as an array. */
export function blocksOf(line) {
  const content = line?.message?.content;
  if (Array.isArray(content)) return content;
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return [];
}

/** Milliseconds for a line, falling back to now when the timestamp is missing. */
export function timeOf(line, fallback = Date.now()) {
  if (!line?.timestamp) return fallback;
  const ms = Date.parse(line.timestamp);
  return Number.isFinite(ms) ? ms : fallback;
}
