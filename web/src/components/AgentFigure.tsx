import { memo, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './canvas.module.css';
import { Basement, CHARACTER_BOX, Clerk, Cook, Standby, Suit, Terrace } from './characters';
import { characterAnim } from './characters/parts';
import { STATUS_COLOR } from '../lib/format';
import type { Agent } from '../lib/types';
import { STEP_IN_MS, useTower } from '../store/tower';

/**
 * One agent standing in its slot.
 *
 * The body comes from the agent's floor, the animations from its live status,
 * and the walk from the elevator: a freshly seen agent waits inside the car
 * until its doors are open, steps out and walks to its seat; one that has
 * finished stands up, walks back and rides down (plan 5.3). Both walks are
 * timed against the car itself, so nobody crosses a floor to a shut door.
 */
export const AgentFigure = memo(function AgentFigure({
  agent,
  showName,
}: {
  agent: Agent;
  showName: boolean;
}) {
  const { t } = useTranslation();
  const setHovered = useTower((s) => s.setHovered);
  const setOpen = useTower((s) => s.setOpen);
  const arriving = useTower((s) => s.arriving[agent.id]);
  const leaving = useTower((s) => s.leaving[agent.id]);
  const jolting = useTower((s) => Date.now() - (s.jolts[agent.id] ?? 0) < 1300);

  const box = CHARACTER_BOX[agent.floorId] ?? CHARACTER_BOX.f1;
  const anim = useMemo(
    () => characterAnim(agent.status, agent.floorId, jolting),
    [agent.status, agent.floorId, jolting],
  );

  const body = (() => {
    switch (agent.floorId) {
      case 'f5':
        return <Terrace anim={anim} />;
      case 'f4':
        return <Suit anim={anim} />;
      case 'f3':
        return <Cook anim={anim} stir={agent.slotIndex % 3 === 0} />;
      case 'f2':
        return <Clerk anim={anim} stands={agent.slotIndex === 0} />;
      case 'f1':
        return <Basement anim={anim} />;
      default:
        return <Standby anim={anim} />;
    }
  })();

  const walk = leaving ?? arriving;
  // Every beat of the walk is a variable rather than a fixed duration: the
  // delay is however long the car still needs, and the name plate and the
  // fade into the cabin hang off the end of the walk itself.
  const timing: CSSProperties = walk
    ? ({
        '--from-x': `${Math.round(walk.dx)}px`,
        '--from-y': `${Math.round(walk.dy)}px`,
        '--walk-ms': `${walk.ms}ms`,
        '--walk-delay': `${walk.delay}ms`,
        '--bob-delay': `${walk.delay + (leaving ? Math.round(walk.ms * 0.18) : 0)}ms`,
        '--step-ms': `${STEP_IN_MS}ms`,
        '--fade-delay': `${walk.delay + walk.ms - 80}ms`,
        '--plate-delay': `${walk.delay + walk.ms - 200}ms`,
      } as CSSProperties)
    : {};

  return (
    <div
      className={`${styles.agent} ${leaving ? styles.leaving : arriving ? styles.arriving : ''}`}
      style={{
        left: agent.x - box.anchorX,
        top: agent.y - box.anchorY,
        width: box.width,
        height: box.height,
        zIndex: agent.z,
        ...timing,
      }}
      onMouseEnter={() => setHovered(agent.id)}
      onMouseLeave={() => setHovered(null)}
      onClick={(event) => {
        event.stopPropagation();
        setOpen(agent.id);
      }}
    >
      {/* the body bobs on its own while the wrapper carries it across the floor */}
      <div className={styles.stride}>{body}</div>
      {showName ? (
        <div className={styles.namePlate} style={{ left: box.anchorX, top: box.nameTop }}>
          <div
            className={`${styles.nameChip} ${agent.unknownFloor ? styles.nameChipUnknown : ''}`}
          >
            <span
              className={styles.nameText}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span
                style={{
                  flex: 'none',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: STATUS_COLOR[agent.status],
                }}
              />
              {agent.name}
              {agent.unknownFloor ? ' ?' : ''}
            </span>
          </div>
          <div className={styles.roleChip}>{agent.role || t(`status.${agent.status}`)}</div>
        </div>
      ) : null}
    </div>
  );
});
