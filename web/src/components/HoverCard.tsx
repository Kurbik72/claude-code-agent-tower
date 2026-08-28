import { useTranslation } from 'react-i18next';
import styles from './canvas.module.css';
import { STATUS_COLOR } from '../lib/format';
import { useTower } from '../store/tower';

const FLOOR_X = 240;

/**
 * The card that follows a hovered agent.
 *
 * It is `pointer-events: none` except for the whip button, so it never steals
 * a click meant for the floor plate underneath, and it is suppressed entirely
 * while the inspector is open.
 */
export function HoverCard({ view }: { view: { s: number; tx: number; ty: number } }) {
  const { t } = useTranslation();
  const hovered = useTower((s) => s.hovered);
  const openAgent = useTower((s) => s.openAgent);
  const agent = useTower((s) => (s.hovered ? s.agents[s.hovered] : undefined));
  const floors = useTower((s) => s.floors);
  const whip = useTower((s) => s.whip);

  if (!hovered || !agent || openAgent) return null;
  const floor = floors.find((f) => f.id === agent.floorId);
  if (!floor) return null;

  const lift = agent.floorId === 'f5' ? 130 : 170;
  const x = view.tx + (FLOOR_X + agent.x) * view.s;
  const y = view.ty + (floor.top + agent.y - lift) * view.s;

  const forbidden = floor.noWhip;
  const pointless = agent.status === 'dead';
  const label = forbidden
    ? t('card.whipForbidden')
    : pointless
      ? t('card.whipPointless')
      : t('card.whip');
  const tone = forbidden ? 'oklch(0.78 0.09 196)' : 'oklch(0.88 0.07 60)';

  return (
    <div className={styles.card} style={{ left: x, top: y }}>
      <div className={styles.cardInner}>
        <div className={styles.cardHead}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              flex: 'none',
              background: STATUS_COLOR[agent.status],
            }}
          />
          <span className={styles.cardName}>{agent.name}</span>
          <span className={styles.cardFloor}>
            {agent.unknownFloor ? t('card.unknown') : t('card.floor', { num: floor.num })}
          </span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
            {[agent.role, t(`status.${agent.status}`), agent.project].filter(Boolean).join(' · ')}
          </div>
          <div className={styles.cardTask}>{agent.task || '—'}</div>
        </div>
        <button
          type="button"
          className={styles.cardWhip}
          disabled={forbidden || pointless}
          style={{
            cursor: forbidden || pointless ? 'not-allowed' : 'pointer',
            borderTopColor: forbidden ? 'oklch(0.4 0.06 200)' : 'oklch(0.5 0.12 34)',
            background: forbidden ? 'oklch(0.2 0.03 200)' : 'oklch(0.22 0.03 40)',
          }}
          onClick={(event) => {
            event.stopPropagation();
            whip(agent.id, 'user');
          }}
        >
          <span className={styles.cardWhipGlyph} style={{ background: tone }} />
          <span className={styles.cardWhipLabel} style={{ color: tone }}>
            {label}
          </span>
        </button>
      </div>
    </div>
  );
}
