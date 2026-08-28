import { box, doorLedge, lit, slabEdge } from './css';
import type { FloorScene } from './types';

const rainStreak = (left: string, height: number, dur: string, delay: string) => ({
  s: {
    position: 'absolute' as const,
    left,
    top: 0,
    width: 1,
    height,
    background: 'oklch(0.72 0.02 240 / 0.4)',
    animation: `rain ${dur} linear infinite ${delay}`,
  },
});

/** Floor 01 — the basement: one bulb, a window on the dump, a quarterly plan. */
export const f1: FloorScene = {
  plate: {
    clipPath: 'polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px)',
    background: 'linear-gradient(180deg, oklch(0.25 0.016 68), oklch(0.19 0.012 64))',
  },
  back: [
    box('left:0;top:0;width:760px;height:600px;clip-path:polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px);opacity:0.4;pointer-events:none;background-image:repeating-linear-gradient(26.565deg, oklch(0.14 0.01 60) 0 1px, transparent 1px 46px), repeating-linear-gradient(-26.565deg, oklch(0.14 0.01 60) 0 1px, transparent 1px 46px)'),
    slabEdge('oklch(0.15 0.01 62)'),
    box(
      'left:20px;top:250px;width:360px;height:130px;transform-origin:0 100%;transform:skewY(-26.565deg);overflow:hidden;background:linear-gradient(180deg, oklch(0.21 0.014 68), oklch(0.26 0.016 68))',
      {
        kids: [
          {
            s: {
              position: 'absolute',
              inset: 0,
              opacity: 0.5,
              backgroundImage:
                'repeating-linear-gradient(0deg, oklch(0.14 0.01 60) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, oklch(0.14 0.01 60) 0 1px, transparent 1px 46px)',
            },
          },
          {
            s: {
              position: 'absolute',
              left: 40,
              top: 26,
              width: 190,
              height: 86,
              padding: 7,
              background: 'oklch(0.17 0.012 62)',
              boxShadow: 'inset 0 0 0 2px oklch(0.24 0.02 62)',
            },
            kids: [
              {
                s: {
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  background:
                    'linear-gradient(180deg, oklch(0.25 0.03 252), oklch(0.19 0.02 92))',
                },
                kids: [
                  { s: { position: 'absolute', left: '8%', bottom: '8%', width: 46, height: 22, background: 'oklch(0.26 0.035 150)' } },
                  { s: { position: 'absolute', left: '6%', bottom: 26, width: 52, height: 5, background: 'oklch(0.32 0.04 150)' } },
                  { s: { position: 'absolute', left: '44%', bottom: '4%', width: 20, height: 9, borderRadius: '50%', background: 'oklch(0.22 0.02 90)' } },
                  { s: { position: 'absolute', left: '70%', bottom: '6%', width: 3, height: '42%', background: 'oklch(0.27 0.02 80)' } },
                  { s: { position: 'absolute', left: '66%', bottom: '44%', width: 16, height: 8, borderRadius: '40% 40% 20% 20%', background: 'oklch(0.58 0.09 82)', boxShadow: '0 6px 22px 5px oklch(0.6 0.09 82 / 0.3)' } },
                  rainStreak('12%', 18, '0.72s', '0s'),
                  rainStreak('38%', 22, '0.64s', '0.3s'),
                  rainStreak('62%', 16, '0.82s', '0.15s'),
                  rainStreak('86%', 20, '0.7s', '0.45s'),
                  { s: { position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0 88px, oklch(0.16 0.012 62) 88px 94px)' } },
                ],
              },
            ],
          },
          {
            s: { position: 'absolute', left: 40, top: 118, fontSize: 9, letterSpacing: '0.09em', color: 'oklch(0.42 0.012 80)' },
            text: 'ВИД НА ПОМОЙКУ',
          },
        ],
      },
    ),
    box(
      'left:380px;top:70px;width:360px;height:130px;transform-origin:0 100%;transform:skewY(26.565deg);overflow:hidden;background:linear-gradient(180deg, oklch(0.185 0.012 66), oklch(0.235 0.014 66))',
      {
        kids: [
          { s: { position: 'absolute', inset: 0, opacity: 0.45, backgroundImage: 'repeating-linear-gradient(0deg, oklch(0.13 0.01 60) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, oklch(0.13 0.01 60) 0 1px, transparent 1px 46px)' } },
          { s: { position: 'absolute', left: 0, top: 18, width: '100%', height: 10, background: 'linear-gradient(180deg, oklch(0.33 0.022 64), oklch(0.19 0.014 60))' } },
          { s: { position: 'absolute', left: 0, top: 38, width: '100%', height: 6, background: 'linear-gradient(180deg, oklch(0.3 0.03 42), oklch(0.17 0.02 40))' } },
          {
            s: { position: 'absolute', left: 34, top: 62, width: 116, height: 60, background: 'oklch(0.22 0.014 64)', boxShadow: 'inset 0 0 0 1px oklch(0.3 0.02 64)' },
            kids: [
              {
                s: { padding: '7px 8px', fontSize: 9, lineHeight: 1.6, letterSpacing: '0.027em', color: 'oklch(0.56 0.06 76)', whiteSpace: 'pre-line' },
                text: 'ПЛАН НА КВАРТАЛ\n— больше агентов\n— окно не открывать',
              },
            ],
          },
        ],
      },
    ),
    box('left:378px;top:100px;width:3px;height:50px;background:oklch(0.3 0.02 70);z-index:700'),
    box('left:344px;top:146px;width:72px;height:32px;border-radius:50% 50% 42% 42%;z-index:701;background:linear-gradient(180deg, oklch(0.36 0.02 70), oklch(0.24 0.016 66))'),
    lit('left:366px;top:172px;width:28px;height:28px;border-radius:50%;z-index:701;background:oklch(0.92 0.09 88);box-shadow:0 0 44px 18px oklch(0.82 0.11 84 / 0.4), 0 0 140px 70px oklch(0.7 0.1 82 / 0.14)'),
  ],
  front: [doorLedge],
  darkClip: 'polygon(20px 250px, 380px 70px, 740px 250px, 740px 400px, 380px 580px, 20px 400px)',
  darkFill: 'oklch(0.09 0.008 60 / 0.95)',
  lampAnimation: 'bulb 4.2s linear infinite',
};
