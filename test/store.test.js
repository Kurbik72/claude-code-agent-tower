import { describe, it, expect } from 'vitest';
import { Store, WORK_WINDOW, WAIT_WINDOW, LEAVE_AFTER, DONE_AFTER } from '../server/store.js';
import { Normalizer } from '../server/normalizer.js';
import { capacityOf, OVERFLOW_FLOOR_ID } from '../server/floors.js';

function makeStore(clock = { t: 1_000_000 }) {
  return new Store({ now: () => clock.t });
}

function addAgent(store, id, extra = {}) {
  return store.upsertAgent({ id, name: id, at: store.now(), ...extra });
}

describe('status inference', () => {
  it('is work while a tool cycle is open and recent', () => {
    const clock = { t: 1_000_000 };
    const store = makeStore(clock);
    const agent = addAgent(store, 'a');
    store.touch(agent, clock.t, 'tool_use');

    store.refreshStatuses(clock.t + 1000);
    expect(agent.status).toBe('work');
  });

  it('is wait after a final assistant answer with no tool call', () => {
    const clock = { t: 1_000_000 };
    const store = makeStore(clock);
    const agent = addAgent(store, 'a');
    store.touch(agent, clock.t, 'answer');

    store.refreshStatuses(clock.t + 1000);
    expect(agent.status).toBe('wait');
  });

  it('is wait after a minute of silence and dead after fifteen', () => {
    const clock = { t: 1_000_000 };
    const store = makeStore(clock);
    const agent = addAgent(store, 'a');
    store.touch(agent, clock.t, 'tool_use');

    store.refreshStatuses(clock.t + WORK_WINDOW + 1);
    expect(agent.status).toBe('wait');

    store.refreshStatuses(clock.t + WAIT_WINDOW + 1);
    expect(agent.status).toBe('dead');
  });

  it('is dead right away when the last event was an error', () => {
    const clock = { t: 1_000_000 };
    const store = makeStore(clock);
    const agent = addAgent(store, 'a');
    store.touch(agent, clock.t, 'error');

    store.refreshStatuses(clock.t + 500);
    expect(agent.status).toBe('dead');
  });

  it('takes the elevator down after half an hour idle', () => {
    const clock = { t: 1_000_000 };
    const store = makeStore(clock);
    const agent = addAgent(store, 'a');
    store.touch(agent, clock.t, 'tool_use');

    store.refreshStatuses(clock.t + LEAVE_AFTER + 1);
    expect(store.getAgent('a')).toBeNull();
  });

  it('sends an agent home once it has answered and gone quiet', () => {
    const clock = { t: 1_000_000 };
    const store = makeStore(clock);
    const agent = addAgent(store, 'a');
    const reasons = [];
    store.on('patch', (p) => p.type === 'agent.leave' && reasons.push(p.data.reason));
    store.touch(agent, clock.t, 'answer');

    store.refreshStatuses(clock.t + DONE_AFTER - 1);
    expect(store.getAgent('a')).not.toBeNull();

    store.refreshStatuses(clock.t + DONE_AFTER + 1);
    expect(store.getAgent('a')).toBeNull();
    expect(reasons).toEqual(['finished']);
  });

  it('keeps a quiet agent that never finished until the idle timeout', () => {
    const clock = { t: 1_000_000 };
    const store = makeStore(clock);
    const agent = addAgent(store, 'a');
    store.touch(agent, clock.t, 'tool_use');

    store.refreshStatuses(clock.t + DONE_AFTER + 1);
    expect(store.getAgent('a')).not.toBeNull();
  });

  it('empties a whole session when its transcript is deleted', () => {
    const store = makeStore();
    addAgent(store, 's:sess-1', { sessionId: 'sess-1' });
    addAgent(store, 'a:sub-1', { kind: 'subagent', sessionId: 'sess-1' });
    addAgent(store, 's:sess-2', { sessionId: 'sess-2' });

    expect(store.removeSession('sess-1')).toBe(2);
    expect(store.getAgent('s:sess-1')).toBeNull();
    expect(store.getAgent('a:sub-1')).toBeNull();
    expect(store.getAgent('s:sess-2')).not.toBeNull();
  });
});

