import type { CharacterAnim } from './parts';
import { D, Screen, SCREEN_ROWS } from './parts';

/**
 * One character per floor, transcribed from `Agent Tower.dc.html`.
 *
 * Each floor has its own body: a sunbather on the terrace, a tuxedo in the
 * meeting room, a chef in the kitchen, a clerk at reception and a hunched
 * figure at a monitor in the basement. Floor 00 gets a neutral stand-in.
 */

export interface CharacterProps {
  anim: CharacterAnim;
}

/** Floor 05 — lying on a lounger, rotated onto the isometric axis. */
export function Terrace({ anim }: CharacterProps) {
  return (
    <D c="left:0;top:0;width:200px;height:200px;transform-origin:100px 150px;transform:rotate(-26.565deg)">
      <D c="left:8px;top:137px;width:186px;height:24px;border-radius:50%;background:radial-gradient(ellipse, oklch(0.34 0.03 60 / 0.42), transparent 72%)" />
      <D c="left:30px;top:129px;width:9px;height:21px;border-radius:0 0 3px 3px;background:oklch(0.46 0.04 58)" />
      <D c="left:124px;top:129px;width:9px;height:21px;border-radius:0 0 3px 3px;background:oklch(0.42 0.038 56)" />
      <D c="left:18px;top:126px;width:128px;height:9px;border-radius:4px;background:oklch(0.5 0.04 58)" />
      <D c="left:136px;top:106px;width:68px;height:13px;border-radius:7px;transform-origin:0 100%;transform:rotate(-34deg);background:oklch(0.93 0.015 92);box-shadow:inset 0 -4px 0 oklch(0.82 0.015 90)" />
      <D c="left:16px;top:118px;width:132px;height:13px;border-radius:7px;background:oklch(0.93 0.015 92);box-shadow:inset 0 -4px 0 oklch(0.82 0.015 90)" />
      <D c="left:0;top:0;width:200px;height:200px" style={{ animation: anim.jolt }}>
        <D c="left:24px;top:91px;width:28px;height:17px;border-radius:9px;transform:rotate(-18deg);background:oklch(0.74 0.05 62)" />
        <D c="left:38px;top:98px;width:96px;height:20px;border-radius:10px;background:oklch(0.76 0.05 62)" />
        <D c="left:100px;top:95px;width:40px;height:25px;border-radius:8px 12px 12px 8px;background:oklch(0.62 0.1 42)" />
        <D c="left:126px;top:82px;width:52px;height:34px;border-radius:10px 16px 8px 6px;transform-origin:0 100%;transform:rotate(-34deg);background:oklch(0.7 0.14 196)" />
        <D c="left:151px;top:48px;width:34px;height:35px" style={{ animation: anim.breathe }}>
          <D c="left:0;top:1px;width:34px;height:34px;border-radius:17px;background:oklch(0.34 0.03 40)" />
          <D c="left:0;top:0;width:29px;height:29px;border-radius:15px;background:oklch(0.76 0.05 62)" />
          <D c="left:2px;top:6px;width:18px;height:6px;border-radius:3px;transform:rotate(-34deg);background:oklch(0.24 0.02 250)" />
        </D>
        <D c="left:74px;top:91px;width:44px;height:9px;border-radius:3px;transform:rotate(-8deg);background:oklch(0.84 0.005 250);box-shadow:inset 0 -3px 0 oklch(0.68 0.005 250)" />
        <D c="left:86px;top:56px;width:50px;height:34px;border-radius:3px;transform-origin:0 100%;transform:rotate(-24deg);background:oklch(0.82 0.005 250);padding:4px">
          <Screen anim={anim} rows={SCREEN_ROWS} />
        </D>
        <D
          c="left:139px;top:61px;width:40px;height:10px;border-radius:5px;transform-origin:0 50%;background:oklch(0.76 0.05 62)"
          style={{ animation: 'sipArm 5.2s ease-in-out infinite' }}
        >
          <D c="left:23px;top:-24px;width:21px;height:29px;border-radius:3px 3px 9px 9px;transform-origin:50% 100%;transform:rotate(76.565deg);background:oklch(0.5 0.04 240 / 0.28);box-shadow:inset 0 0 0 1.5px oklch(0.96 0.02 220 / 0.7)">
            <D c="left:2px;top:9px;right:2px;bottom:2px;border-radius:2px;background:oklch(0.68 0.16 32)" />
            <D c="left:13px;top:-13px;width:4px;height:25px;border-radius:2px;transform:rotate(14deg);background:oklch(0.92 0.09 128)" />
          </D>
        </D>
      </D>
    </D>
  );
}

