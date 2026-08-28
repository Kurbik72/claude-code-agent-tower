import { D } from './characters/parts';

/**
 * Sky, sun, clouds, stars, neighbouring blocks and the ground behind the tower.
 * Purely decorative; it scales with the world so the tower never floats.
 */
export function Backdrop({ height }: { height: number }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1180,
          height,
          background:
            'linear-gradient(180deg, oklch(0.86 0.07 210) 0%, oklch(0.8 0.07 216) 8%, oklch(0.62 0.09 236) 18%, oklch(0.32 0.07 258) 34%, oklch(0.17 0.03 260) 52%, oklch(0.12 0.014 258) 72%, oklch(0.1 0.008 60) 100%)',
        }}
      />
      <D c="left:968px;top:62px;width:84px;height:84px;border-radius:50%;background:radial-gradient(circle, oklch(0.99 0.08 96), oklch(0.94 0.1 92) 46%, transparent 72%);box-shadow:0 0 140px 60px oklch(0.95 0.09 92 / 0.35)" />
      <D c="left:130px;top:150px;width:220px;height:30px;border-radius:50%;background:oklch(0.98 0.01 240 / 0.5)" />
      <D c="left:620px;top:106px;width:150px;height:22px;border-radius:50%;background:oklch(0.98 0.01 240 / 0.36)" />
      <D c="left:90px;top:620px;width:3px;height:3px;border-radius:50%;background:oklch(0.95 0.02 240);animation:twinkle 4s ease-in-out infinite" />
      <D c="left:1080px;top:700px;width:3px;height:3px;border-radius:50%;background:oklch(0.95 0.02 240);animation:twinkle 5.6s ease-in-out infinite 1s" />
      <D c="left:160px;top:1020px;width:2px;height:2px;border-radius:50%;background:oklch(0.9 0.02 240);animation:twinkle 6.4s ease-in-out infinite 2s" />
      <D c="left:1040px;top:1240px;width:2px;height:2px;border-radius:50%;background:oklch(0.9 0.02 240);animation:twinkle 5.1s ease-in-out infinite 0.6s" />

      <D c="left:0;top:1640px;width:200px;height:560px;background:oklch(0.13 0.014 258)" />
      <D c="left:24px;top:1700px;width:8px;height:8px;background:oklch(0.66 0.1 84 / 0.55)" />
      <D c="left:52px;top:1760px;width:8px;height:8px;background:oklch(0.66 0.1 84 / 0.4)" />
      <D c="left:120px;top:1820px;width:8px;height:8px;background:oklch(0.66 0.1 84 / 0.5)" />
      <D c="left:1020px;top:1720px;width:160px;height:480px;background:oklch(0.125 0.012 258)" />
      <D c="left:1120px;top:1780px;width:8px;height:8px;background:oklch(0.66 0.1 84 / 0.45)" />
      <D c="left:1148px;top:1860px;width:8px;height:8px;background:oklch(0.66 0.1 84 / 0.35)" />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: height - 410,
          width: 1180,
          height: 50,
          background:
            'repeating-linear-gradient(45deg, oklch(0.17 0.016 50) 0 4px, oklch(0.14 0.012 48) 4px 10px)',
        }}
      />
    </>
  );
}
