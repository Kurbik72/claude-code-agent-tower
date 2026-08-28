import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Reads agent definition files (plan 4.2), cached with mtime invalidation.
 * Lookup order: <project>/.claude/agents -> ~/.claude/agents -> ~/.claude/plugins.
 */

const cache = new Map();

function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) return { front: {}, body: text };
  const front = {};
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(':');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line
      .slice(sep + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (key) front[key] = value;
  }
  return { front, body: match[2] };
}

async function candidates(name, cwd) {
  const bare = name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name;
  const home = os.homedir();
  const roots = [];
  if (cwd) roots.push(path.join(cwd, '.claude', 'agents'));
  roots.push(path.join(home, '.claude', 'agents'));
  const out = [];
  for (const root of roots) {
    out.push(path.join(root, `${bare}.md`));
    if (bare !== name) out.push(path.join(root, `${name}.md`));
  }
  // plugins live one level deeper and are enumerated lazily
  const pluginRoot = path.join(home, '.claude', 'plugins');
  const dirs = await fs.readdir(pluginRoot, { withFileTypes: true }).catch(() => []);
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    out.push(path.join(pluginRoot, dir.name, 'agents', `${bare}.md`));
  }
  return out;
}

/** @returns {Promise<{name, description, model, skills}|null>} */
export async function loadAgentDoc(subagentType, cwd) {
  if (!subagentType) return null;
  const key = `${cwd || ''}|${subagentType}`;
  for (const file of await candidates(subagentType, cwd)) {
    const stat = await fs.stat(file).catch(() => null);
    if (!stat) continue;
    const cached = cache.get(key);
    if (cached && cached.file === file && cached.mtime === stat.mtimeMs) return cached.doc;
    const text = await fs.readFile(file, 'utf8').catch(() => null);
    if (text == null) continue;
    const { front, body } = parseFrontmatter(text);
    const skills = [...body.matchAll(/`?\/([a-z0-9:_-]{3,})`?/gi)].map((m) => m[1]).slice(0, 12);
    const doc = {
      name: front.name || subagentType,
      description: front.description || '',
      model: front.model || undefined,
      skills,
    };
    cache.set(key, { file, mtime: stat.mtimeMs, doc });
    return doc;
  }
  cache.set(key, { file: null, mtime: 0, doc: null });
  return null;
}
