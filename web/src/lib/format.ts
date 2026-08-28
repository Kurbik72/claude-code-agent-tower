import type { Status, ToolStatus } from './types';

export const STATUS_COLOR: Record<Status, string> = {
  work: 'oklch(0.75 0.13 148)',
  wait: 'oklch(0.79 0.13 76)',
  dead: 'oklch(0.6 0.19 28)',
};

export const TOOL_COLOR: Record<ToolStatus, string> = {
  'ок': 'oklch(0.74 0.12 148)',
  'идёт': 'oklch(0.86 0.12 84)',
  'ждёт': 'oklch(0.6 0.016 80)',
  'упал': 'oklch(0.64 0.19 28)',
};

const EVENT_COLOR: Record<string, string> = {
  'agent.enter': 'oklch(0.75 0.13 148)',
  'agent.move': 'oklch(0.79 0.13 76)',
  'agent.leave': 'oklch(0.5 0.012 80)',
  'agent.dead': 'oklch(0.6 0.19 28)',
  'head.open': 'oklch(0.78 0.09 210)',
  whip: 'oklch(0.79 0.13 76)',
  whipTerrace: 'oklch(0.72 0.1 200)',
  whipDead: 'oklch(0.6 0.19 28)',
  warn: 'oklch(0.72 0.1 44)',
  'tower.up': 'oklch(0.86 0.09 88)',
};

export function eventColor(kind: string): string {
  return EVENT_COLOR[kind] || 'oklch(0.5 0.012 80)';
}

/** Clock in the event feed, in the reader's locale. */
export function clock(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(ms));
}

export function number(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(Math.floor(value));
}
