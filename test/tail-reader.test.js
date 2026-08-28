import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TailReader } from '../server/tail-reader.js';
import { parseLine } from '../server/jsonl.js';

let dir;
let file;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tower-tail-'));
  file = path.join(dir, 'session.jsonl');
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('TailReader', () => {
  it('reads only the bytes appended since the last call', async () => {
    await fs.writeFile(file, 'a\nb\n');
    const reader = new TailReader(file);
    expect(await reader.read()).toEqual(['a', 'b']);
    expect(await reader.read()).toEqual([]);

    await fs.appendFile(file, 'c\n');
    expect(await reader.read()).toEqual(['c']);
  });

  it('holds a half-written line back until its newline arrives', async () => {
    await fs.writeFile(file, '{"type":"user"}\n{"type":"assis');
    const reader = new TailReader(file);
    expect(await reader.read()).toEqual(['{"type":"user"}']);

    await fs.appendFile(file, 'tant"}\n');
    expect(await reader.read()).toEqual(['{"type":"assistant"}']);
  });

  it('rereads from zero after truncation', async () => {
    await fs.writeFile(file, 'one\ntwo\n');
    const reader = new TailReader(file);
    await reader.read();

    await fs.writeFile(file, 'x\n');
    expect(await reader.read()).toEqual(['x']);
  });

  it('primes to the tail without emitting history', async () => {
    const history = Array.from({ length: 200 }, (_, i) => `{"type":"user","n":${i}}`).join('\n');
    await fs.writeFile(file, `${history}\n`);

    const reader = new TailReader(file);
    await reader.prime({ tailBytes: 200 });
    const lines = await reader.read();

    expect(lines.length).toBeLessThan(20);
    expect(lines.every((l) => l.startsWith('{'))).toBe(true);
  });
});

describe('parseLine', () => {
  it('returns null for blank lines and broken JSON', () => {
    expect(parseLine('')).toBeNull();
    expect(parseLine('   ')).toBeNull();
    expect(parseLine('{"type":')).toBeNull();
  });

  it('rejects a line with no type', () => {
    expect(parseLine('{"uuid":"x"}')).toBeNull();
  });

  it('keeps unknown fields', () => {
    const line = parseLine('{"type":"user","somethingNew":42}');
    expect(line.type).toBe('user');
    expect(line.somethingNew).toBe(42);
  });
});
