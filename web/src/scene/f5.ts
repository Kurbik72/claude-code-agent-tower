import { box, ceilingLights, dark, doorLedge, lit, slabEdge } from './css';
import type { FloorScene } from './types';

/** Floor 05 — the terrace: glass walls, a parasol, planters, sun. */
export const f5: FloorScene = {
  plate: {
    clipPath: 'polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px)',
    background:
      'repeating-linear-gradient(26.565deg, oklch(0.68 0.055 70) 0 26px, oklch(0.62 0.05 68) 26px 30px)',
  },
  back: [
    slabEdge('oklch(0.34 0.03 62)'),
    box('left:20px;top:310px;width:360px;height:70px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.86 0.03 208 / 0.22);box-shadow:inset 0 0 0 1px oklch(0.9 0.02 200 / 0.4)'),
    box('left:380px;top:130px;width:360px;height:70px;transform-origin:0 100%;transform:skewY(26.565deg);background:oklch(0.86 0.03 208 / 0.22);box-shadow:inset 0 0 0 1px oklch(0.9 0.02 200 / 0.4)'),
    box('left:20px;top:304px;width:360px;height:7px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.9 0.02 200)'),
    box('left:380px;top:124px;width:360px;height:7px;transform-origin:0 100%;transform:skewY(26.565deg);background:oklch(0.9 0.02 200)'),
    ...ceilingLights(
      'left:60px;top:236px;width:300px;height:4px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.5 0.02 70)',
      [96, 262],
    ),
    box('left:604px;top:236px;width:10px;height:190px;background:oklch(0.72 0.02 84);z-index:430'),
    lit('left:494px;top:196px;width:230px;height:56px;border-radius:115px 115px 10px 10px;z-index:431;background:repeating-conic-gradient(from 0deg at 50% 100%, oklch(0.66 0.12 196) 0deg 18deg, oklch(0.95 0.02 96) 18deg 36deg)'),
    dark('left:592px;top:148px;width:26px;height:98px;border-radius:13px 13px 5px 5px;z-index:431;background:linear-gradient(180deg, oklch(0.28 0.045 200), oklch(0.2 0.03 200))'),
    box('left:150px;top:372px;width:46px;height:52px;border-radius:4px 4px 10px 10px;z-index:400;background:oklch(0.52 0.1 46)'),
    box('left:154px;top:322px;width:38px;height:56px;border-radius:19px 6px 19px 6px;transform-origin:50% 100%;z-index:399;background:oklch(0.56 0.13 148);animation:sway 5.4s ease-in-out infinite'),
    box('left:128px;top:344px;width:42px;height:40px;border-radius:21px 6px 21px 6px;transform-origin:80% 100%;z-index:399;background:oklch(0.62 0.14 152);animation:sway 6.8s ease-in-out infinite 0.6s'),
    box('left:580px;top:360px;width:40px;height:46px;border-radius:4px 4px 9px 9px;z-index:406;background:oklch(0.52 0.1 46)'),
    box('left:584px;top:318px;width:32px;height:46px;border-radius:16px 5px 16px 5px;transform-origin:50% 100%;z-index:405;background:oklch(0.6 0.13 150);animation:sway 6.1s ease-in-out infinite 1.2s'),
  ],
  front: [doorLedge],
  darkClip: 'polygon(20px 310px, 380px 130px, 740px 310px, 740px 400px, 380px 580px, 20px 400px)',
  darkFill: 'linear-gradient(180deg, oklch(0.16 0.03 262 / 0.95), oklch(0.11 0.02 258 / 0.97))',
};