/** Floor 04 — a tuxedo standing at the meeting table. */
export function Suit({ anim }: CharacterProps) {
  return (
    <>
      <D c="left:14px;top:160px;width:112px;height:26px;border-radius:50%;background:radial-gradient(ellipse, oklch(0.1 0.008 60 / 0.6), transparent 72%)" />
      <D c="left:30px;top:44px;width:80px;height:118px;border-radius:26px 26px 8px 8px;background:linear-gradient(180deg, oklch(0.3 0.045 30), oklch(0.24 0.035 28));box-shadow:inset 0 0 0 2px oklch(0.38 0.055 34)" />
      <D c="left:18px;top:96px;width:22px;height:44px;border-radius:11px;background:oklch(0.28 0.04 30)" />
      <D c="left:100px;top:96px;width:22px;height:44px;border-radius:11px;background:oklch(0.26 0.038 28)" />
      <D c="left:0;top:0;width:140px;height:200px" style={{ animation: anim.jolt }}>
        <D
          c="left:46px;top:22px;width:48px;height:44px;border-radius:21px 21px 17px 17px;background:oklch(0.76 0.05 62)"
          style={{ animation: anim.breathe }}
        />
        <D c="left:43px;top:18px;width:54px;height:15px;border-radius:20px 20px 0 0;background:oklch(0.22 0.014 60)" />
        <D c="left:57px;top:38px;width:5px;height:5px;border-radius:50%;background:oklch(0.2 0.02 60)" />
        <D c="left:77px;top:38px;width:5px;height:5px;border-radius:50%;background:oklch(0.2 0.02 60)" />
        <D c="left:63px;top:52px;width:13px;height:3px;border-radius:2px;background:oklch(0.46 0.05 40)" />
        <D c="left:38px;top:62px;width:64px;height:92px;border-radius:14px 14px 4px 4px;background:linear-gradient(180deg, oklch(0.17 0.012 58), oklch(0.13 0.01 56))" />
        <D c="left:56px;top:62px;width:28px;height:42px;background:oklch(0.95 0.008 90);clip-path:polygon(24% 0, 76% 0, 60% 100%, 40% 100%)" />
        <D c="left:61px;top:68px;width:18px;height:9px;background:oklch(0.6 0.16 26);clip-path:polygon(0 0, 44% 42%, 0 100%, 56% 100%, 100% 58%, 100% 0)" />
        <D c="left:22px;top:100px;width:26px;height:13px;border-radius:7px;transform:rotate(16deg);background:oklch(0.16 0.012 58)" />
        <D c="left:92px;top:100px;width:26px;height:13px;border-radius:7px;transform:rotate(-16deg);background:oklch(0.16 0.012 58)" />
      </D>
    </>
  );
}

