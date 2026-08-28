import { box, ceilingLights, doorLedge, slabEdge } from './css';
import type { FloorScene } from './types';

/**
 * Floor 00 — "пересменка", the overflow floor.
 *
 * Not part of the original design: it exists so a floor over capacity has
 * somewhere to send its waiting agents (plan 5.2). It borrows floor 01's
 * construction with a neutral accent and no themed furniture.
 */
export const f0: FloorScene = {
  plate: {
    clipPath: 'polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px)',
    background: 'linear-gradient(180deg, oklch(0.27 0.012 78), oklch(0.21 0.01 76))',
  },
  back: [
    box('left:0;top:0;width:760px;height:600px;clip-path:polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px);opacity:0.4;pointer-events:none;background-image:repeating-linear-gradient(26.565deg, oklch(0.15 0.008 74) 0 1px, transparent 1px 46px), repeating-linear-gradient(-26.565deg, oklch(0.15 0.008 74) 0 1px, transparent 1px 46px)'),
    slabEdge('oklch(0.16 0.008 74)'),
    box('left:20px;top:260px;width:360px;height:120px;transform-origin:0 100%;transform:skewY(-26.565deg);background:linear-gradient(180deg, oklch(0.22 0.01 78), oklch(0.27 0.012 78))'),
    box('left:380px;top:80px;width:360px;height:120px;transform-origin:0 100%;transform:skewY(26.565deg);background:linear-gradient(180deg, oklch(0.2 0.01 76), oklch(0.25 0.012 76))'),
    box('left:20px;top:296px;width:360px;height:4px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.6 0.014 80 / 0.4)'),
    box('left:380px;top:116px;width:360px;height:4px;transform-origin:0 100%;transform:skewY(26.565deg);background:oklch(0.6 0.014 80 / 0.35)'),
    ...ceilingLights(
      'left:60px;top:236px;width:300px;height:4px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.4 0.014 78)',
      [96, 262],
    ),
  ],
  front: [doorLedge],
  darkClip: 'polygon(20px 260px, 380px 80px, 740px 260px, 740px 400px, 380px 580px, 20px 400px)',
  darkFill: 'oklch(0.1 0.008 74 / 0.95)',
};
