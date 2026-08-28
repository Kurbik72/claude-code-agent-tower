import { box, doorLedge, lit, slabEdge } from './css';
import type { FloorScene } from './types';

/** Floor 04 — the testers: tuxedos, one long meeting table, a scoreboard. */
export const f4: FloorScene = {
  plate: {
    clipPath: 'polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px)',
    background:
      'repeating-linear-gradient(-26.565deg, oklch(0.33 0.03 52) 0 30px, oklch(0.29 0.028 50) 30px 34px)',
  },
  back: [
    slabEdge('oklch(0.19 0.018 48)'),
    box('left:20px;top:260px;width:360px;height:120px;transform-origin:0 100%;transform:skewY(-26.565deg);background:linear-gradient(180deg, oklch(0.3 0.032 46), oklch(0.24 0.026 44))'),
    box('left:380px;top:80px;width:360px;height:120px;transform-origin:0 100%;transform:skewY(26.565deg);background:linear-gradient(180deg, oklch(0.26 0.028 44), oklch(0.21 0.022 42))'),
    box('left:20px;top:296px;width:360px;height:5px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.62 0.08 84 / 0.5)'),
    box('left:380px;top:116px;width:360px;height:5px;transform-origin:0 100%;transform:skewY(26.565deg);background:oklch(0.62 0.08 84 / 0.4)'),
    // mounted on the wall face (top+125..top+245), not floating above it
    box(
      'left:470px;top:132px;width:190px;height:84px;transform-origin:0 0;transform:skewY(26.565deg);background:oklch(0.14 0.012 60);box-shadow:inset 0 0 0 2px oklch(0.44 0.06 82)',
      {
        kids: [
          {
            s: {
              padding: '10px 12px',
              fontSize: 12,
              lineHeight: 1.7,
              letterSpacing: '0.036em',
              color: 'oklch(0.7 0.11 32)',
              whiteSpace: 'pre-line',
            },
            text: 'ПРОВАЛОВ 214\nПРИЧИН 0\nВИНОВНЫХ НЕТ',
          },
        ],
      },
    ),
    box('left:378px;top:100px;width:3px;height:30px;background:oklch(0.4 0.03 60);z-index:700'),
    lit('left:322px;top:122px;width:116px;height:30px;border-radius:6px 6px 58px 58px;z-index:701;background:linear-gradient(180deg, oklch(0.42 0.06 80), oklch(0.3 0.04 70))'),
    lit('left:352px;top:146px;width:56px;height:14px;border-radius:50%;z-index:701;background:oklch(0.95 0.09 88);box-shadow:0 0 60px 24px oklch(0.86 0.1 84 / 0.34)'),
    lit('left:330px;top:154px;width:8px;height:22px;border-radius:4px;z-index:701;background:oklch(0.9 0.08 86 / 0.5)'),
    lit('left:422px;top:154px;width:8px;height:22px;border-radius:4px;z-index:701;background:oklch(0.9 0.08 86 / 0.5)'),
  ],
  front: [
    box('left:0;top:0;width:760px;height:600px;z-index:520;clip-path:polygon(310px 270px, 550px 390px, 490px 420px, 250px 300px);background:linear-gradient(120deg, oklch(0.33 0.055 155), oklch(0.28 0.045 152));pointer-events:none'),
    box('left:0;top:0;width:760px;height:600px;z-index:520;clip-path:polygon(250px 300px, 490px 420px, 490px 446px, 250px 326px);background:oklch(0.24 0.03 48);pointer-events:none'),
    box('left:0;top:0;width:760px;height:600px;z-index:520;clip-path:polygon(550px 390px, 490px 420px, 490px 446px, 550px 416px);background:oklch(0.19 0.024 46);pointer-events:none'),
    box('left:0;top:0;width:760px;height:600px;z-index:521;clip-path:polygon(250px 296px, 310px 266px, 550px 386px, 490px 416px);background:oklch(0.56 0.07 84 / 0.35);pointer-events:none'),
    box('left:352px;top:318px;width:44px;height:22px;z-index:522;transform:skewY(26.565deg);background:oklch(0.9 0.01 92);pointer-events:none'),
    box('left:430px;top:358px;width:44px;height:22px;z-index:522;transform:skewY(26.565deg);background:oklch(0.86 0.01 92);pointer-events:none'),
    box('left:322px;top:296px;width:12px;height:20px;z-index:523;border-radius:2px 2px 5px 5px;background:oklch(0.86 0.02 200 / 0.5);box-shadow:inset 0 0 0 1px oklch(0.94 0.02 200 / 0.7);pointer-events:none'),
    box('left:470px;top:364px;width:12px;height:20px;z-index:523;border-radius:2px 2px 5px 5px;background:oklch(0.86 0.02 200 / 0.5);box-shadow:inset 0 0 0 1px oklch(0.94 0.02 200 / 0.7);pointer-events:none'),
    doorLedge,
  ],
  darkClip: 'polygon(20px 260px, 380px 80px, 740px 260px, 740px 400px, 380px 580px, 20px 400px)',
  darkFill: 'oklch(0.1 0.012 60 / 0.95)',
};