/** Floor 03 — a chef, stirring the pot or working a laptop. */
export function Cook({ anim, stir }: CharacterProps & { stir: boolean }) {
  return (
    <>
      <D c="left:20px;top:172px;width:100px;height:24px;border-radius:50%;background:radial-gradient(ellipse, oklch(0.24 0.012 60 / 0.5), transparent 72%)" />
      <D c="left:0;top:0;width:140px;height:210px" style={{ animation: anim.jolt }}>
        <D c="left:50px;top:138px;width:15px;height:44px;border-radius:5px;background:oklch(0.4 0.02 240)" />
        <D c="left:74px;top:138px;width:15px;height:44px;border-radius:5px;background:oklch(0.36 0.018 240)" />
        <D c="left:44px;top:176px;width:24px;height:10px;border-radius:5px;background:oklch(0.88 0.01 90)" />
        <D c="left:72px;top:176px;width:24px;height:10px;border-radius:5px;background:oklch(0.84 0.01 90)" />
        <D c="left:44px;top:74px;width:52px;height:70px;border-radius:14px 14px 5px 5px;background:oklch(0.9 0.014 96)" />
        <D c="left:50px;top:92px;width:40px;height:52px;border-radius:3px;background:oklch(0.96 0.01 96);box-shadow:inset 0 0 0 1px oklch(0.8 0.012 90)" />
        <D
          c="left:54px;top:34px;width:34px;height:34px;border-radius:15px;background:oklch(0.76 0.05 62)"
          style={{ animation: anim.breathe }}
        />
        <D c="left:61px;top:48px;width:4px;height:4px;border-radius:50%;background:oklch(0.22 0.02 60)" />
        <D c="left:77px;top:48px;width:4px;height:4px;border-radius:50%;background:oklch(0.22 0.02 60)" />
        <D c="left:46px;top:4px;width:50px;height:34px;border-radius:22px 22px 4px 4px;background:oklch(0.97 0.008 96);box-shadow:inset 0 -4px 0 oklch(0.86 0.008 94)" />
        <D
          c="left:30px;top:82px;width:13px;height:40px;border-radius:7px;transform-origin:50% 0;background:oklch(0.76 0.05 62)"
          style={{ animation: anim.armLeft }}
        />
        {stir ? (
          <D
            c="left:96px;top:80px;width:13px;height:42px;border-radius:7px;transform-origin:50% 0;background:oklch(0.76 0.05 62)"
            style={{ animation: 'stir 2.6s ease-in-out infinite' }}
          >
            <D c="left:3px;top:34px;width:6px;height:46px;border-radius:3px;background:oklch(0.52 0.04 60)" />
            <D c="left:-4px;top:76px;width:22px;height:12px;border-radius:50%;background:oklch(0.6 0.012 240)" />
          </D>
        ) : (
          <>
            <D c="left:96px;top:82px;width:13px;height:40px;border-radius:7px;transform-origin:50% 0;transform:rotate(14deg);background:oklch(0.76 0.05 62)" />
            <D c="left:92px;top:112px;width:54px;height:14px;border-radius:3px;transform:rotate(-8deg);background:oklch(0.8 0.006 250);box-shadow:inset 0 -3px 0 oklch(0.64 0.006 250)" />
            <D c="left:98px;top:78px;width:50px;height:36px;border-radius:3px;transform-origin:0 100%;transform:rotate(-14deg);background:oklch(0.78 0.006 250);padding:4px">
              <Screen anim={anim} rows={SCREEN_ROWS} />
            </D>
          </>
        )}
      </D>
    </>
  );
}

/** Floor 02 — reception: most agents sit on the floor, one mans the desk. */
export function Clerk({ anim, stands }: CharacterProps & { stands: boolean }) {
  return (
    <>
      <D c="left:18px;top:164px;width:104px;height:24px;border-radius:50%;background:radial-gradient(ellipse, oklch(0.2 0.012 90 / 0.45), transparent 72%)" />
      {stands ? (
        <D c="left:0;top:0;width:140px;height:200px" style={{ animation: anim.jolt }}>
          <D c="left:52px;top:140px;width:15px;height:42px;border-radius:5px;background:oklch(0.34 0.03 250)" />
          <D c="left:74px;top:140px;width:15px;height:42px;border-radius:5px;background:oklch(0.3 0.028 250)" />
          <D c="left:46px;top:76px;width:50px;height:70px;border-radius:14px 14px 5px 5px;background:oklch(0.5 0.05 252)" />
          <D
            c="left:54px;top:38px;width:34px;height:34px;border-radius:15px;background:oklch(0.76 0.05 62)"
            style={{ animation: anim.breathe }}
          />
          <D c="left:61px;top:52px;width:4px;height:4px;border-radius:50%;background:oklch(0.22 0.02 60)" />
          <D c="left:77px;top:52px;width:4px;height:4px;border-radius:50%;background:oklch(0.22 0.02 60)" />
          <D c="left:50px;top:30px;width:42px;height:14px;border-radius:10px 10px 0 0;background:oklch(0.26 0.03 250)" />
          <D
            c="left:34px;top:84px;width:12px;height:36px;border-radius:6px;transform-origin:50% 0;background:oklch(0.76 0.05 62)"
            style={{ animation: anim.armLeft }}
          />
          <D
            c="left:96px;top:84px;width:12px;height:36px;border-radius:6px;transform-origin:50% 0;background:oklch(0.76 0.05 62)"
            style={{ animation: anim.armRight }}
          />
        </D>
      ) : (
        <D c="left:0;top:0;width:140px;height:200px" style={{ animation: anim.jolt }}>
          <D c="left:26px;top:132px;width:88px;height:34px;border-radius:18px;background:oklch(0.38 0.038 250)" />
          <D c="left:20px;top:146px;width:26px;height:16px;border-radius:8px;background:oklch(0.32 0.03 250)" />
          <D c="left:44px;top:84px;width:54px;height:56px;border-radius:14px 14px 6px 6px;background:oklch(0.46 0.05 252)" />
          <D
            c="left:54px;top:48px;width:34px;height:34px;border-radius:15px;background:oklch(0.76 0.05 62)"
            style={{ animation: anim.breathe }}
          />
          <D c="left:61px;top:62px;width:4px;height:4px;border-radius:50%;background:oklch(0.22 0.02 60)" />
          <D c="left:77px;top:62px;width:4px;height:4px;border-radius:50%;background:oklch(0.22 0.02 60)" />
          <D c="left:50px;top:40px;width:42px;height:14px;border-radius:10px 10px 0 0;background:oklch(0.3 0.03 250)" />
          <D c="left:86px;top:42px;width:16px;height:6px;border-radius:3px;background:oklch(0.3 0.03 250)" />
          <D
            c="left:32px;top:92px;width:12px;height:34px;border-radius:6px;transform-origin:50% 0;background:oklch(0.76 0.05 62)"
            style={{ animation: anim.armLeft }}
          />
          <D
            c="left:98px;top:92px;width:12px;height:34px;border-radius:6px;transform-origin:50% 0;background:oklch(0.76 0.05 62)"
            style={{ animation: anim.armRight }}
          />
          <D c="left:40px;top:122px;width:62px;height:12px;border-radius:2px;background:oklch(0.74 0.008 250);box-shadow:inset 0 -3px 0 oklch(0.6 0.008 250)" />
          <D c="left:42px;top:92px;width:58px;height:32px;border-radius:2px;transform-origin:0 100%;transform:rotate(-6deg);background:oklch(0.72 0.008 250);padding:3px">
            <Screen anim={anim} rows={SCREEN_ROWS} />
          </D>
          <D c="left:104px;top:118px;width:18px;height:24px;transform:rotate(12deg);background:oklch(0.94 0.03 96);box-shadow:inset 0 0 0 1px oklch(0.76 0.03 92)" />
        </D>
      )}
    </>
  );
}

