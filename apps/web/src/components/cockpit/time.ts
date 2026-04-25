/**
 * Time helpers for the cockpit views.
 * Ported from `tk-data.jsx` (Claude Design handoff).
 */

export function minsBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000));
}

/** "8:02a" / "1:47p" — short lowercase am/pm marker, no space. */
export function fmtShort(d: Date | null | undefined): string {
  if (!d) return '—';
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'p' : 'a';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')}${ap}`;
}

/** "8:02 AM" / "1:47 PM" — long marker. */
export function fmtTime(d: Date | null | undefined): string {
  if (!d) return '—';
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export type EntryType =
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'LUNCH_START'
  | 'LUNCH_END'
  | 'BREAK_ACK_1'
  | 'BREAK_ACK_2'
  | 'BREAK_ACK_3';

const ENTRY_LABELS: Record<EntryType, string> = {
  CLOCK_IN: 'Clocked in',
  CLOCK_OUT: 'Clocked out',
  LUNCH_START: 'Lunch start',
  LUNCH_END: 'Lunch end',
  BREAK_ACK_1: 'Rest break 1',
  BREAK_ACK_2: 'Rest break 2',
  BREAK_ACK_3: 'Rest break 3',
};

export function entryLabel(t: EntryType | string): string {
  return ENTRY_LABELS[t as EntryType] ?? t;
}
