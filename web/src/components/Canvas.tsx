import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { useTranslation } from 'react-i18next';
import styles from './canvas.module.css';
import { Backdrop } from './Backdrop';
import { Floor } from './Floor';
import { Elevator } from './Elevator';
import { HoverCard } from './HoverCard';
import { Inspector } from './Inspector';
import { Strike } from './Strike';
import { agentsOnFloor, useTower } from '../store/tower';
import type { FloorId } from '../lib/types';

/** World width; the content height is derived from the floors actually in play. */
const WORLD_W = 1180;
/** A floor wrapper is 600px tall, and the lowest one ends the tower. */
const FLOOR_H = 600;
const MAX_SCALE = 2.4;
/** Above this scale the agents show their name plates. */
const NAME_SCALE = 0.62;

interface View {
  s: number;
  tx: number;
  ty: number;
}

export function Canvas() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ s: 0.3, tx: 0, ty: 0 });
  const [animated, setAnimated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggedRef = useRef(0);

  const floors = useTower((s) => s.floors);
  const agents = useTower((s) => s.agents);
  const stats = useTower((s) => s.stats);
  const sendLift = useTower((s) => s.sendLift);
  const openAgent = useTower((s) => s.openAgent);
  const focusFloor = useTower((s) => s.focusFloor);
  const focusSeq = useTower((s) => s.focusSeq);

  const worldHeight = stats.overflowUsed ? 3030 : 2560;
  // "whole tower" has to mean it: measure down to the lowest floor's floor
  const contentHeight = floors.length
    ? Math.max(...floors.map((f) => f.top)) + FLOOR_H
    : worldHeight;
  const agentCount = Object.keys(agents).length;

  const boxOf = useCallback(() => {
    const node = ref.current;
    return node ? { w: node.clientWidth, h: node.clientHeight } : { w: 1000, h: 700 };
  }, []);

  const minScale = useCallback(() => {
    const box = boxOf();
    return Math.min(box.w / WORLD_W, box.h / contentHeight) * 0.94;
  }, [boxOf, contentHeight]);

  const fit = useCallback(
    (animate: boolean) => {
      const box = boxOf();
      const s = Math.min(box.w / WORLD_W, box.h / contentHeight) * 0.97;
      setAnimated(animate);
      setView({ s, tx: (box.w - WORLD_W * s) / 2, ty: (box.h - contentHeight * s) / 2 });
    },
    [boxOf, contentHeight],
  );

  /** Frames one floor in the middle of the viewport. */
  const frameFloor = useCallback(
    (id: FloorId) => {
      const floor = floors.find((f) => f.id === id);
      if (!floor) return;
      const box = boxOf();
      const s = Math.max(minScale(), Math.min(box.w / 1080, box.h / 620));
      setAnimated(true);
      setView({ s, tx: box.w / 2 - (240 + 340) * s, ty: box.h / 2 - (floor.top + 380) * s });
    },
    [boxOf, floors, minScale],
  );

  // Focusing a floor is one gesture wherever it starts — a sidebar row or the
  // plate itself: the elevator travels and the canvas frames the same floor.
  useEffect(() => {
    if (focusSeq && focusFloor) frameFloor(focusFloor);
    // frameFloor is intentionally not a dependency: only a new focus re-frames
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  const zoomBy = useCallback(
    (k: number) => {
      const box = boxOf();
      setAnimated(true);
      setView((v) => {
        const s = Math.max(minScale(), Math.min(MAX_SCALE, v.s * k));
        const mx = box.w / 2;
        const my = box.h / 2;
        return { s, tx: mx - (mx - v.tx) * (s / v.s), ty: my - (my - v.ty) * (s / v.s) };
      });
    },
    [boxOf, minScale],
  );

  useEffect(() => {
    fit(false);
    const onResize = () => fit(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fit]);

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], first, last, pinching }) => {
        if (pinching) return;
        if (first) draggedRef.current = 0;
        draggedRef.current += Math.abs(dx) + Math.abs(dy);
        setAnimated(false);
        setDragging(!last);
        setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
      },
      onWheel: ({ event, delta: [, dy] }) => {
        event.preventDefault();
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const mx = (event as WheelEvent).clientX - rect.left;
        const my = (event as WheelEvent).clientY - rect.top;
        setAnimated(false);
        setView((v) => {
          const s = Math.max(minScale(), Math.min(MAX_SCALE, v.s * Math.exp(-dy * 0.0018)));
          if (s === v.s) return v;
          return { s, tx: mx - (mx - v.tx) * (s / v.s), ty: my - (my - v.ty) * (s / v.s) };
        });
      },
      onPinch: ({ offset: [scale], origin: [ox, oy], memo }) => {
        const node = ref.current;
        if (!node) return memo;
        const rect = node.getBoundingClientRect();
        const start = (memo as View) ?? view;
        const s = Math.max(minScale(), Math.min(MAX_SCALE, start.s * scale));
        const mx = ox - rect.left;
        const my = oy - rect.top;
        setAnimated(false);
        setView({
          s,
          tx: mx - (mx - start.tx) * (s / start.s),
          ty: my - (my - start.ty) * (s / start.s),
        });
        return start;
      },
    },
    { target: ref, eventOptions: { passive: false }, drag: { filterTaps: true } },
  );

  const floorAgents = useMemo(() => {
    const map = new Map<FloorId, ReturnType<typeof agentsOnFloor>>();
    for (const floor of floors) map.set(floor.id, agentsOnFloor(agents, floor.id));
    return map;
  }, [agents, floors]);

  const showNames = view.s > NAME_SCALE;
  /** The ticket number on the DevOps counter counts the queue, not a fiction. */
  const ticket = 40 + agentCount;

  return (
    <section ref={ref} className={`${styles.viewport} ${dragging ? styles.dragging : ''}`}>
      <div
        className={`${styles.world} ${animated ? styles.animated : ''}`}
        style={{
          height: worldHeight,
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`,
        }}
      >
        <Backdrop height={worldHeight} />
        <Elevator />
        {floors.map((floor) => (
          <Floor
            key={floor.id}
            floor={floor}
            agents={floorAgents.get(floor.id) ?? []}
            zoomed={showNames}
            ticket={ticket}
            onFocus={() => {
              if (draggedRef.current > 3) return;
              sendLift(floor.id, true);
            }}
          />
        ))}
        <Strike />
      </div>

      {agentCount === 0 ? <div className={styles.emptyNote}>{t('canvas.empty')}</div> : null}

      <HoverCard view={view} />

      <div className={styles.zoom}>
        <button
          type="button"
          className={styles.zoomButton}
          aria-label={t('canvas.zoomOut')}
          onClick={() => zoomBy(1 / 1.35)}
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomButton}
          aria-label={t('canvas.zoomIn')}
          onClick={() => zoomBy(1.35)}
        >
          +
        </button>
        <button type="button" className={styles.zoomWide} onClick={() => fit(true)}>
          {t('canvas.fit')}
        </button>
        <span className={styles.zoomLabel}>{Math.round(view.s * 100)}%</span>
      </div>

      {openAgent ? <Inspector /> : null}
    </section>
  );
}
