import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

export const CONFIG_DIR = path.join(os.homedir(), '.agent-tower');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const CACHE_FILE = path.join(CONFIG_DIR, 'classify-cache.json');
export const DEFAULT_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

export async function readConfig() {
  const text = await fs.readFile(CONFIG_FILE, 'utf8').catch(() => null);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function writeConfig(patch) {
  const current = await readConfig();
  const next = { ...current, ...patch };
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(CONFIG_FILE, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await fs.chmod(CONFIG_FILE, 0o600).catch(() => {});
  return next;
}

const CLEAR_LINE = '\u001b[2K\u001b[200D';

/** Hidden console prompt; Enter accepts the empty value. */
export function askHidden(question) {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    if (!input.isTTY) {
      resolve('');
      return;
    }
    const rl = readline.createInterface({ input, output, terminal: true });
    const onData = () => {
      output.write(CLEAR_LINE);
      output.write(question + '*'.repeat(rl.line.length));
    };
    output.write(question);
    input.on('data', onData);
    rl.question('', (answer) => {
      input.off('data', onData);
      rl.close();
      output.write('\n');
      resolve(answer.trim());
    });
  });
}

/**
 * Resolve the DeepSeek key: flag -> env -> config -> interactive prompt.
 * Returns `''` when the user skipped it (heuristic-only mode).
 */
export async function resolveDeepSeekKey({ flagKey, noAi, interactive = true }) {
  if (noAi) return '';
  if (flagKey) return flagKey;
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;

  const config = await readConfig();
  if (typeof config.deepseekKey === 'string') return config.deepseekKey;

  if (!interactive || !process.stdin.isTTY) return '';

  process.stdout.write(
    '\n  agent-tower classifies agents with DeepSeek.\n' +
      '  Paste an API key, or press Enter to run on the built-in heuristic only.\n\n',
  );
  const key = await askHidden('  DEEPSEEK_API_KEY: ');
  await writeConfig({ deepseekKey: key });
  if (!key) {
    process.stdout.write('  no key stored. Falling back to the heuristic classifier.\n\n');
  }
  return key;
}
