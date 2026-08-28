import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './chrome.module.css';
import { clock, eventColor } from '../lib/format';
import { useTower } from '../store/tower';
import type { FloorId } from '../lib/types';

/**
 * Floor list and event feed.
 *
 * The design's per-floor light switch is gone on purpose (plan 9.1): a floor is
 * lit exactly when it holds agents, so there is nothing to toggle. Clicking a
 * row still focuses that floor and sends the elevator.
 */
export function Sidebar({ open, onSelect }: { open: boolean; onSelect: (id: FloorId) => void }) {
  const { t, i18n } = useTranslation();
  const floors = useTower((s) => s.floors);
  const agents = useTower((s) => s.agents);
  const events = useTower((s) => s.events);
  const stats = useTower((s) => s.stats);
  const focusFloor = useTower((s) => s.focusFloor);
  const locale = i18n.resolvedLanguage ?? 'en';

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const agent of Object.values(agents)) {
      map.set(agent.floorId, (map.get(agent.floorId) ?? 0) + 1);
    }
    return map;
  }, [agents]);

  return (
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
      <div className={styles.objectHead}>
        <div className={styles.sectionLabel}>{t('sidebar.object')}</div>
        <div className={styles.objectName}>
          {t('sidebar.allProjects', { count: stats.projects })}
        </div>
      </div>

      <div className={styles.floorList}>
        {floors.map((floor) => {
          const count = counts.get(floor.id) ?? 0;
          const active = focusFloor === floor.id;
          return (
            <button
              key={floor.id}
              type="button"
              className={`${styles.floorRow} ${active ? styles.floorRowActive : ''}`}
              style={{ borderLeftColor: active ? floor.tone : 'transparent' }}
              onClick={() => onSelect(floor.id)}
            >
              <span className={styles.floorTop}>
                <span
                  className={styles.floorNum}
                  style={{ color: count ? floor.tone : 'oklch(0.4 0.012 80)' }}
                >
                  {floor.num}
                </span>
                <span className={styles.floorText}>
                  <span className={styles.floorTitle}>{t(`floors.${floor.id}.title`)}</span>
                  <span className={styles.floorSub}>{t(`floors.${floor.id}.sub`)}</span>
                </span>
                <span
                  className={styles.lamp}
                  style={{
                    background: count ? 'var(--lamp)' : 'oklch(0.24 0.012 70)',
                    boxShadow: count
                      ? '0 0 10px oklch(0.9 0.1 86)'
                      : 'inset 0 0 0 1px oklch(0.4 0.012 80)',
                  }}
                />
              </span>
              <span className={styles.floorCount}>
                {count ? t('sidebar.agents', { count }) : t('sidebar.empty')}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.feedHead}>
        <span className={styles.sectionLabel}>{t('sidebar.feed')}</span>
        <span className={styles.feedTotal}>{events.length}</span>
      </div>
      <div className={styles.feedList}>
        {events.map((event) => (
          <div key={event.id} className={styles.feedRow}>
            <span className={styles.feedTime}>{clock(event.at, locale)}</span>
            <span className={styles.feedDot} style={{ background: eventColor(event.kind) }} />
            <span className={styles.feedText}>{describe(t, event)}</span>
          </div>
        ))}
      </div>

      <div className={styles.hint}>{t('sidebar.hint')}</div>
    </aside>
  );
}

/**
 * A departure reads differently depending on what ended it. The keys are flat
 * on purpose: `event['agent.leave']` already holds a dot, and a third one
 * would leave i18next guessing where the nesting stops.
 */
const LEAVE_KEY: Record<string, string> = {
  finished: 'event.leaveFinished',
  closed: 'event.leaveClosed',
  idle: 'event.leaveIdle',
};

/**
 * The server only ever sends codes and enums; every readable string is built
 * here so the feed re-reads correctly when the language changes (plan 7).
 */
function describe(
  t: (key: string, options?: Record<string, unknown>) => string,
  event: { kind: string; params: Record<string, unknown> },
): string {
  if (event.kind === 'warn') {
    const code = String(event.params.code ?? '');
    return t(`event.warn.${code}`, { ...event.params, defaultValue: code });
  }
  // why an agent left is the interesting half of the line: it finished, its
  // session closed, or it simply went quiet long enough to be sent home
  if (event.kind === 'agent.leave') {
    const key = LEAVE_KEY[String(event.params.reason ?? '')] ?? 'event.agent.leave';
    return t(key, { ...event.params, defaultValue: event.kind });
  }
  return t(`event.${event.kind}`, { ...event.params, defaultValue: event.kind });
}
