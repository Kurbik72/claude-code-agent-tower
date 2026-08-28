import { box, doorLedge, lit, slabEdge } from './css';
import type { FloorScene } from './types';

/** Floor 02 — DevOps reception: a ticket counter and a queue on the floor. */
export const f2: FloorScene = {
  plate: {
    clipPath: 'polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px)',
    background: 'oklch(0.44 0.026 96)',
  },
  back: [
    box('left:0;top:0;width:760px;height:600px;clip-path:polygon(380px 200px, 740px 380px, 380px 560px, 20px 380px);opacity:0.5;pointer-events:none;background-image:repeating-linear-gradient(26.565deg, oklch(0.36 0.02 92) 0 1px, transparent 1px 46px), repeating-linear-gradient(-26.565deg, oklch(0.36 0.02 92) 0 1px, transparent 1px 46px)'),
    slabEdge('oklch(0.28 0.02 92)'),
    box('left:20px;top:270px;width:360px;height:110px;transform-origin:0 100%;transform:skewY(-26.565deg);background:linear-gradient(180deg, oklch(0.56 0.038 166) 0 60%, oklch(0.42 0.036 168) 60%)'),
    box('left:380px;top:90px;width:360px;height:110px;transform-origin:0 100%;transform:skewY(26.565deg);background:linear-gradient(180deg, oklch(0.5 0.034 166) 0 60%, oklch(0.38 0.032 168) 60%)'),
    box('left:20px;top:336px;width:360px;height:4px;transform-origin:0 100%;transform:skewY(-26.565deg);background:oklch(0.32 0.03 168)'),
    box('left:380px;top:156px;width:360px;height:4px;transform-origin:0 100%;transform:skewY(26.565deg);background:oklch(0.3 0.028 168)'),
    // mounted on the wall face (top+126..top+236), not floating above it
    box(
      'left:452px;top:140px;width:170px;height:60px;transform-origin:0 0;transform:skewY(26.565deg);background:oklch(0.16 0.014 150);box-shadow:inset 0 0 0 2px oklch(0.34 0.03 160)',
      {
        kids: [
          {
            s: { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 },
            kids: [
              {
                s: { fontSize: 9, letterSpacing: '0.09em', color: 'oklch(0.6 0.06 150)' },
                text: 'ТАЛОН',
              },
              {
                s: {
                  fontFamily: 'var(--display)',
                  fontWeight: 700,
                  fontSize: 26,
                  lineHeight: 1,
                  color: 'oklch(0.84 0.16 142)',
                },
                slot: 'ticket',
              },
            ],
          },
        ],
      },
    ),
    box(
      'left:96px;top:268px;width:150px;height:40px;transform-origin:0 0;transform:skewY(-26.565deg);background:oklch(0.94 0.014 96);box-shadow:inset 0 0 0 1px oklch(0.7 0.02 92)',
      {
        kids: [
          {
            s: {
              padding: '6px 8px',
              fontSize: 9,
              lineHeight: 1.5,
              letterSpacing: '0.036em',
              color: 'oklch(0.32 0.03 40)',
              whiteSpace: 'pre-line',
            },
            text: 'ЗАЯВКИ НА ДЕПЛОЙ\nТОЛЬКО ПО ТАЛОНАМ',
          },
        ],
      },
    ),
    box('left:378px;top:100px;width:3px;height:30px;background:oklch(0.42 0.02 100);z-index:700'),
    lit('left:296px;top:126px;width:168px;height:18px;z-index:701;background:oklch(0.94 0.02 200);box-shadow:0 0 60px 22px oklch(0.9 0.03 200 / 0.26)'),
  ],
  front: [
    // The reception desk, shifted 40/15 up the isometric axis and 40/20 shorter
    // at the far end. The design's desk crossed the plate's front-right edge
    // (x/2 + y = 750) and hung its whole right end over the void.
    box('left:0;top:0;width:760px;height:600px;z-index:520;clip-path:polygon(390px 315px, 580px 410px, 530px 435px, 340px 340px);background:linear-gradient(120deg, oklch(0.58 0.05 62), oklch(0.5 0.045 60));pointer-events:none'),
    box('left:0;top:0;width:760px;height:600px;z-index:520;clip-path:polygon(340px 340px, 530px 435px, 530px 479px, 340px 384px);background:oklch(0.4 0.035 58);pointer-events:none'),
    box('left:0;top:0;width:760px;height:600px;z-index:520;clip-path:polygon(580px 410px, 530px 435px, 530px 479px, 580px 454px);background:oklch(0.32 0.03 56);pointer-events:none'),
    box('left:0;top:0;width:760px;height:600px;z-index:521;clip-path:polygon(340px 336px, 390px 311px, 580px 406px, 530px 431px);background:oklch(0.72 0.05 90 / 0.5);pointer-events:none'),
    box('left:412px;top:341px;width:40px;height:20px;z-index:522;transform:skewY(26.565deg);background:oklch(0.9 0.02 96);pointer-events:none'),
    box('left:480px;top:375px;width:30px;height:26px;z-index:522;transform:skewY(26.565deg);background:oklch(0.28 0.02 90);pointer-events:none'),
    doorLedge,
  ],
  darkClip: 'polygon(20px 270px, 380px 90px, 740px 270px, 740px 400px, 380px 580px, 20px 400px)',
  darkFill: 'oklch(0.11 0.012 60 / 0.96)',
  lampAnimation: 'fluor 7s linear infinite',
};