/** Floor 01 — the basement: a small figure behind a big monitor on a desk. */
export function Basement({ anim }: CharacterProps) {
  return (
    <>
      <D c="left:10px;top:176px;width:120px;height:32px;border-radius:50%;background:radial-gradient(ellipse, oklch(0.1 0.008 60 / 0.7), transparent 72%)" />
      <D c="left:46px;top:34px;width:48px;height:116px" style={{ animation: anim.jolt }}>
        <D c="left:6px;top:112px;width:36px;height:26px;background:oklch(0.24 0.016 62)" />
        <D c="left:11px;top:12px;width:26px;height:28px;border-radius:12px;background:oklch(0.74 0.045 62)" />
        <D c="left:16px;top:24px;width:4px;height:4px;border-radius:50%;background:oklch(0.24 0.02 60)" />
        <D c="left:28px;top:24px;width:4px;height:4px;border-radius:50%;background:oklch(0.24 0.02 60)" />
        <D c="left:20px;top:33px;width:8px;height:2px;border-radius:2px;background:oklch(0.44 0.05 40)" />
        <D c="left:6px;top:15px;width:7px;height:15px;border-radius:3px;background:oklch(0.3 0.02 60)" />
        <D c="left:35px;top:15px;width:7px;height:15px;border-radius:3px;background:oklch(0.3 0.02 60)" />
        <D c="left:9px;top:6px;width:30px;height:10px;border-radius:15px 15px 0 0;background:oklch(0.3 0.02 60)" />
        <D
          c="left:4px;top:40px;width:40px;height:62px;border-radius:12px 12px 4px 4px;background:linear-gradient(180deg, oklch(0.42 0.045 205), oklch(0.34 0.038 205))"
          style={{ animation: anim.breathe }}
        >
          <D c="left:12px;top:0;width:16px;height:10px;border-radius:0 0 8px 8px;background:oklch(0.3 0.03 205)" />
        </D>
        <D
          c="left:-6px;top:52px;width:12px;height:34px;border-radius:6px;transform-origin:50% 0;background:oklch(0.4 0.042 205)"
          style={{ animation: anim.armLeft }}
        />
        <D
          c="left:42px;top:52px;width:12px;height:34px;border-radius:6px;transform-origin:50% 0;background:oklch(0.4 0.042 205)"
          style={{ animation: anim.armRight }}
        />
      </D>
      <D c="left:34px;top:96px;width:72px;height:50px;z-index:3">
        <D c="left:0;top:0;right:0;bottom:0;padding:4px;background:oklch(0.19 0.012 62);box-shadow:inset 0 0 0 1px oklch(0.28 0.018 62), 0 4px 14px oklch(0.09 0.008 60 / 0.6)">
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              background: anim.screenBg,
            }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', animation: anim.crt }}>
              {[
                [60, 0, 1],
                [40, 7, 0.7],
                [72, 7, 0.55],
                [34, 0, 1],
                [54, 11, 0.6],
                [66, 0, 0.8],
                [60, 0, 1],
                [40, 7, 0.7],
                [72, 7, 0.55],
                [34, 0, 1],
                [54, 11, 0.6],
                [66, 0, 0.8],
              ].map(([width, indent, opacity], i) => (
                <div
                  key={i}
                  style={{
                    height: 4,
                    margin: `3px 5px 3px ${5 + indent}px`,
                    width: `${width}%`,
                    background: anim.screenInk,
                    opacity,
                  }}
                />
              ))}
            </div>
            <D c="left:0;top:0;right:0;bottom:0;background:repeating-linear-gradient(0deg, oklch(0.1 0.01 60 / 0.35) 0 1px, transparent 1px 3px)" />
          </div>
        </D>
        <D c="left:28px;top:50px;width:16px;height:6px;background:oklch(0.21 0.014 62)" />
      </D>
      <D c="left:0;top:130px;width:140px;height:70px;clip-path:polygon(50% 0, 100% 50%, 50% 100%, 0 50%);background:linear-gradient(160deg, oklch(0.33 0.026 58), oklch(0.27 0.022 56));z-index:2" />
      <D c="left:0;top:165px;width:70px;height:60px;clip-path:polygon(0 0, 100% 58%, 100% 100%, 0 42%);background:oklch(0.2 0.018 56);z-index:2" />
      <D c="left:70px;top:165px;width:70px;height:60px;clip-path:polygon(0 58%, 100% 0, 100% 42%, 0 100%);background:oklch(0.16 0.014 54);z-index:2" />
    </>
  );
}

