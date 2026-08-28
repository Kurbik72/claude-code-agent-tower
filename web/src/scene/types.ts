import type { CSSProperties, ReactNode } from 'react';

/**
 * One positioned element of a floor's scenery.
 *
 * The tower is built entirely from `div`s with clip-paths, skews and gradients
 * — there are no assets — so the geometry itself is the content. Keeping it as
 * data rather than nested JSX makes each floor readable and lets the renderer
 * handle the lit/dark variants uniformly.
 */
export interface Prop {
  /** Inline geometry: position, size, clip-path, gradient. */
  s: CSSProperties;
  /** Render only when the floor's light is on / off. */
  when?: 'lit' | 'dark';
  text?: ReactNode;
  kids?: Prop[];
  /** Named hook the floor component fills in (e.g. the DevOps ticket number). */
  slot?: string;
}

export interface FloorScene {
  /** The clickable plate. */
  plate: CSSProperties;
  /** Everything drawn behind the agents. */
  back: Prop[];
  /** Everything drawn in front of the agents (tables, counters, overlays). */
  front: Prop[];
  /** Clip-path of the "lights off" curtain for this floor. */
  darkClip: string;
  darkFill: string;
  /** Ceiling lamp animation, if this floor's lamp flickers. */
  lampAnimation?: string;
}
