import type { CSSProperties, ReactNode } from 'react';
import { css } from '../../scene/css';

/**
 * A positioned character part.
 *
 * Characters are built the same way as the scenery — from positioned divs with
 * radii, skews and gradients — so the markup stays close to the design source.
 */
export function D({
  c,
  style,
  children,
}: {
  c: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return <div style={{ position: 'absolute', ...css(c), ...style }}>{children}</div>;
}

export interface CharacterAnim {
  jolt: string;
  breathe: string;
  armLeft: string;
  armRight: string;
  crt: string;
  screenBg: string;
  screenInk: string;
}

/** Status colours for an agent's monitor, one per kind of work. */
const SCREENS: Record<string, [string, string]> = {
  code: ['oklch(0.2 0.03 250)', 'oklch(0.72 0.1 250)'],
  db: ['oklch(0.2 0.03 30)', 'oklch(0.72 0.12 32)'],
  ops: ['oklch(0.19 0.03 150)', 'oklch(0.74 0.12 150)'],
  test: ['oklch(0.2 0.03 80)', 'oklch(0.8 0.11 84)'],
  doc: ['oklch(0.2 0.02 300)', 'oklch(0.72 0.09 300)'],
  ui: ['oklch(0.24 0.03 200)', 'oklch(0.82 0.1 200)'],
  wait: ['oklch(0.17 0.01 70)', 'oklch(0.42 0.02 70)'],
  dead: ['oklch(0.15 0.01 60)', 'oklch(0.3 0.02 60)'],
};

const FLOOR_SCREEN: Record<string, string> = {
  f5: 'ui',
  f4: 'doc',
  f3: 'test',
  f2: 'ops',
  f1: 'code',
  f0: 'wait',
};

/**
 * Derives every per-character animation from the agent's live status: a working
 * agent types and its monitor scrolls, a waiting one only breathes, a dead one
 * does not move at all.
 */
export function characterAnim(
  status: 'work' | 'wait' | 'dead',
  floorId: string,
  jolting: boolean,
): CharacterAnim {
  const typing = status === 'work' ? 0.44 : 0;
  const kind = status === 'dead' ? 'dead' : status === 'wait' ? 'wait' : FLOOR_SCREEN[floorId] || 'code';
  const [screenBg, screenInk] = SCREENS[kind];
  return {
    jolt: jolting ? 'jolt 0.5s ease-out 0.2s 1 both' : 'none',
    breathe: status === 'dead' ? 'none' : 'breathe 3.4s ease-in-out infinite',
    armLeft: typing ? `typeL ${typing}s ease-in-out infinite alternate` : 'none',
    armRight: typing ? `typeR ${typing}s ease-in-out infinite alternate` : 'none',
    crt: status === 'work' ? 'crt 3.4s linear infinite' : 'none',
    screenBg,
    screenInk,
  };
}

/** The scrolling CRT strip inside every monitor and laptop lid. */
export function Screen({
  anim,
  rows,
}: {
  anim: CharacterAnim;
  rows: Array<[number, number, number]>;
}) {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: anim.screenBg }}>
      <div style={{ animation: anim.crt }}>
        {[...rows, ...rows].map(([width, indent, opacity], i) => (
          <div
            key={i}
            style={{
              height: 3,
              margin: `2px 4px 2px ${4 + indent}px`,
              width: `${width}%`,
              background: anim.screenInk,
              opacity,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const SCREEN_ROWS: Array<[number, number, number]> = [
  [68, 0, 1],
  [44, 6, 0.7],
  [58, 0, 0.85],
  [36, 6, 0.6],
];
