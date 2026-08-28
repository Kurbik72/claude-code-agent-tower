import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './canvas.module.css';
import { Basement, CHARACTER_BOX, Clerk, Cook, Standby, Suit, Terrace } from './characters';
import { characterAnim } from './characters/parts';
import { STATUS_COLOR } from '../lib/format';
import type { Agent } from '../lib/types';
import { useTower } from '../store/tower';

/**
 * One agent standing in its slot.
 *
 * The body comes from the agent's floor, the animations from its live status,
 * and the arrival animation from the elevator: a freshly seen agent starts at
 * the car and walks along the isometric axis to its seat (plan 5.3).
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

  return (
    <div
      className={`${styles.agent} ${leaving ? styles.leaving : arriving ? styles.arriving : ''}`}
      style={{
        left: agent.x - box.anchorX,
        top: agent.y - box.anchorY,
        width: box.width,
        height: box.height,
        zIndex: agent.z,
        ...(() => {
          const walk = leaving ?? arriving;
          return walk
            ? ({ '--from-x': `${walk.dx}px`, '--from-y': `${walk.dy}px` } as Record<string, string>)
            : null;
        })(),
      }}
      onMouseEnter={() => setHovered(agent.id)}
      onMouseLeave={() => setHovered(null)}
      onClick={(event) => {
        event.stopPropagation();
        setOpen(agent.id);
      }}
    >
      {body}
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
