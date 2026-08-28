import { useTranslation } from 'react-i18next';
import styles from './chrome.module.css';
import { useTower } from '../store/tower';

/** Legend strip plus the newest line of the event feed. */
export function Footer() {
  const { t } = useTranslation();
  const latest = useTower((s) => s.events[0]);

  const line = latest
    ? t(
        latest.kind === 'warn'
          ? `event.warn.${String(latest.params.code ?? '')}`
          : `event.${latest.kind}`,
        { ...latest.params, defaultValue: latest.kind },
      )
    : t('event.tower.up');

  return (
    <footer className={styles.footer}>
      <div className={styles.legends}>
        <div className={styles.legend}>
          <span
            style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--lamp)' }}
          />
          <span className={styles.legendText}>{t('footer.legendLit')}</span>
        </div>
        <div className={styles.legend}>
          <span style={{ width: 9, height: 9, border: '1px solid oklch(0.46 0.012 80)' }} />
          <span className={styles.legendText}>{t('footer.legendDark')}</span>
        </div>
        <div className={styles.legend}>
          <span className={styles.whipGlyph} />
          <span className={styles.legendText}>{t('footer.legendWhip')}</span>
        </div>
      </div>
      <div className={styles.logLine}>
        <span className={styles.sectionLabel}>{t('footer.log')}</span>
        <span className={styles.logText}>{line}</span>
      </div>
    </footer>
  );
}
