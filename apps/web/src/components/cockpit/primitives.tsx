/**
 * Cockpit primitives — typed React ports of the prototype components.
 * Source: design/handoff/tk-cockpit-primitives.jsx
 *
 * All visual decisions (colors, spacings, letter-spacing, sizes) match the prototype 1:1.
 * Wrap any consumer in `<div className="ck">…</div>` so the cockpit CSS scope applies.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CK, CK_TONE_COLOR, type CKTone } from './tokens';

// ── CKLabel ─────────────────────────────────────────────────────────────────
export interface CKLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'dim' | 'text' | 'amber' | 'alarm';
}

export const CKLabel = React.forwardRef<HTMLDivElement, CKLabelProps>(
  ({ children, className, tone = 'dim', style, ...rest }, ref) => {
    const color =
      tone === 'dim' ? CK.dim : tone === 'amber' ? CK.amber : tone === 'alarm' ? CK.alarm : CK.text;
    return (
      <div
        ref={ref}
        className={cn('text-[10px] uppercase font-medium', className)}
        style={{ color, letterSpacing: '0.18em', ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
CKLabel.displayName = 'CKLabel';

// ── CKValue ─────────────────────────────────────────────────────────────────
export interface CKValueProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: CKTone;
}

const VALUE_SIZES: Record<NonNullable<CKValueProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

export const CKValue = React.forwardRef<HTMLDivElement, CKValueProps>(
  ({ children, size = 'md', tone = 'text', className, style, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('ck-num font-medium', VALUE_SIZES[size], className)}
      style={{ color: CK_TONE_COLOR[tone], ...style }}
      {...rest}
    >
      {children}
    </div>
  ),
);
CKValue.displayName = 'CKValue';

// ── CKPanel ─────────────────────────────────────────────────────────────────
export interface CKPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  corners?: boolean;
  label?: React.ReactNode;
  value?: React.ReactNode;
  /** Color for the right-hand value text in the header. Defaults to dim. */
  accent?: string;
}

export const CKPanel = React.forwardRef<HTMLDivElement, CKPanelProps>(
  ({ children, className, corners = false, label, value, accent, style, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('relative border', corners && 'ck-corners', className)}
      style={{ borderColor: CK.rule, background: CK.surface, ...style }}
      {...rest}
    >
      {(label || value) && (
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b"
          style={{ borderColor: CK.rule }}
        >
          {label ? <CKLabel>{label}</CKLabel> : <span />}
          {value && (
            <span
              className="text-[10px] ck-num"
              style={{ color: accent ?? CK.dim, letterSpacing: '0.1em' }}
            >
              {value}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  ),
);
CKPanel.displayName = 'CKPanel';

// ── CKChip ──────────────────────────────────────────────────────────────────
export interface CKChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: CKTone;
}

export const CKChip = React.forwardRef<HTMLSpanElement, CKChipProps>(
  ({ children, tone = 'dim', className, style, ...rest }, ref) => {
    const c = CK_TONE_COLOR[tone];
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-medium uppercase border',
          className,
        )}
        style={{ borderColor: c, color: c, letterSpacing: '0.14em', ...style }}
        {...rest}
      >
        {children}
      </span>
    );
  },
);
CKChip.displayName = 'CKChip';

// ── CKBtn ───────────────────────────────────────────────────────────────────
export type CKBtnVariant = 'ghost' | 'primary' | 'alarm' | 'quiet';
export type CKBtnSize = 'sm' | 'md' | 'lg';

export interface CKBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CKBtnVariant;
  size?: CKBtnSize;
}

const BTN_STYLES: Record<CKBtnVariant, { color: string; bg: string; border: string }> = {
  ghost: { color: CK.text, bg: 'transparent', border: CK.rule2 },
  primary: { color: CK.bg, bg: CK.amber, border: CK.amber },
  alarm: { color: '#fff', bg: CK.alarm, border: CK.alarm },
  quiet: { color: CK.dim, bg: 'transparent', border: 'transparent' },
};

const BTN_SIZES: Record<CKBtnSize, string> = {
  sm: 'h-7 px-2.5 text-[11px]',
  md: 'h-9 px-3.5 text-xs',
  lg: 'h-11 px-4 text-sm',
};

export const CKBtn = React.forwardRef<HTMLButtonElement, CKBtnProps>(
  ({ children, variant = 'ghost', size = 'md', className, style, type = 'button', ...rest }, ref) => {
    const s = BTN_STYLES[variant];
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 uppercase font-medium border transition-colors disabled:opacity-40',
          BTN_SIZES[size],
          className,
        )}
        style={{
          color: s.color,
          background: s.bg,
          borderColor: s.border,
          letterSpacing: '0.14em',
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
CKBtn.displayName = 'CKBtn';

// ── CKDigit ─────────────────────────────────────────────────────────────────
// Big segmented digital readout (HH:MM:SS style)
export interface CKDigitProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  size?: number;
  tone?: Exclude<CKTone, 'dim'>;
}

const DIGIT_TONES: Record<NonNullable<CKDigitProps['tone']>, string> = {
  text: CK.text,
  amber: CK.amber,
  alarm: CK.alarm,
  ok: CK.ok,
};

export const CKDigit = React.forwardRef<HTMLDivElement, CKDigitProps>(
  ({ value, size = 56, tone = 'text', className, style, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('ck-num leading-none font-light', className)}
      style={{
        fontSize: size,
        color: DIGIT_TONES[tone],
        fontFamily: "'IBM Plex Sans Condensed', sans-serif",
        letterSpacing: '-0.04em',
        ...style,
      }}
      {...rest}
    >
      {value}
    </div>
  ),
);
CKDigit.displayName = 'CKDigit';
