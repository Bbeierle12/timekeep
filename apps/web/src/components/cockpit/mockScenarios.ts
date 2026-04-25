/**
 * Mock cockpit scenarios — temporary, drives the prototype port until P1.5
 * (real API wiring) lands. Source: `design/handoff/tk-data.jsx`.
 *
 * TODO(cockpit-p1.5): replace with real time-entry feed from
 * `services/timeEntries` + `services/compliance`.
 */
import type { EntryType } from './time';

export interface MockEntry {
  type: EntryType;
  at: Date;
  note?: string;
}

export interface MockWarning {
  stage: 'stage1' | 'stage2' | 'stage3';
  minutesLeft: number;
  copy: string;
}

export interface MockScenario {
  label: string;
  now: Date;
  entries: MockEntry[];
  warning: MockWarning | null;
}

export type ScenarioKey = 'compliant' | 'atRisk' | 'violation';

const today = new Date();
today.setHours(13, 47, 0, 0);

const mkTime = (h: number, m: number): Date => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d;
};

export const SCENARIOS: Record<ScenarioKey, MockScenario> = {
  compliant: {
    label: 'On track',
    now: mkTime(13, 47),
    entries: [
      { type: 'CLOCK_IN', at: mkTime(8, 2), note: 'Clocked in — Geofence OK' },
      { type: 'BREAK_ACK_1', at: mkTime(10, 14), note: 'Rest break 1 taken' },
      { type: 'LUNCH_START', at: mkTime(12, 30), note: 'Lunch start' },
      { type: 'LUNCH_END', at: mkTime(13, 4), note: 'Lunch end — 34 min' },
    ],
    warning: null,
  },
  atRisk: {
    label: 'Approaching 5-hour deadline',
    now: mkTime(12, 48),
    entries: [
      { type: 'CLOCK_IN', at: mkTime(8, 2), note: 'Clocked in — Geofence OK' },
      { type: 'BREAK_ACK_1', at: mkTime(10, 14), note: 'Rest break 1 taken' },
    ],
    warning: { stage: 'stage2', minutesLeft: 14, copy: 'Lunch required by 1:02 PM' },
  },
  violation: {
    label: 'Past 5-hour deadline — waiver or premium',
    now: mkTime(13, 12),
    entries: [
      { type: 'CLOCK_IN', at: mkTime(8, 2), note: 'Clocked in — Geofence OK' },
      { type: 'BREAK_ACK_1', at: mkTime(10, 14), note: 'Rest break 1 taken' },
    ],
    warning: { stage: 'stage3', minutesLeft: -10, copy: 'Deadline passed. Take lunch now or sign waiver.' },
  },
};
