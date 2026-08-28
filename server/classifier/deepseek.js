import { z } from 'zod';
import {
  CONFIDENCE_FLOOR,
  DEEPSEEK_ENDPOINT,
  FLOORS,
  MAX_BATCH,
  deepseekBody,
  sanitizeItems,
} from './prompt.js';

/** Strict schema for the model's answer (plan 4.1). */
export const classifyOutput = z.object({
  floor: z.enum(FLOORS),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(200),
});

/** The envelope only has to hold an array; rows are validated one by one. */
export const batchOutput = z.object({ results: z.array(z.unknown()) });

const batchRow = classifyOutput.extend({ id: z.string() });

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

/** id -> classification, skipping rows the model got wrong. */
function collect(json) {
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

function httpError(label, status) {
  const error = new Error(`${label} ${status}`);
  error.status = status;
  return error;
}

/**
 * Ask our own proxy, which holds the key. Nothing secret is sent or received:
 * the request is a list of agents, the response is a list of floors.
 */
async function viaProxy(items, { proxyUrl, fetchImpl, signal }) {
  const response = await fetchImpl(proxyUrl, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: sanitizeItems(items) }),
  });

  if (!response.ok) throw httpError('proxy', response.status);
  return collect(await response.json());
}

/** Ask DeepSeek directly with the caller's own key. */
async function viaDeepSeek(items, { apiKey, fetchImpl, signal }) {
  const response = await fetchImpl(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(deepseekBody(items)),
  });

  if (!response.ok) throw httpError('deepseek', response.status);

  const body = await response.json();
  const text = body?.choices?.[0]?.message?.content ?? '{}';
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('deepseek: response was not JSON');
  }
  return collect(json);
}

/**
 * One batched call. Throws on transport/HTTP failure so the caller can back off.
 *
 * A caller-supplied key wins over the proxy: someone who brought their own key
 * should spend their own quota, not the project's.
 *
 * @returns {Promise<Map<string, object>>} id -> classification
 */
export async function classifyBatch(items, { apiKey, proxyUrl, fetchImpl = fetch, signal } = {}) {
  const batch = items.slice(0, MAX_BATCH);
  if (apiKey) return viaDeepSeek(batch, { apiKey, fetchImpl, signal });
  if (proxyUrl) return viaProxy(batch, { proxyUrl, fetchImpl, signal });
  return new Map();
}
