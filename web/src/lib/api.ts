import type { AgentDetail, Snapshot } from './types';
import { useTower } from '../store/tower';

const PATCH_EVENTS = [
  'agent.enter',
  'agent.update',
  'agent.move',
  'agent.leave',
  'event.append',
  'stats.update',
  'tools.update',
  'thinking.append',
];

export async function fetchState(): Promise<Snapshot> {
  const response = await fetch('/api/state');
  if (!response.ok) throw new Error(`state ${response.status}`);
  return response.json();
}

export async function focusAgent(id: string, on: boolean): Promise<AgentDetail | null> {
  const response = await fetch(`/api/focus/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ on }),
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body && 'thinking' in body ? (body as AgentDetail) : null;
}

/**
 * Opens the SSE stream and keeps the store in sync.
 *
 * `EventSource` reconnects on its own and replays `Last-Event-ID`; when the
 * server answers `resync` the id has aged out of its ring buffer and we take a
 * fresh snapshot instead.
 */
export function connectStream(): () => void {
  const store = useTower.getState;
  const source = new EventSource('/api/stream');

  const resync = () => {
    useTower.setState({ resyncing: true });
    fetchState()
      .then((snapshot) => store().applySnapshot(snapshot))
      .catch(() => {});
  };

  source.addEventListener('open', () => store().setConnected(true));
  source.addEventListener('error', () => store().setConnected(false));
  source.addEventListener('resync', resync);

  for (const type of PATCH_EVENTS) {
    source.addEventListener(type, (event) => {
      const message = event as MessageEvent<string>;
      try {
        store().applyPatch(type, JSON.parse(message.data));
      } catch {
        // a malformed frame is not worth dropping the connection over
      }
    });
  }

  return () => source.close();
}
