/**
 * Cockpit design tokens.
 *
 * Ported from `design/handoff/tk-cockpit-primitives.jsx` (Claude Design handoff, 2026-04-24).
 * Aesthetic: instrument panel — black background, IBM Plex Mono, hairline rules,
 * sharp 90° corners, ALL CAPS labels, monochrome with one alarm color.
 */
export const CK = {
  bg: '#000000',
  surface: '#0a0a0a',
  text: '#e8e6df', // warm off-white
  dim: '#8a857a',
  fade: '#3a3833',
  rule: 'rgba(255,255,255,0.10)',
  rule2: 'rgba(255,255,255,0.18)',
  amber: '#ffb000', // primary accent
  alarm: '#ff3b3b', // sparing
  ok: '#69d27c', // muted CRT green
} as const;

export type CKTone = 'text' | 'dim' | 'amber' | 'alarm' | 'ok';

export const CK_TONE_COLOR: Record<CKTone, string> = {
  text: CK.text,
  dim: CK.dim,
  amber: CK.amber,
  alarm: CK.alarm,
  ok: CK.ok,
};
