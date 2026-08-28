import { useTranslation } from 'react-i18next';
import styles from './chrome.module.css';
import { number } from '../lib/format';
import { LANGUAGES, persistLanguage, type Language } from '../i18n';
import { useTower } from '../store/tower';

/**
 * Title, the four status chips, the language switch and the two big readouts.
 * Everything here is derived: the tower has no controls in the header.
 */
export function Header({ onToggleDrawer }: { onToggleDrawer: () => void }) {
  const { t, i18n } = useTranslation();
  const stats = useTower((s) => s.stats);
  const whips = useTower((s) => s.whips);
  const liftFloor = useTower((s) => s.liftFloor);
  const floors = useTower((s) => s.floors);

  const badge = floors.find((f) => f.id === liftFloor)?.num ?? '01';

  const pick = (language: Language) => {
    void i18n.changeLanguage(language);
    persistLanguage(language);
  };

  return (
    <header className={styles.header}>
      <button type="button" className={styles.drawerToggle} onClick={onToggleDrawer}>
        {t('sidebar.openFloors')}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div className={styles.title}>{t('header.title')}</div>
      </div>

      <div className={styles.chips}>
        <div className={styles.chip}>
          <span
            className={styles.dot}
            style={{ background: 'var(--work)', boxShadow: '0 0 8px var(--work)' }}
          />
          <span>{t('header.onShift', { count: stats.shift })}</span>
        </div>
        <div className={styles.chip}>
          <span
            className={styles.dot}
            style={{ background: 'var(--lamp)', boxShadow: '0 0 8px oklch(0.9 0.1 86)' }}
          />
          <span>{t('header.lit', { count: stats.lit, total: stats.floorCount })}</span>
        </div>
        <div className={`${styles.chip} ${styles.chipDark}`}>
          <span className={styles.square} />
          <span>{t('header.dark', { count: stats.dark })}</span>
        </div>
        <div className={`${styles.chip} ${styles.chipWhip}`}>
          <span className={styles.whipGlyph} />
          <span>{t('header.whips', { count: whips })}</span>
        </div>
      </div>

      <div className={styles.readouts}>
        <div className={styles.lang}>
          {LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              className={`${styles.langButton} ${
                i18n.resolvedLanguage === language ? styles.langActive : ''
              }`}
              onClick={() => pick(language)}
            >
              {language}
            </button>
          ))}
        </div>
        <div className={styles.rule} />
        <div className={styles.readout}>
          <div className={styles.readoutLabel}>{t('header.tokens')}</div>
          <div className={styles.readoutValue}>
            {number(stats.tokens, i18n.resolvedLanguage ?? 'en')}
          </div>
        </div>
        <div className={styles.rule} />
        <div className={styles.readout}>
          <div className={styles.readoutLabel}>{t('header.lift')}</div>
          <div className={styles.readoutValue} style={{ color: 'var(--accent)' }}>
            {badge}
          </div>
        </div>
      </div>
    </header>
  );
}
