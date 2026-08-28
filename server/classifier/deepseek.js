import { z } from 'zod';

/** Strict schema for the model's answer (plan 4.1). */
export const classifyOutput = z.object({
  floor: z.enum(['frontend', 'testers', 'qa', 'devops', 'backend', 'unknown']),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(200),
});

/** The envelope only has to hold an array; rows are validated one by one. */
export const batchOutput = z.object({ results: z.array(z.unknown()) });

const batchRow = classifyOutput.extend({ id: z.string() });

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const CONFIDENCE_FLOOR = 0.55;

const SYSTEM = `You place software agents into one of five floors of an office building.
floors: frontend (UI, styling, components), testers (writing and running tests),
qa (review, verification, audit, linting), devops (CI, deploy, containers, infra),
backend (APIs, databases, queues, server code).
Answer with JSON only: {"results":[{"id":string,"floor":string,"confidence":number,"reason":string}]}.
"reason" must be at most 80 characters. Use "unknown" when the evidence is thin.`;

function promptFor(items) {
  return items
    .map((item) => {
      const lines = [
        `id: ${item.id}`,
        `name: ${item.agentName}`,
        item.subagentType ? `type: ${item.subagentType}` : null,
        item.description ? `task: ${item.description}` : null,
        item.agentDoc?.description ? `definition: ${item.agentDoc.description}` : null,
        item.tools?.length ? `tools: ${item.tools.slice(0, 20).join(', ')}` : null,
        item.files?.length ? `files: ${item.files.slice(0, 20).join(', ')}` : null,
        item.promptExcerpt ? `prompt: ${item.promptExcerpt.slice(0, 500)}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n---\n');
}

/** Normalise a raw model answer into the store's classification shape. */
export function normalizeResult(raw) {
  const parsed = classifyOutput.safeParse(raw);
  if (!parsed.success) {
    return { floor: 'unknown', confidence: 0, reason: 'invalid-response', source: 'deepseek' };
  }
  const value = parsed.data;
  if (value.confidence < CONFIDENCE_FLOOR) {
    return {
      floor: 'unknown',
      confidence: value.confidence,
      reason: value.reason.slice(0, 80),
      source: 'deepseek',
    };
  }
  return {
    floor: value.floor,
    confidence: value.confidence,
    reason: value.reason.slice(0, 80),
    source: 'deepseek',
  };
}

/**
 * One batched call. Throws on transport/HTTP failure so the caller can back off.
 * @returns {Promise<Map<string, object>>} id -> classification
 */
export async function classifyBatch(items, { apiKey, fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: promptFor(items) },
      ],
    }),
  });

  if (!response.ok) {
    const error = new Error(`deepseek ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const body = await response.json();
  const text = body?.choices?.[0]?.message?.content ?? '{}';
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('deepseek: response was not JSON');
  }

  const parsed = batchOutput.safeParse(json);
  const out = new Map();
  if (!parsed.success) return out;
  // one malformed row must not cost us the rest of the batch
  for (const raw of parsed.data.results) {
    const row = batchRow.safeParse(raw);
    if (row.success) out.set(row.data.id, normalizeResult(row.data));
  }
  return out;
}
