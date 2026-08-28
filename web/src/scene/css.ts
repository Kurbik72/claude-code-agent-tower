import type { CSSProperties } from 'react';
import type { Prop } from './types';

const NUMERIC = new Set([
  'zIndex',
  'opacity',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'fontWeight',
]);

/**
 * Parses the design's own CSS text into a React style object.
 *
 * The scenery is transcribed from `Agent Tower.dc.html` one declaration block
 * at a time; keeping the source text intact makes a diff against the design
 * readable, which matters for a pixel-accurate port.
 */
export function css(text: string): CSSProperties {
  const style: Record<string, string | number> = {};
  for (const chunk of text.split(';')) {
    const at = chunk.indexOf(':');
    if (at < 0) continue;
    const name = chunk.slice(0, at).trim();
    const value = chunk.slice(at + 1).trim();
    if (!name || !value) continue;
    const key = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    style[key] = NUMERIC.has(key) ? Number(value) : value;
  }
  return style as CSSProperties;
}

/** A positioned scenery box. Everything in a floor wrapper is absolute. */
export function box(text: string, extra: Omit<Prop, 's'> = {}): Prop {
  return { s: { position: 'absolute', ...css(text) }, ...extra };
}

/** Same, but only drawn while the floor's light is on. */
export function lit(text: string, extra: Omit<Prop, 's' | 'when'> = {}): Prop {
  return box(text, { ...extra, when: 'lit' });
}

/** Same, but only drawn while the floor is dark. */
export function dark(text: string, extra: Omit<Prop, 's' | 'when'> = {}): Prop {
  return box(text, { ...extra, when: 'dark' });
}

/** The 20px-thick side of a floor plate, identical on every floor but the fill. */
export function slabEdge(fill: string): Prop {
  return box(
    `left:0;top:0;width:760px;height:600px;clip-path:polygon(20px 380px, 380px 560px, 740px 380px, 740px 400px, 380px 580px, 20px 400px);background:${fill}`,
  );
}

/** The little ledge that carries the elevator doors, shared by every floor. */
export const doorLedge = box(
  'left:740px;top:374px;width:66px;height:10px;background:linear-gradient(180deg, oklch(0.44 0.02 74), oklch(0.26 0.016 66))',
);

/** The four ceiling bulbs stepped along the isometric axis. */
export function ceilingLights(railCss: string, first: [number, number]): Prop[] {
  const [x, y] = first;
  const out: Prop[] = [lit(railCss)];
  for (let i = 0; i < 4; i++) {
    out.push(
      lit(
        `left:${x + i * 70}px;top:${y - i * 34}px;width:11px;height:11px;border-radius:50%;background:oklch(0.94 0.1 88);box-shadow:0 0 18px 6px oklch(0.9 0.11 86 / 0.5)`,
      ),
    );
  }
  return out;
}
