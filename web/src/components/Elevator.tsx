import { useEffect, useState } from 'react';
import styles from './canvas.module.css';
import { useTower } from '../store/tower';

/**
 * The single car that serves the whole tower.
 *
 * Travel is a CSS transition on `top`, not a keyframe, so an interrupted trip
 * retargets smoothly. The doors open on arrival — the centre seam widens from
 * 3px to 26px — and close again once the passenger is out (plan 5.3).
 */
export function Elevator() {
  const liftY = useTower((s) => s.liftY);
  const liftFloor = useTower((s) => s.liftFloor);
  const floors = useTower((s) => s.floors);
  const overflowUsed = useTower((s) => s.stats.overflowUsed);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // the doors open when the car lands and shut once the agent is seated
    const openAt = window.setTimeout(() => setOpen(true), 1150);
    const shutAt = window.setTimeout(() => setOpen(false), 2050);
    return () => {
      window.clearTimeout(openAt);
      window.clearTimeout(shutAt);
    };
  }, [liftY]);

  const shaftHeight = overflowUsed ? 2900 : 2430;
  const badge = floors.find((f) => f.id === liftFloor)?.num ?? '01';
  const seam = open ? 26 : 3;

  return (
    <>
      <div className={styles.shaftRail} style={{ left: 1030, height: shaftHeight }} />
      <div className={styles.shaftRail} style={{ left: 1112, height: shaftHeight }} />
      <div className={styles.car} style={{ top: liftY }}>
        <div className={styles.carPanel} />
        <div className={styles.carDoor} style={{ left: 45 - (seam - 3) / 2, width: seam }} />
        <div className={styles.carBadge}>{badge}</div>
      </div>
    </>
  );
}
