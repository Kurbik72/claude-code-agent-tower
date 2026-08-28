import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const CONFIG_DIR = path.join(os.homedir(), '.agent-tower');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const CACHE_FILE = path.join(CONFIG_DIR, 'classify-cache.json');
export const DEFAULT_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * The hosted classification proxy - see proxy/README.md.
 *
 * This is not a secret and is meant to be committed: it accepts a list of
 * agents and returns a list of floors, and the DeepSeek key it uses stays in
 * Cloudflare. Publishing it is what lets `npm start` work with no setup.
 *
 * Set it to '' to take the proxy out of play; agent-tower falls back to the heuristic.
 */
export const DEFAULT_PROXY_URL =
  'https://agent-tower-classify.jumperchannel79.workers.dev/classify';

export async function readConfig() {
  const text = await fs.readFile(CONFIG_FILE, 'utf8').catch(() => null);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Refuse to send agent evidence anywhere but a real HTTPS endpoint. */
function usableProxy(url) {
  if (typeof url !== 'string' || !url) return '';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return '';
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && local)) return '';
  return url;
}

/**
 * Decide how agents get classified. Never prompts and never blocks startup.
 *
 * Order: an explicit key wins, because someone who brought their own should
 * spend their own quota rather than the project's. Otherwise we use the shared
 * proxy, which carries the key server-side. With neither, the heuristic runs
 * alone - that is a normal mode, not an error.
 *
 * `config` and `env` are injectable so this can be tested without depending on
 * whatever happens to sit in the developer's home directory.
 *
 * @returns {Promise<{apiKey: string, proxyUrl: string, mode: 'deepseek'|'proxy'|'heuristic'}>}
 */
export async function resolveClassifier({
  flagKey = '',
  flagProxyUrl = '',
  noAi = false,
  config,
  env = process.env,
  defaultProxyUrl = DEFAULT_PROXY_URL,
} = {}) {
  const off = { apiKey: '', proxyUrl: '', mode: 'heuristic' };
  if (noAi) return off;

  const settings = config ?? (await readConfig());

  const apiKey = flagKey || env.DEEPSEEK_API_KEY || settings.deepseekKey || '';
  if (apiKey) return { apiKey, proxyUrl: '', mode: 'deepseek' };

  const proxyUrl = usableProxy(
    flagProxyUrl || env.AGENT_TOWER_PROXY_URL || settings.proxyUrl || defaultProxyUrl,
  );
  if (proxyUrl) return { apiKey: '', proxyUrl, mode: 'proxy' };

  return off;
}
