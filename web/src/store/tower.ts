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
/** Car box, so a passenger stands on the cabin floor and not on its roof. */
const CAR_HEIGHT = 116;
const CAR_LEFT = 1026;
const CAR_WIDTH = 94;
/** Left offset of every floor wrapper inside the world. */
const FLOOR_X = 240;
/** Where a passenger stands in the doorway, in floor-wrapper coordinates. */
const DOOR_X = CAR_LEFT - FLOOR_X + CAR_WIDTH / 2;
const DOOR_Y = CAR_OFFSET + CAR_HEIGHT - 26;

/** How long the elevator takes to serve one trip, including the doors. */
export const TRIP_MS = 2400;
/**
 * When the doors open, measured from the start of a trip. The car's own `top`
 * transition is 1.15s, so this is the frame it settles on its floor.
 */
export const DOOR_OPEN_AT = 1150;
/** How long the doors stay open once the car has landed. */
export const DOOR_HOLD = 900;
/** The car is already parked on this floor: it only has to open up. */
const DOOR_QUICK = 260;

/** How long an agent takes to walk from the doorway to its seat, and back. */
export const WALK_IN_MS = 1500;
export const WALK_OUT_MS = 1400;
/** The last beat of a departure: stepping into the cabin as the doors close. */
export const STEP_IN_MS = 340;
/**
 * The longest an agent will stand in the cabin waiting for its turn.
 *
 * Nine agents spawning at once queue nine trips, and the last of them would
 * otherwise spend twenty seconds invisible while the tower looked empty. Past
 * this point the agent simply walks in and nobody counts which door it used.
 */
const MAX_LIFT_WAIT = 3200;

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

/**
 * One trip across a floor on foot.
 *
 * `dx`/`dy` is the doorway measured from the agent's seat — the start of an
 * arrival and the end of a departure — `delay` waits for the car to actually
 * be there, and `ms` is how long the walk itself takes.
 */
export interface Walk {
  dx: number;
  dy: number;
  delay: number;
  ms: number;
}

interface ArrivalState {
  /** Agents currently walking out of the car towards their seat. */
  arriving: Record<string, Walk>;
  /** Agents on their way back to the car, about to be removed. */
  leaving: Record<string, Walk>;
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
  /** Floors still to serve; `[0]` is the trip the car is on right now. */
  liftQueue: FloorId[];
  /** When the current trip started, so a passenger can be told the ETA. */
  liftTripAt: number;
  /** Bumped whenever the doors are asked to open; the car watches it. */
  liftDoorSeq: number;
  /** How long from that bump until the doors are actually open. */
  liftDoorIn: number;

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

