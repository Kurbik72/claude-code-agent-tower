import { describe, it, expect } from 'vitest';
import { classifyHeuristic } from '../server/classifier/heuristic.js';
import { classifyBatch, normalizeResult, classifyOutput } from '../server/classifier/deepseek.js';
import { cacheKey } from '../server/classifier/cache.js';
import { slotsOf, capacityOf, worldHeight, shaftHeight } from '../server/floors.js';
import { Hub } from '../server/sse.js';
import { Store } from '../server/store.js';

describe('heuristic classifier', () => {
  it('reads the floor off the agent type', () => {
    expect(classifyHeuristic({ subagentType: 'code-reviewer' }).floor).toBe('qa');
    expect(classifyHeuristic({ subagentType: 'test-engineer' }).floor).toBe('testers');
    expect(classifyHeuristic({ subagentType: 'frontend-dev' }).floor).toBe('frontend');
  });

  it('reads the floor off touched files', () => {
    expect(classifyHeuristic({ files: ['src/ui/Card.tsx', 'src/ui/card.css'] }).floor).toBe(
      'frontend',
    );
    expect(classifyHeuristic({ files: ['tests/cart.spec.ts'] }).floor).toBe('testers');
    expect(classifyHeuristic({ files: ['.github/workflows/deploy.yml'] }).floor).toBe('devops');
    expect(classifyHeuristic({ files: ['server/api/session.py'] }).floor).toBe('backend');
  });

  it('reads the floor off tool commands', () => {
    expect(classifyHeuristic({ tools: ['Bash'], files: ['kubectl'] }).floor).toBe('devops');
  });

  it('returns unknown with no signal at all', () => {
    const result = classifyHeuristic({});
    expect(result.floor).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('reports a confidence between 0 and 1 and a short reason', () => {
    const result = classifyHeuristic({ subagentType: 'qa-tester', files: ['tests/a.spec.ts'] });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.reason.length).toBeLessThanOrEqual(80);
  });
});

describe('DeepSeek contract', () => {
  it('accepts a well-formed answer', () => {
    const parsed = classifyOutput.safeParse({ floor: 'qa', confidence: 0.8, reason: 'reviews' });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown floor name and an out-of-range confidence', () => {
    expect(classifyOutput.safeParse({ floor: 'roof', confidence: 0.8, reason: '' }).success).toBe(
      false,
    );
    expect(classifyOutput.safeParse({ floor: 'qa', confidence: 4, reason: '' }).success).toBe(false);
  });

  it('downgrades a low-confidence verdict to unknown', () => {
    const result = normalizeResult({ floor: 'devops', confidence: 0.4, reason: 'maybe' });
    expect(result.floor).toBe('unknown');
  });

  it('turns an invalid answer into unknown rather than throwing', () => {
    expect(normalizeResult({ nope: true }).floor).toBe('unknown');
  });

  it('parses a batched response', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  { id: 'a1', floor: 'backend', confidence: 0.9, reason: 'sql migrations' },
                  { id: 'a2', floor: 'nowhere', confidence: 0.9, reason: 'bad' },
                ],
              }),
            },
          },
        ],
      }),
    });

    const out = await classifyBatch([{ id: 'a1' }, { id: 'a2' }], { apiKey: 'k', fetchImpl });
    expect(out.get('a1').floor).toBe('backend');
    expect(out.get('a2')).toBeUndefined();
  });

  it('throws a retriable error on 429', async () => {
    const fetchImpl = async () => ({ ok: false, status: 429 });
    await expect(classifyBatch([{ id: 'a' }], { apiKey: 'k', fetchImpl })).rejects.toMatchObject({
      status: 429,
    });
  });
});

describe('classification cache key', () => {
  it('is stable across file order and identical for the same agent shape', () => {
    const a = { subagentType: 'executor', tools: ['Read', 'Bash'], files: ['a.ts', 'b.ts'] };
    const b = { subagentType: 'executor', tools: ['Bash', 'Read'], files: ['b.ts', 'a.ts'] };
    expect(cacheKey(a)).toBe(cacheKey(b));
  });

  it('changes when the agent type changes', () => {
    expect(cacheKey({ subagentType: 'executor' })).not.toBe(cacheKey({ subagentType: 'critic' }));
  });
});

describe('floor geometry', () => {
  it('seats twelve on a themed floor and twenty-four on floor 00', () => {
    for (const id of ['f5', 'f4', 'f3', 'f2', 'f1']) expect(capacityOf(id)).toBe(12);
    expect(capacityOf('f0')).toBe(24);
  });

  it('keeps every slot inside the isometric plate', () => {
    for (const floor of ['f5', 'f1', 'f0']) {
      for (const slot of slotsOf(floor)) {
        // the plate is the diamond (380,200) (740,380) (380,560) (20,380)
        const dx = Math.abs(slot.x - 380);
        const dy = Math.abs(slot.y - 380);
        expect(dx / 2 + dy).toBeLessThanOrEqual(180 + 1e-9);
      }
    }
  });

  it('orders slots back to front by z', () => {
    const zs = slotsOf('f1').map((s) => s.z);
    expect(Math.min(...zs)).toBeLessThan(Math.max(...zs));
  });

  it('grows the world when floor 00 comes into play', () => {
    expect(worldHeight(false)).toBe(2560);
    expect(worldHeight(true)).toBe(3030);
    expect(shaftHeight(false)).toBe(2430);
    expect(shaftHeight(true)).toBe(2900);
  });
});

describe('SSE hub', () => {
  it('replays messages after Last-Event-ID', () => {
    const store = new Store();
    const hub = new Hub(store);
    hub.push({ type: 'event.append', data: { n: 1 } });
    hub.push({ type: 'event.append', data: { n: 2 } });
    hub.push({ type: 'event.append', data: { n: 3 } });

    const backlog = hub.replay('1');
    expect(backlog.map((m) => m.data.n)).toEqual([2, 3]);
    expect(hub.replay(String(hub.seq))).toEqual([]);
  });

  it('asks for a resync when the id has scrolled out of the buffer', () => {
    const store = new Store();
    const hub = new Hub(store);
    for (let i = 0; i < 600; i++) hub.push({ type: 'event.append', data: { n: i } });
    expect(hub.replay('1')).toBeNull();
  });

  it('coalesces repeated updates for one agent', async () => {
    const store = new Store();
    const hub = new Hub(store);
    const seen = [];
    hub.add((m) => seen.push(m));

    hub.push({ type: 'agent.update', data: { id: 'a', v: 1 } });
    hub.push({ type: 'agent.update', data: { id: 'a', v: 2 } });
    await new Promise((r) => setTimeout(r, 160));

    expect(seen).toHaveLength(1);
    expect(seen[0].data.v).toBe(2);
    hub.stop();
  });
});
