import { box, doorLedge, lit, slabEdge } from './css';
import type { FloorScene } from './types';

/** Floor 03 — QA in the kitchen: tiles, a counter, a pot of borsch, steam. */
export const f3: FloorScene = {
  plate: {
    clipPath: 'polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px)',
    background: 'oklch(0.5 0.03 62)',
  },
  back: [
    box('left:0;top:0;width:760px;height:600px;clip-path:polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px);opacity:0.6;pointer-events:none;background-image:repeating-linear-gradient(26.565deg, oklch(0.6 0.02 66) 0 34px, transparent 34px 68px), repeating-linear-gradient(-26.565deg, oklch(0.34 0.02 60 / 0.5) 0 2px, transparent 2px 34px)'),
    slabEdge('oklch(0.3 0.02 58)'),
    box('left:20px;top:260px;width:360px;height:120px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.74 0.014 200);background-image:repeating-linear-gradient(0deg, oklch(0.6 0.014 200) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, oklch(0.6 0.014 200) 0 1px, transparent 1px 26px)'),
    box('left:380px;top:80px;width:360px;height:120px;transform-origin:0 100%;transform:skewY(26.565deg);background:oklch(0.68 0.014 200);background-image:repeating-linear-gradient(0deg, oklch(0.56 0.014 200) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, oklch(0.56 0.014 200) 0 1px, transparent 1px 26px)'),
    box('left:60px;top:268px;width:200px;height:12px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.42 0.03 60)'),
    box('left:84px;top:240px;width:22px;height:30px;transform:skewY(-26.565deg);background:oklch(0.6 0.14 24)'),
    box('left:116px;top:258px;width:22px;height:26px;transform:skewY(-26.565deg);background:oklch(0.66 0.11 96)'),
    box('left:148px;top:272px;width:22px;height:28px;transform:skewY(-26.565deg);background:oklch(0.5 0.1 148)'),
    // the wall's face runs top+125..top+245 at the same skew, so the cupboard
    // has to start inside that band: the design's top:100 hung it in mid-air
    box('left:470px;top:150px;width:180px;height:44px;transform-origin:0 0;transform:skewY(26.565deg);background:linear-gradient(180deg, oklch(0.6 0.012 240), oklch(0.46 0.01 240));box-shadow:0 6px 18px oklch(0.2 0.01 60 / 0.4)'),
    box('left:378px;top:100px;width:3px;height:50px;background:oklch(0.5 0.02 200);z-index:700'),
    lit('left:300px;top:146px;width:160px;height:14px;border-radius:7px;z-index:701;background:oklch(0.96 0.03 200);box-shadow:0 0 70px 26px oklch(0.92 0.05 96 / 0.3)'),
    box('left:0;top:0;width:760px;height:600px;z-index:380;clip-path:polygon(560px 320px, 664px 372px, 604px 402px, 500px 350px);background:linear-gradient(120deg, oklch(0.62 0.012 240), oklch(0.5 0.01 240));pointer-events:none'),
    box('left:0;top:0;width:760px;height:600px;z-index:380;clip-path:polygon(500px 350px, 604px 402px, 604px 448px, 500px 396px);background:oklch(0.42 0.01 240);pointer-events:none'),
    box('left:0;top:0;width:760px;height:600px;z-index:380;clip-path:polygon(664px 372px, 604px 402px, 604px 448px, 664px 418px);background:oklch(0.34 0.01 240);pointer-events:none'),
    box('left:526px;top:322px;width:96px;height:48px;border-radius:50%;z-index:381;background:linear-gradient(180deg, oklch(0.42 0.012 240), oklch(0.3 0.01 240));box-shadow:inset 0 0 0 3px oklch(0.56 0.012 240);pointer-events:none'),
    box('left:536px;top:328px;width:76px;height:34px;border-radius:50%;z-index:382;background:radial-gradient(ellipse, oklch(0.52 0.19 24), oklch(0.4 0.16 22) 74%);pointer-events:none'),
    box('left:552px;top:334px;width:14px;height:8px;border-radius:50%;z-index:383;background:oklch(0.78 0.1 96 / 0.7);pointer-events:none'),
    box('left:584px;top:340px;width:10px;height:6px;border-radius:50%;z-index:383;background:oklch(0.7 0.12 30 / 0.8);pointer-events:none'),
    lit('left:556px;top:300px;width:26px;height:26px;border-radius:50%;z-index:384;background:oklch(0.9 0.02 90 / 0.5);animation:steam 4.2s ease-out infinite;pointer-events:none'),
    lit('left:578px;top:306px;width:20px;height:20px;border-radius:50%;z-index:384;background:oklch(0.9 0.02 90 / 0.45);animation:steam 5.1s ease-out infinite 1.4s;pointer-events:none'),
    lit('left:540px;top:310px;width:16px;height:16px;border-radius:50%;z-index:384;background:oklch(0.9 0.02 90 / 0.4);animation:steam 4.7s ease-out infinite 2.6s;pointer-events:none'),
  ],
  front: [doorLedge],
  darkClip: 'polygon(20px 260px, 380px 80px, 740px 260px, 740px 400px, 380px 580px, 20px 400px)',
  darkFill: 'oklch(0.11 0.012 60 / 0.95)',
};