  /** Sends the car to a floor and answers when its doors will be open. */
  sendLift: (floor: FloorId, focus?: boolean) => number;
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

/**
 * The doorway measured from an agent's seat: where an arrival starts and where
 * a departure ends. Both walks share it, in opposite directions.
 */
function doorway(agent: Agent, delay: number, ms: number): Walk {
  return { dx: DOOR_X - agent.x, dy: DOOR_Y - agent.y, delay, ms };
}

/**
 * Pending end-of-walk timers, one per agent.
 *
 * An agent can be re-routed mid-walk — it enters on the basement and the
 * classifier moves it upstairs a second later — and the timer from the walk it
 * abandoned would otherwise land on the new one and cut it short.
 */
const walkTimers = new Map<string, number>();

function afterWalk(id: string, ms: number, done: () => void): void {
  const pending = walkTimers.get(id);
  if (pending !== undefined) window.clearTimeout(pending);
  walkTimers.set(
    id,
    window.setTimeout(() => {
      walkTimers.delete(id);
      done();
    }, ms),
  );
}

function without<T>(map: Record<string, T>, id: string): Record<string, T> {
  if (!(id in map)) return map;
  const next = { ...map };
  delete next[id];
  return next;
}

type Setter = (partial: Partial<TowerState> | ((s: TowerState) => Partial<TowerState>)) => void;

/** Starts the next queued trip and chains into the one after it. */
function serveLift(get: () => TowerState, set: Setter): void {
  const state = get();
  const next = state.liftQueue[0];
  if (!next) return;
  set({
    liftFloor: next,
    liftY: floorTop(state.floors, next) + CAR_OFFSET,
    liftTripAt: Date.now(),
    liftDoorSeq: state.liftDoorSeq + 1,
    liftDoorIn: DOOR_OPEN_AT,
  });
  window.setTimeout(() => {
    set({ liftQueue: get().liftQueue.slice(1) });
    if (get().liftQueue.length) serveLift(get, set);
  }, TRIP_MS);
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
  liftTripAt: 0,
  liftDoorSeq: 0,
  liftDoorIn: 0,

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
    // A snapshot is the whole truth about who is in the building, so every walk
    // in flight is abandoned with it: a departure left running would otherwise
    // delete an agent the server has just told us is still here.
    for (const timer of walkTimers.values()) window.clearTimeout(timer);
    walkTimers.clear();
    set({
      floors: snapshot.floors,
      agents,
      arriving: {},
      leaving: {},
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
        // Nobody materialises in their chair: the car is called first and the
        // agent stays inside it, invisible, until the doors are actually open.
        const eta = Math.min(get().sendLift(agent.floorId, false), MAX_LIFT_WAIT);
        set((s) => ({
          agents: { ...s.agents, [agent.id]: agent },
          arriving: { ...s.arriving, [agent.id]: doorway(agent, eta, WALK_IN_MS) },
        }));
        afterWalk(agent.id, eta + WALK_IN_MS + 60, () =>
          set((s) => ({ arriving: without(s.arriving, agent.id) })),
        );
        break;
      }
      case 'agent.update': {
        const agent = data as Agent;
        set((s) => ({ agents: { ...s.agents, [agent.id]: agent } }));
        break;
      }
      case 'agent.move': {
        const agent = data as Agent;
        // A floor change is a lift ride, so it plays as an arrival on the new
        // floor rather than the agent blinking out of one room into another.
        const changed = state.agents[agent.id]?.floorId !== agent.floorId;
        const eta = changed
          ? Math.min(get().sendLift(agent.floorId, false), MAX_LIFT_WAIT)
          : 0;
        set((s) => ({
          agents: { ...s.agents, [agent.id]: agent },
          arriving: changed
            ? { ...s.arriving, [agent.id]: doorway(agent, eta, WALK_IN_MS) }
            : s.arriving,
        }));
        if (!changed) break;
        afterWalk(agent.id, eta + WALK_IN_MS + 60, () =>
          set((s) => ({ arriving: without(s.arriving, agent.id) })),
        );
        break;
      }
      case 'agent.leave': {
        const { id } = data as { id: string };
        const agent = state.agents[id];
        if (!agent) break;
        // The agent stands up, walks back to the car and rides down (plan 5.3).
        // The walk is timed backwards from the doors so it does not stand in
        // the doorway waiting, nor reach a shaft the car has not arrived at.
        const eta = Math.min(get().sendLift(agent.floorId, false), MAX_LIFT_WAIT);
        const delay = Math.max(0, eta - WALK_OUT_MS);
        set((s) => ({
          arriving: without(s.arriving, id),
          leaving: { ...s.leaving, [id]: doorway(agent, delay, WALK_OUT_MS) },
          openAgent: s.openAgent === id ? null : s.openAgent,
        }));
        afterWalk(id, delay + WALK_OUT_MS + STEP_IN_MS, () => {
          set((s) => ({ agents: without(s.agents, id), leaving: without(s.leaving, id) }));
        });
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
   *
   * The return value is how long it will be until the doors are open on that
   * floor, which is what the passenger's walk is timed against.
   */
  sendLift(floor, focus = true) {
    const state = get();
    const now = Date.now();

    if (focus) {
      const parked = state.liftFloor === floor && !state.liftQueue.length;
      const doorIn = parked ? DOOR_QUICK : DOOR_OPEN_AT;
      set({
        focusFloor: floor,
        focusSeq: state.focusSeq + 1,
        liftFloor: floor,
        liftY: floorTop(state.floors, floor) + CAR_OFFSET,
        liftQueue: [],
        liftTripAt: now,
        liftDoorSeq: state.liftDoorSeq + 1,
        liftDoorIn: doorIn,
      });
      return doorIn;
    }

    // already standing on this floor with nothing queued: just open up
    if (state.liftFloor === floor && !state.liftQueue.length) {
      set({ liftDoorSeq: state.liftDoorSeq + 1, liftDoorIn: DOOR_QUICK });
      return DOOR_QUICK;
    }

    const at = state.liftQueue.indexOf(floor);
    const elapsed = now - state.liftTripAt;
    const remaining = state.liftQueue.length ? Math.max(0, TRIP_MS - elapsed) : 0;

    if (at === 0) {
      // the trip under way is already this one; hold the doors for one more
      const doorIn = Math.max(0, DOOR_OPEN_AT - elapsed);
      set({ liftDoorSeq: state.liftDoorSeq + 1, liftDoorIn: doorIn });
      return doorIn;
    }
    if (at > 0) return remaining + (at - 1) * TRIP_MS + DOOR_OPEN_AT;

    const queue = [...state.liftQueue, floor];
    set({ liftQueue: queue });
    if (queue.length > 1) return remaining + (queue.length - 2) * TRIP_MS + DOOR_OPEN_AT;
    serveLift(get, set);
    return DOOR_OPEN_AT;
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
