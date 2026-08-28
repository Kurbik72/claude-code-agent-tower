export type Status = 'work' | 'wait' | 'dead';
export type FloorId = 'f5' | 'f4' | 'f3' | 'f2' | 'f1' | 'f0';
export type ToolStatus = 'ок' | 'идёт' | 'ждёт' | 'упал';

export interface Floor {
  id: FloorId;
  num: string;
  key: string;
  top: number;
  tone: string;
  noWhip: boolean;
  overflow: boolean;
  capacity: number;
}

export interface Classification {
  floor: string;
  confidence: number;
  reason: string;
  source?: string;
}

export interface Agent {
  id: string;
  kind: 'session' | 'subagent';
  name: string;
  role: string;
  project: string;
  task: string;
  status: Status;
  floorId: FloorId;
  slotIndex: number;
  x: number;
  y: number;
  z: number;
  unknownFloor: boolean;
  classification: Classification | null;
  tokens: number;
  contextPct: number;
  lastEventAt: number;
}

export interface FeedEvent {
  id: number;
  at: number;
  kind: string;
  params: Record<string, unknown>;
}

export interface Stats {
  shift: number;
  lit: number;
  dark: number;
  floorCount: number;
  tokens: number;
  events: number;
  projects: number;
  overflowUsed: boolean;
  parseErrors: number;
}

export interface Warning {
  code: string;
  params?: Record<string, unknown>;
}

export interface ThinkingLine {
  id: string;
  text: string;
  at: number;
}

export interface ToolRow {
  id: string;
  name: string;
  label: string;
  status: ToolStatus;
  at: number;
}

export interface AgentDetail {
  agentId: string;
  thinking: ThinkingLine[];
  tools: ToolRow[];
  contextPct: number;
}

export interface Snapshot {
  floors: Floor[];
  agents: Agent[];
  events: FeedEvent[];
  stats: Stats;
  warnings: Warning[];
  serverTime: number;
}