/** Floor 00 — a neutral stand-in for agents waiting out an overflow. */
export function Standby({ anim }: CharacterProps) {
  return (
    <>
      <D c="left:18px;top:164px;width:104px;height:24px;border-radius:50%;background:radial-gradient(ellipse, oklch(0.14 0.008 74 / 0.5), transparent 72%)" />
      <D c="left:0;top:0;width:140px;height:200px" style={{ animation: anim.jolt }}>
        <D c="left:52px;top:140px;width:15px;height:42px;border-radius:5px;background:oklch(0.34 0.012 78)" />
        <D c="left:74px;top:140px;width:15px;height:42px;border-radius:5px;background:oklch(0.3 0.012 78)" />
        <D c="left:46px;top:76px;width:50px;height:70px;border-radius:14px 14px 5px 5px;background:oklch(0.46 0.014 80)" />
        <D
          c="left:54px;top:38px;width:34px;height:34px;border-radius:15px;background:oklch(0.76 0.05 62)"
          style={{ animation: anim.breathe }}
        />
        <D c="left:61px;top:52px;width:4px;height:4px;border-radius:50%;background:oklch(0.22 0.02 60)" />
        <D c="left:77px;top:52px;width:4px;height:4px;border-radius:50%;background:oklch(0.22 0.02 60)" />
        <D c="left:34px;top:84px;width:12px;height:36px;border-radius:6px;transform-origin:50% 0;background:oklch(0.76 0.05 62)" />
        <D c="left:96px;top:84px;width:12px;height:36px;border-radius:6px;transform-origin:50% 0;background:oklch(0.76 0.05 62)" />
      </D>
    </>
  );
}

/** Character footprint per floor: the box the body is drawn in. */
export const CHARACTER_BOX: Record<
  string,
  { width: number; height: number; anchorX: number; anchorY: number; nameTop: number }
> = {
  f5: { width: 200, height: 200, anchorX: 100, anchorY: 150, nameTop: 182 },
  f4: { width: 140, height: 200, anchorX: 70, anchorY: 200, nameTop: 150 },
  f3: { width: 140, height: 210, anchorX: 70, anchorY: 200, nameTop: 182 },
  f2: { width: 140, height: 200, anchorX: 70, anchorY: 200, nameTop: 172 },
  f1: { width: 140, height: 220, anchorX: 70, anchorY: 200, nameTop: 196 },
  f0: { width: 140, height: 200, anchorX: 70, anchorY: 200, nameTop: 172 },
};