describe('thinking retention', () => {
  it('never reuses a line id once the cap starts dropping the oldest', () => {
    const store = makeStore();
    const agent = addAgent(store, 'a');
    for (let i = 0; i < 260; i++) store.addThinking(agent, `line ${i}`, store.now());

    const ids = agent.thinking.map((line) => line.id);
    expect(agent.thinking).toHaveLength(200);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('tool_use / tool_result pairing', () => {
  it('moves a row from идёт to ок and to упал on error', () => {
    const store = makeStore();
    const agent = addAgent(store, 'a');

    store.addToolUse(agent, { id: 't1', name: 'Read', label: 'Read(a.ts)' }, store.now());
    expect(agent.tools[0].status).toBe('идёт');

    store.resolveTool(agent, 't1', false);
    expect(agent.tools[0].status).toBe('ок');

    store.addToolUse(agent, { id: 't2', name: 'Bash', label: 'Bash(x)' }, store.now());
    store.resolveTool(agent, 't2', true);
    expect(agent.tools[1].status).toBe('упал');
  });

  it('marks a permission-blocked call as ждёт', () => {
    const store = makeStore();
    const agent = addAgent(store, 'a');
    store.addToolUse(agent, { id: 't1', name: 'Edit', label: 'Edit(a.ts)' }, store.now());
    store.markToolWaiting(agent, 't1');
    expect(agent.tools[0].status).toBe('ждёт');
  });

  it('ignores a result for a tool it never saw', () => {
    const store = makeStore();
    const agent = addAgent(store, 'a');
    expect(() => store.resolveTool(agent, 'nope', false)).not.toThrow();
  });
});

describe('placement and overflow', () => {
  it('fills a floor to capacity and sends the rest to floor 00', () => {
    const store = makeStore();
    const capacity = capacityOf('f1');

    for (let i = 0; i < capacity + 3; i++) {
      const agent = addAgent(store, `a${i}`);
      store.place(agent, 'f1');
    }

    const onF1 = [...store.agents.values()].filter((a) => a.floorId === 'f1');
    const onF0 = [...store.agents.values()].filter((a) => a.floorId === OVERFLOW_FLOOR_ID);
    expect(onF1).toHaveLength(capacity);
    expect(onF0).toHaveLength(3);
    expect(store.stats().overflowUsed).toBe(true);
  });

  it('evicts a waiting agent rather than a working one', () => {
    const store = makeStore();
    const capacity = capacityOf('f2');

    for (let i = 0; i < capacity; i++) {
      const agent = addAgent(store, `w${i}`);
      agent.status = 'work';
      store.place(agent, 'f2');
    }
    const waiter = store.getAgent('w3');
    waiter.status = 'wait';

    const newcomer = addAgent(store, 'fresh');
    newcomer.status = 'work';
    store.place(newcomer, 'f2');

    expect(store.getAgent('fresh').floorId).toBe('f2');
    expect(waiter.floorId).toBe(OVERFLOW_FLOOR_ID);
  });

  it('never gives two agents the same seat', () => {
    const store = makeStore();
    for (let i = 0; i < 8; i++) store.place(addAgent(store, `a${i}`), 'f3');

    const seats = [...store.agents.values()]
      .filter((a) => a.floorId === 'f3')
      .map((a) => a.slotIndex);
    expect(new Set(seats).size).toBe(seats.length);
  });

  it('keeps an agent in its seat when it is re-placed on the same floor', () => {
    const store = makeStore();
    const agent = addAgent(store, 'a');
    store.place(agent, 'f4');
    const seat = agent.slotIndex;
    store.place(agent, 'f4');
    expect(agent.slotIndex).toBe(seat);
  });

  it('sends an unknown agent to the basement', () => {
    const store = makeStore();
    const agent = addAgent(store, 'a');
    store.classify('a', { floor: 'unknown', confidence: 0, reason: 'no-signal' });
    expect(agent.floorId).toBe('f1');
    expect(agent.unknownFloor).toBe(true);
  });

  it('pulls an agent back off floor 00 once its floor frees up', () => {
    const store = makeStore();
    const capacity = capacityOf('f5');
    for (let i = 0; i < capacity; i++) {
      const a = addAgent(store, `a${i}`);
      a.status = 'work';
      store.classify(a.id, { floor: 'frontend', confidence: 1, reason: 'x' });
    }
    const extra = addAgent(store, 'extra');
    extra.status = 'work';
    store.classify('extra', { floor: 'frontend', confidence: 1, reason: 'x' });
    expect(extra.floorId).toBe(OVERFLOW_FLOOR_ID);

    store.removeAgent('a0');
    expect(store.getAgent('extra').floorId).toBe('f5');
  });
});

describe('normalizer', () => {
  const source = { kind: 'session', sessionId: 'sess-1', project: 'shop' };

  function line(extra) {
    return {
      type: 'assistant',
      timestamp: new Date(1_000_000).toISOString(),
      cwd: '/Users/dev/shop',
      ...extra,
    };
  }

  it('creates one agent per session and keeps it across lines', () => {
    const store = makeStore();
    const norm = new Normalizer(store);

    norm.ingest(line({ message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } }), source);
    norm.ingest(line({ message: { role: 'assistant', content: [{ type: 'text', text: 'again' }] } }), source);

    expect(store.agents.size).toBe(1);
    expect([...store.agents.values()][0].kind).toBe('session');
  });

  it('creates a subagent for an Agent tool call and closes it on its result', () => {
    const store = makeStore();
    const norm = new Normalizer(store);

    norm.ingest(
      line({
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'Agent',
              input: { subagent_type: 'executor', description: 'do a thing', name: 'w1' },
            },
          ],
        },
      }),
      source,
    );

    const sub = [...store.agents.values()].find((a) => a.kind === 'subagent');
    expect(sub).toBeTruthy();
    expect(sub.name).toBe('executor');

    norm.ingest(
      line({
        type: 'user',
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1' }] },
      }),
      source,
    );

    expect(store.getAgent(sub.id)).toBeNull();
  });

  it('counts a subagent once whether the tool call or its transcript arrives first', () => {
    const store = makeStore();
    const norm = new Normalizer(store);

    norm.ingest(
      line({
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'Agent',
              input: { subagent_type: 'executor', description: 'thing', name: 'w1' },
            },
          ],
        },
      }),
      source,
    );

    norm.ingest(line({ message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] } }), {
      kind: 'subagent',
      sessionId: 'sess-1',
      project: 'shop',
      agentId: 'aw1',
      meta: { agentType: 'executor', description: 'thing', name: 'w1' },
    });

    expect([...store.agents.values()].filter((a) => a.kind === 'subagent')).toHaveLength(1);
  });

  it('gives colliding agent types distinct names', () => {
    const store = makeStore();
    const norm = new Normalizer(store);
    for (const id of ['toolu_1', 'toolu_2']) {
      norm.ingest(
        line({
          message: {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id,
                name: 'Agent',
                input: { subagent_type: 'executor', description: id, name: id },
              },
            ],
          },
        }),
        source,
      );
    }
    const names = [...store.agents.values()].filter((a) => a.kind === 'subagent').map((a) => a.name);
    expect(new Set(names).size).toBe(2);
  });
});
