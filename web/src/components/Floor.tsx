import { memo, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './canvas.module.css';
import { AgentFigure } from './AgentFigure';
import { SCENES } from '../scene';
import type { Prop } from '../scene';
import type { Agent, Floor as FloorModel } from '../lib/types';

const FLOOR_X = 240;

/** Renders one scenery prop and its children. */
function Props({
  items,
  lit,
  slots,
}: {
  items: Prop[];
  lit: boolean;
  slots: Record<string, ReactNode>;
}) {
  return (
    <>
      {items.map((prop, i) => {
        if (prop.when === 'lit' && !lit) return null;
        if (prop.when === 'dark' && lit) return null;
        return (
          <div key={i} style={prop.s}>
            {prop.slot ? slots[prop.slot] : prop.text}
            {prop.kids ? <Props items={prop.kids} lit={lit} slots={slots} /> : null}
          </div>
        );
      })}
    </>
  );
}

/**
 * A floor of the tower: plate, scenery, its agents and the "lights off" curtain.
 *
 * Lighting is not a control — a floor with at least one agent is lit and an
 * empty one goes dark (plan 9.1). Floors scrolled out of the viewport pause
 * their ambient loops so an idle tower costs nothing.
 */
export const Floor = memo(function Floor({
  floor,
  agents,
  zoomed,
  onFocus,
  ticket,
}: {
  floor: FloorModel;
  agents: Agent[];
  zoomed: boolean;
  onFocus: () => void;
  ticket: number;
}) {
  const { t } = useTranslation();
  const scene = SCENES[floor.id];
  const lit = agents.length > 0;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!scene) return null;

  // Floors are 600px tall on a 470px step, so every wrapper overlaps the one
  // below it. In the projection the upper floor's slab *is* the lower floor's
  // ceiling, so it has to paint over it: higher floor, higher stacking order.
  const wrapper: CSSProperties = {
    position: 'absolute',
    left: FLOOR_X,
    top: floor.top,
    width: 760,
    height: 600,
    zIndex: (Number(floor.num) + 1) * 10,
  };

  const labelTone = LABEL_TONE[floor.id] ?? 'oklch(0.5 0.02 70 / 0.92)';

  return (
    <div ref={ref} style={wrapper} data-paused={visible ? undefined : 'true'}>
      <div
        className={styles.plate}
        style={scene.plate}
        onClick={onFocus}
        role="button"
        tabIndex={-1}
        aria-label={t(`floors.${floor.id}.title`)}
      />
      <Props
        items={scene.back}
        lit={lit}
        slots={{ ticket: <>{ticket}</> }}
      />

      {agents.map((agent) => (
        <AgentFigure key={agent.id} agent={agent} showName={zoomed} />
      ))}

      <Props items={scene.front} lit={lit} slots={{}} />

      <div className={styles.floorLabel}>
        <span className={styles.floorLabelNum} style={{ color: labelTone }}>
          {floor.num}
        </span>
        <span className={styles.floorLabelText} style={{ color: labelTone }}>
          {t(`floors.${floor.id}.label`)}
        </span>
      </div>

      {!lit ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 760,
              height: 600,
              clipPath: scene.darkClip,
              zIndex: 880,
              background: scene.darkFill,
            }}
          />
          <div className={styles.darkNote}>
            <span
              style={{ width: 9, height: 9, border: '1px solid oklch(0.5 0.014 80)' }}
            />
            <span className={styles.darkNoteText}>{t('canvas.lightsOff')}</span>
          </div>
        </>
      ) : null}
    </div>
  );
});

/** The big number painted on each plate, in that floor's own ink. */
const LABEL_TONE: Record<string, string> = {
  f5: 'oklch(0.24 0.03 58 / 0.85)',
  f4: 'oklch(0.6 0.05 60 / 0.92)',
  f3: 'oklch(0.3 0.02 60 / 0.92)',
  f2: 'oklch(0.26 0.02 90 / 0.92)',
  f1: 'oklch(0.5 0.02 70 / 0.92)',
  f0: 'oklch(0.6 0.014 80 / 0.8)',
};
