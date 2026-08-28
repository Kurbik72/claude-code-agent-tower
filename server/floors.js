/**
 * Floor definitions and isometric slot geometry.
 *
 * The tower world is 1180px wide; every floor is a 760x600 wrapper at left:240px,
 * stacked on a 470px vertical step. Slot positions are generated inside that
 * wrapper from the 2:1 isometric basis (angle 26.565deg = atan(0.5)).
 */

/** Vertical step between floor wrappers, in world px. */
export const FLOOR_STEP = 470;
/** Left offset of every floor wrapper inside the world. */
export const FLOOR_X = 240;
/** Elevator car offset from a floor's wrapper top. */
export const CAR_OFFSET = 260;

/** Floors, top floor first. `key` is the classifier's floor name. */
export const FLOORS = [
  { id: 'f5', num: '05', key: 'frontend', top: 30,   tone: 'oklch(0.8 0.06 200)',  noWhip: true },
  { id: 'f4', num: '04', key: 'testers',  top: 500,  tone: 'oklch(0.8 0.05 84)' },
  { id: 'f3', num: '03', key: 'qa',       top: 970,  tone: 'oklch(0.78 0.04 96)' },
  { id: 'f2', num: '02', key: 'devops',   top: 1440, tone: 'oklch(0.76 0.05 160)' },
  { id: 'f1', num: '01', key: 'backend',  top: 1910, tone: 'oklch(0.74 0.04 84)' },
  { id: 'f0', num: '00', key: 'overflow', top: 2380, tone: 'oklch(0.6 0.014 80)', overflow: true },
];

/** The five themed floors — floor 00 only exists while it holds someone. */
export const THEMED_FLOORS = FLOORS.filter((f) => !f.overflow);

/** Classifier floor name -> floor id. `unknown` goes to the basement (plan 4.5). */
export const FLOOR_BY_KEY = {
  frontend: 'f5',
  testers: 'f4',
  qa: 'f3',
  devops: 'f2',
  backend: 'f1',
  unknown: 'f1',
};

export const OVERFLOW_FLOOR_ID = 'f0';
/** Capacity of a themed floor: 16 grid cells minus a 4-cell furniture mask. */
export const FLOOR_CAPACITY = 12;
/** Capacity of floor 00 "пересменка": a compact 6x4 grid. */
export const OVERFLOW_CAPACITY = 24;

/**
 * Cells of the themed 4x4 grid that furniture already occupies, per floor.
 * Kept as a flat list of "i,j" keys so the mask is data, not geometry code.
 */
const FURNITURE_MASK = {
  // terrace: loungers, parasol and planters cluster at the back of the plate
  f5: ['0,0', '1,0', '0,1', '1,1'],
  // meeting room: the long table sits dead centre
  f4: ['1,1', '2,1', '1,2', '2,2'],
  // kitchen: counter, stove and the borsch pot take the right-hand run
  f3: ['2,0', '3,0', '2,1', '3,1'],
  // reception: the desk runs from the middle towards the elevator
  f2: ['2,1', '3,1', '2,2', '3,2'],
  // basement: pipes and junk along the front edge
  f1: ['0,3', '1,3', '2,3', '3,3'],
};

/** Themed-floor grid: 4x4 cells around the plate centre. */
const THEMED_GRID = { size: 4, ox: 380, oy: 300, ux: 58, uy: 29 };
/** Floor 00 grid: 6 columns x 4 rows on a tighter step. */
const OVERFLOW_GRID = { cols: 6, rows: 4, ox: 380, oy: 280, ux: 48, uy: 24 };

function themedSlots(floorId) {
  const g = THEMED_GRID;
  const mask = new Set(FURNITURE_MASK[floorId] || []);
  const slots = [];
  for (let j = 0; j < g.size; j++) {
    for (let i = 0; i < g.size; i++) {
      const key = `${i},${j}`;
      if (mask.has(key)) continue;
      const x = g.ox + g.ux * (i - j);
      const y = g.oy + g.uy * (i + j);
      slots.push({ index: slots.length, i, j, x, y, z: Math.round(y) });
    }
  }
  return slots;
}

function overflowSlots() {
  const g = OVERFLOW_GRID;
  const slots = [];
  for (let j = 0; j < g.rows; j++) {
    for (let i = 0; i < g.cols; i++) {
      const x = g.ox + g.ux * (i - j);
      const y = g.oy + g.uy * (i + j);
      slots.push({ index: slots.length, i, j, x, y, z: Math.round(y) });
    }
  }
  return slots;
}

const SLOTS = Object.fromEntries(
  FLOORS.map((f) => [f.id, f.overflow ? overflowSlots() : themedSlots(f.id)]),
);

/** All usable slots of a floor, ordered back-to-front. */
export function slotsOf(floorId) {
  return SLOTS[floorId] || [];
}

export function capacityOf(floorId) {
  return slotsOf(floorId).length;
}

export function floorById(id) {
  return FLOORS.find((f) => f.id === id) || null;
}

/** World height depends on whether floor 00 is in play (plan 5.2). */
export function worldHeight(overflowUsed) {
  return overflowUsed ? 3030 : 2560;
}

export function shaftHeight(overflowUsed) {
  return overflowUsed ? 2900 : 2430;
}
