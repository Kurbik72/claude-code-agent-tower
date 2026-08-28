#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * Replays a recorded transcript into a scratch projects directory at wall-clock
 * speed, so the live pipeline can be exercised without a real Claude Code run:
 *
 *   npm run replay -- fixtures/pipeline.jsonl --speed 2
 *
 * Point the server at the printed directory with --projects-dir.
 */

function parseArgs(argv) {
  const args = { speed: 1, out: path.join(os.tmpdir(), 'agent-tower-replay') };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--speed') args.speed = Number(argv[++i]) || 1;
    else if (argv[i] === '--out') args.out = argv[++i];
    else rest.push(argv[i]);
  }
  args.file = rest[0];
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function replay({ file, out, speed = 1, log = () => {} }) {
  const raw = await fs.readFile(file, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim());

  // Group by destination file so subagent transcripts land in their own paths.
  const targets = new Map();
  const parsed = lines.map((line) => {
    const json = JSON.parse(line);
    const project = json.__project || 'replay-project';
    const slug = `-replay-${project}`;
    const dir = path.join(out, slug);
    const target = json.agentId
      ? path.join(dir, json.sessionId, 'subagents', `agent-${json.agentId}.jsonl`)
      : path.join(dir, `${json.sessionId}.jsonl`);
    targets.set(target, (targets.get(target) || 0) + 1);
    return { json, target, meta: json.__meta };
  });

  await fs.rm(out, { recursive: true, force: true });
  for (const target of targets.keys()) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, '');
  }

  log(`replay -> ${out}  (${parsed.length} lines, speed x${speed})`);

  let previous = null;
  for (const entry of parsed) {
    const at = Date.parse(entry.json.timestamp || '') || null;
    if (previous && at) {
      const delay = Math.max(0, Math.min(4000, (at - previous) / speed));
      if (delay) await sleep(delay);
    }
    if (at) previous = at;

    if (entry.meta) {
      const metaPath = entry.target.replace(/\.jsonl$/, '.meta.json');
      await fs.writeFile(metaPath, JSON.stringify(entry.meta));
    }
    const { __project, __meta, ...line } = entry.json;
    // rewrite the timestamp so the live status rules see a fresh event
    line.timestamp = new Date().toISOString();
    await fs.appendFile(entry.target, `${JSON.stringify(line)}\n`);
  }

  log('replay finished');
  return out;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('replay.js');
if (invokedDirectly) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    process.stderr.write('usage: npm run replay -- <fixture.jsonl> [--speed n] [--out dir]\n');
    process.exit(1);
  }
  replay({ ...args, log: (m) => process.stdout.write(`${m}\n`) }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
