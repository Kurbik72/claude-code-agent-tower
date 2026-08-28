import { useEffect } from 'react';
import { D } from './characters/parts';
import { useTower } from '../store/tower';

const FLOOR_X = 240;

/**
 * The whip crack. Decoration only — see plan 9.2 — but the timings and the
 * segment chain come straight from the design so it lands the same way.
 */
export function Strike() {
  const strike = useTower((s) => s.strike);
  const agent = useTower((s) => (s.strike ? s.agents[s.strike.agentId] : undefined));
  const floors = useTower((s) => s.floors);
  const clearStrike = useTower((s) => s.clearStrike);

  useEffect(() => {
    if (!strike) return;
    const timer = window.setTimeout(clearStrike, 1600);
    return () => window.clearTimeout(timer);
  }, [strike, clearStrike]);

  if (!strike || !agent) return null;
  const floor = floors.find((f) => f.id === agent.floorId);
  if (!floor) return null;

  const x = FLOOR_X + agent.x;
  const y = floor.top + agent.y - (agent.floorId === 'f5' ? 96 : 120);

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 900, pointerEvents: 'none' }}>
      <D c="left:0;top:-124px;width:0;height:0" style={{ animation: 'whipEnter 0.8s ease-out 1 both' }}>
        <D
          c="left:-5px;top:0;width:10px;height:30px;border-radius:4px;transform-origin:50% 0;background:linear-gradient(180deg, oklch(0.32 0.04 42), oklch(0.22 0.03 40))"
          style={{ animation: 'handleSwing 0.62s cubic-bezier(0.24,0.9,0.32,1) 1 both' }}
        >
          <D
            c="left:1.5px;top:28px;width:7px;height:38px;border-radius:4px;transform-origin:50% 0;background:linear-gradient(180deg, oklch(0.44 0.05 44), oklch(0.52 0.07 46))"
            style={{ animation: 'lashSeg 0.62s cubic-bezier(0.24,0.9,0.32,1) 0.04s 1 both' }}
          >
            <D
              c="left:1px;top:36px;width:5px;height:32px;border-radius:3px;transform-origin:50% 0;background:linear-gradient(180deg, oklch(0.56 0.08 48), oklch(0.66 0.1 54))"
              style={{ animation: 'lashSeg 0.62s cubic-bezier(0.24,0.9,0.32,1) 0.08s 1 both' }}
            >
              <D
                c="left:0.8px;top:30px;width:3px;height:24px;border-radius:2px;transform-origin:50% 0;background:linear-gradient(180deg, oklch(0.66 0.1 52), oklch(0.78 0.11 62))"
                style={{ animation: 'lashTip 0.62s cubic-bezier(0.24,0.9,0.32,1) 0.12s 1 both' }}
              />
            </D>
          </D>
        </D>
      </D>
      <D
        c="left:-26px;top:-16px;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle, oklch(0.99 0.1 92 / 0.95), oklch(0.82 0.14 70 / 0.3) 44%, transparent 70%)"
        style={{ animation: 'flash 0.46s ease-out 0.28s 1 both' }}
      />
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: -52,
          fontFamily: 'var(--display)',
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: '0.023em',
          whiteSpace: 'nowrap',
          color: 'oklch(0.9 0.13 72)',
          animation: 'bubble 1.15s ease-out 0.3s 1 both',
        }}
      >
        {strike.cry}
      </div>
    </div>
  );
}
