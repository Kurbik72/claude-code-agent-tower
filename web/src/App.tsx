import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './components/chrome.module.css';
import { Canvas } from './components/Canvas';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { connectStream, fetchState } from './lib/api';
import { setWhipCopy, useTower } from './store/tower';
import type { FloorId } from './lib/types';

/** The whip fires on its own every 20-45s at a random non-terrace floor. */
const WHIP_MIN = 20_000;
const WHIP_SPAN = 25_000;

export function App() {
  const { t, i18n } = useTranslation();
  const applySnapshot = useTower((s) => s.applySnapshot);
  const sendLift = useTower((s) => s.sendLift);
  const whip = useTower((s) => s.whip);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    fetchState().then(applySnapshot).catch(() => {});
    return connectStream();
  }, [applySnapshot]);

  useEffect(() => {
    setWhipCopy({
      lines: t('whipLog', { returnObjects: true }) as unknown as string[],
      cries: t('cries', { returnObjects: true }) as unknown as string[],
    });
  }, [t, i18n.resolvedLanguage]);

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        const state = useTower.getState();
        const targets = Object.values(state.agents).filter((agent) => {
          const floor = state.floors.find((f) => f.id === agent.floorId);
          return floor && !floor.noWhip && agent.status !== 'dead';
        });
        if (targets.length) {
          whip(targets[Math.floor(Math.random() * targets.length)].id, 'timer');
        }
        schedule();
      }, WHIP_MIN + Math.random() * WHIP_SPAN);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [whip]);

  const selectFloor = (id: FloorId) => {
    sendLift(id, true);
    setDrawer(false);
  };

  return (
    <div className={styles.shell}>
      <Header onToggleDrawer={() => setDrawer((open) => !open)} />
      <div className={styles.body} style={{ position: 'relative' }}>
        <Sidebar open={drawer} onSelect={selectFloor} />
        <Canvas />
      </div>
      <Footer />
    </div>
  );
}
