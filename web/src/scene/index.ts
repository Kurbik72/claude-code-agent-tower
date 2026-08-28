import { f0 } from './f0';
import { f1 } from './f1';
import { f2 } from './f2';
import { f3 } from './f3';
import { f4 } from './f4';
import { f5 } from './f5';
import type { FloorScene } from './types';

export const SCENES: Record<string, FloorScene> = { f0, f1, f2, f3, f4, f5 };
export type { FloorScene, Prop } from './types';
