import { create } from 'zustand';
import type {
  Agent,
  AgentDetail,
  FeedEvent,
  Floor,
  FloorId,
  Snapshot,
  Stats,
  ThinkingLine,
  ToolRow,
  Warning,
} from '../lib/types';

/** Elevator car offset from a floor's wrapper top (design constant). */
export const CAR_OFFSET = 260;
/** How long the elevator takes to serve one trip, including the doors. */
export const TRIP_MS = 2400;
/** Stagger between agents leaving the car together. */
export const GROUP_STEP = 120;

const EMPTY_STATS: Stats = {
  shift: 0,
  lit: 0,
  dark: 0,
  floorCount: 5,
  tokens: 0,
  events: 0,
  projects: 0,
  overflowUsed: false,
  parseErrors: 0,
};

/** How long an agent takes to walk back to the car and ride down. */
export const LEAVE_MS = 700;

interface ArrivalState {
  /** Agents currently animating out of the car, with their start offset. */
  arriving: Record<string, { dx: number; dy: number }>;
  /** Agents on their way back to the car, about to be removed. */
  leaving: Record<string, { dx: number; dy: number }>;
}

interface TowerState extends ArrivalState {
  connected: boolean;
  resyncing: boolean;
  floors: Floor[];
  agents: Record<string, Agent>;
  events: FeedEvent[];
  stats: Stats;
  warnings: Warning[];

  focusFloor: FloorId | null;
  /** Bumped on every explicit focus so the canvas knows to re-frame. */
  focusSeq: number;
  liftFloor: FloorId;
  liftY: number;
  liftQueue: FloorId[];

  openAgent: string | null;
  detail: AgentDetail | null;
  detailRevealed: number;
  toolsRevealed: number;

  hovered: string | null;
  whips: number;
  strike: { agentId: string; cry: string; at: number } | null;
  jolts: Record<string, number>;
  localSeq: number;

  applySnapshot: (snapshot: Snapshot) => void;
  applyPatch: (type: string, data: unknown) => void;
  setConnected: (connected: boolean) => void;

  sendLift: (floor: FloorId, focus?: boolean) => void;
  setHovered: (id: string | null) => void;
  setOpen: (id: string | null) => void;
  setDetail: (detail: AgentDetail | null) => void;
  revealMore: () => void;
  whip: (agentId: string, by: 'user' | 'timer') => void;
  clearStrike: () => void;
  pushLocalEvent: (kind: string, params: Record<string, unknown>) => void;
}

/**
 * Client-side flavour text for the whip. The whip is decoration (plan 9.2), so
 * its lines never touch the server and never claim to describe real work.
 */
export interface WhipCopy {
  lines: string[];
  cries: string[];
}

let whipCopy: WhipCopy = { lines: [''], cries: [''] };

export function setWhipCopy(copy: WhipCopy): void {
  whipCopy = copy;
}

function floorTop(floors: Floor[], id: FloorId): number {
  return floors.find((f) => f.id === id)?.top ?? 1910;
}

