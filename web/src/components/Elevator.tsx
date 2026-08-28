import { useEffect, useState } from 'react';
import styles from './canvas.module.css';
import { DOOR_HOLD, useTower } from '../store/tower';

/**
 * The single car that serves the whole tower.
 *
 * Travel is a CSS transition on `top`, not a keyframe, so an interrupted trip
 * retargets smoothly. The doors are driven by the store rather than by the
 * car's own timer: whoever called the lift knows when it will land, and the
 * passenger's walk is timed against the same number (plan 5.3).
 */
export function Elevator() {
  const liftY = useTower((s) => s.liftY);
  const liftFloor = useTower((s) => s.liftFloor);
  const doorSeq = useTower((s) => s.liftDoorSeq);
  const doorIn = useTower((s) => s.liftDoorIn);
  const floors = useTower((s) => s.floors);
  const overflowUsed = useTower((s) => s.stats.overflowUsed);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!doorSeq) return;
    // held open long enough for one passenger to step through either way
    const openAt = window.setTimeout(() => setOpen(true), doorIn);
    const shutAt = window.setTimeout(() => setOpen(false), doorIn + DOOR_HOLD);
    return () => {
      window.clearTimeout(openAt);
      window.clearTimeout(shutAt);
    };
    // the sequence number is the event; `doorIn` only says how long to wait
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorSeq]);

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