export const useTower = create<TowerState>((set, get) => ({
  connected: false,
  resyncing: false,
  floors: [],
  agents: {},
  events: [],
  stats: EMPTY_STATS,
  warnings: [],
  arriving: {},
  leaving: {},

  focusFloor: null,
  focusSeq: 0,
  liftFloor: 'f1',
  liftY: 2170,
  liftQueue: [],

  openAgent: null,
  detail: null,
  detailRevealed: 0,
  toolsRevealed: 0,

  hovered: null,
  whips: 0,
  strike: null,
  jolts: {},
  localSeq: 0,

  applySnapshot(snapshot) {
    const agents: Record<string, Agent> = {};
    for (const agent of snapshot.agents) agents[agent.id] = agent;
    set({
      floors: snapshot.floors,
      agents,
      events: snapshot.events,
      stats: snapshot.stats,
      warnings: snapshot.warnings,
      resyncing: false,
    });
  },

  applyPatch(type, data) {
    const state = get();
    switch (type) {
      case 'agent.enter': {
        const agent = data as Agent;
        const carY = floorTop(state.floors, agent.floorId) + CAR_OFFSET;
        set({
          agents: { ...state.agents, [agent.id]: agent },
          // the agent starts inside the car and walks to its seat
          arriving: {
            ...state.arriving,
            [agent.id]: { dx: 1026 - 240 - agent.x, dy: carY - floorTop(state.floors, agent.floorId) - agent.y },
          },
        });
        get().sendLift(agent.floorId, false);
        window.setTimeout(() => {
          const next = { ...get().arriving };
          delete next[agent.id];
          set({ arriving: next });
        }, TRIP_MS);
        break;
      }
      case 'agent.update':
      case 'agent.move': {
        const agent = data as Agent;
        set({ agents: { ...state.agents, [agent.id]: agent } });
        if (type === 'agent.move') get().sendLift(agent.floorId, false);
        break;
      }
      case 'agent.leave': {
        const { id } = data as { id: string };
        const agent = state.agents[id];
        if (!agent) break;
        // the agent walks back to the car before it disappears (plan 5.3)
        const carY = floorTop(state.floors, agent.floorId) + CAR_OFFSET;
        set({
          leaving: {
            ...state.leaving,
            [id]: {
              dx: 1026 - 240 - agent.x,
              dy: carY - floorTop(state.floors, agent.floorId) - agent.y,
            },
          },
          openAgent: state.openAgent === id ? null : state.openAgent,
        });
        window.setTimeout(() => {
          const now = get();
          const agents = { ...now.agents };
          delete agents[id];
          const leaving = { ...now.leaving };
          delete leaving[id];
          set({ agents, leaving });
        }, LEAVE_MS);
        break;
      }
      case 'event.append': {
        const event = data as FeedEvent;
        set({ events: [event, ...state.events].slice(0, 300) });
        break;
      }
      case 'stats.update':
        set({ stats: data as Stats });
        break;
      case 'thinking.append': {
        const { agentId, line } = data as { agentId: string; line: ThinkingLine };
        if (state.detail?.agentId !== agentId) break;
        set({
          detail: { ...state.detail, thinking: [...state.detail.thinking, line] },
          // live lines land immediately; only the historical tail is paced
          detailRevealed: state.detailRevealed + 1,
        });
        break;
      }
      case 'tools.update': {
        const { agentId, row } = data as { agentId: string; row: ToolRow };
        if (state.detail?.agentId !== agentId) break;
        const tools = state.detail.tools.slice();
        const at = tools.findIndex((t) => t.id === row.id);
        if (at >= 0) tools[at] = row;
        else tools.push(row);
        set({
          detail: { ...state.detail, tools },
          toolsRevealed: at >= 0 ? state.toolsRevealed : state.toolsRevealed + 1,
        });
        break;
      }
      default:
        break;
    }
  },

  setConnected(connected) {
    set({ connected });
  },

  /**
   * The car serves one trip at a time. Requests pile up in a queue; a click on
   * a floor jumps the queue because it is a direct instruction (plan 5.3).
   */
  sendLift(floor, focus = true) {
    const state = get();
    if (focus) {
      set({
        focusFloor: floor,
        focusSeq: state.focusSeq + 1,
        liftFloor: floor,
        liftY: floorTop(state.floors, floor) + CAR_OFFSET,
        liftQueue: [],
      });
      return;
    }
    if (state.liftFloor === floor) return;
    if (state.liftQueue.includes(floor)) return;

    const queue = [...state.liftQueue, floor];
    set({ liftQueue: queue });
    if (queue.length > 1) return;

    const serve = () => {
      const now = get();
      const next = now.liftQueue[0];
      if (!next) return;
      set({ liftFloor: next, liftY: floorTop(now.floors, next) + CAR_OFFSET });
      window.setTimeout(() => {
        set({ liftQueue: get().liftQueue.slice(1) });
        if (get().liftQueue.length) serve();
      }, TRIP_MS);
    };
    serve();
  },

  setHovered(id) {
    set({ hovered: id });
  },

  setOpen(id) {
    set({ openAgent: id, detail: null, detailRevealed: 0, toolsRevealed: 0, hovered: id });
  },

  setDetail(detail) {
    set({
      detail,
      // The counters are a window on the *end* of each list, so the newest row
      // is on screen from the first frame and the history unfolds behind it —
      // an agent with 50 calls used to spend 40s replaying its oldest ones
      // before it showed what it was doing now.
      detailRevealed: detail && detail.thinking.length ? 1 : 0,
      toolsRevealed: detail && detail.tools.length ? 1 : 0,
    });
  },

  revealMore() {
    const state = get();
    if (!state.detail) return;
    const moreLines = state.detailRevealed < state.detail.thinking.length;
    const moreTools = state.toolsRevealed < state.detail.tools.length;
    if (!moreLines && !moreTools) return;
    set({
      detailRevealed: moreLines ? state.detailRevealed + 1 : state.detailRevealed,
      toolsRevealed: moreTools ? state.toolsRevealed + 1 : state.toolsRevealed,
    });
  },

  /**
   * Cracks the whip at an agent. Pure theatre: it moves a counter and shakes a
   * character, and never touches the agent's real state.
   */
  whip(agentId) {
    const state = get();
    const agent = state.agents[agentId];
    if (!agent) return;
    const floor = state.floors.find((f) => f.id === agent.floorId);
    if (floor?.noWhip) {
      get().pushLocalEvent('whipTerrace', {});
      return;
    }
    if (agent.status === 'dead') {
      get().pushLocalEvent('whipDead', { name: agent.name });
      return;
    }
    const line = whipCopy.lines[Math.floor(Math.random() * whipCopy.lines.length)];
    const cry = whipCopy.cries[agent.name.length % whipCopy.cries.length];
    set({
      whips: state.whips + 1,
      strike: { agentId, cry, at: Date.now() },
      jolts: { ...state.jolts, [agentId]: Date.now() },
    });
    get().pushLocalEvent('whip', { name: agent.name, line });
  },

  clearStrike() {
    set({ strike: null });
  },

  /** Feed entries the browser generates itself carry negative ids. */
  pushLocalEvent(kind, params) {
    const state = get();
    const id = -(state.localSeq + 1);
    set({
      localSeq: state.localSeq + 1,
      events: [{ id, at: Date.now(), kind, params }, ...state.events].slice(0, 300),
    });
  },
}));

export const selectAgent = (id: string) => (state: TowerState) => state.agents[id];

export function agentsOnFloor(agents: Record<string, Agent>, floorId: FloorId): Agent[] {
  return Object.values(agents)
    .filter((a) => a.floorId === floorId)
    .sort((a, b) => a.z - b.z);
}
