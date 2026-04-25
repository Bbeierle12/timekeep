/**
 * Cockpit modal sheets — full-bleed, terminal-styled bottom sheets.
 * Ported from `design/handoff/tk-cockpit-modals.jsx`.
 *
 * `CKSheet` is the shell; `LunchWarningSheet`, `BreakAckSheet`,
 * `WaiverSheet`, `AttestationSheet` are the four content variants
 * referenced by `ShiftCockpit`.
 *
 * Sheets render absolutely-positioned within the nearest positioned
 * ancestor (the iOS device frame in preview, or the Shift screen container
 * itself). Each calls `onClose` when the backdrop is clicked.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CK } from './tokens';
import { CKBtn } from './primitives';
import { fmtShort } from './time';
import type { MockScenario } from './mockScenarios';

type SheetTone = 'text' | 'amber' | 'alarm';

interface CKSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tone?: SheetTone;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function CKSheet({
  open,
  onClose,
  title,
  tone = 'text',
  footer,
  children,
}: CKSheetProps) {
  if (!open) return null;
  const c = tone === 'alarm' ? CK.alarm : tone === 'amber' ? CK.amber : CK.text;
  return (
    <div className="ck absolute inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.78)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full flex flex-col max-h-[94%] border-t-2"
        style={{ background: CK.bg, borderTopColor: c }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: CK.rule }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5" style={{ background: c }} />
            <span
              className="text-[10px] tracking-[0.2em]"
              style={{ color: c }}
            >
              {title.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] tracking-[0.18em] px-2 py-1 border"
            style={{ color: CK.dim, borderColor: CK.rule2 }}
          >
            CLOSE ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ color: CK.text }}>
          {children}
        </div>
        {footer && (
          <div
            className="border-t"
            style={{ borderColor: CK.rule2, background: CK.surface }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface CKKVProps {
  k: string;
  v: React.ReactNode;
  tone?: 'text' | 'amber' | 'alarm' | 'ok' | 'dim';
}

export function CKKV({ k, v, tone = 'text' }: CKKVProps) {
  const c =
    tone === 'amber'
      ? CK.amber
      : tone === 'alarm'
        ? CK.alarm
        : tone === 'ok'
          ? CK.ok
          : tone === 'dim'
            ? CK.dim
            : CK.text;
  return (
    <div
      className="flex justify-between items-baseline px-3 py-2 border-b"
      style={{ borderColor: CK.rule }}
    >
      <span
        className="text-[10px] tracking-[0.16em]"
        style={{ color: CK.dim }}
      >
        {k}
      </span>
      <span className="text-[11px] ck-num" style={{ color: c }}>
        {v}
      </span>
    </div>
  );
}

// ── LunchWarningSheet ──────────────────────────────────────────────────────
interface LunchWarningSheetProps {
  open: boolean;
  scenario: MockScenario;
  onClose: () => void;
  onTakeLunch: () => void;
  onWaive: () => void;
}

export function LunchWarningSheet({
  open,
  scenario,
  onClose,
  onTakeLunch,
  onWaive,
}: LunchWarningSheetProps) {
  const w = scenario.warning;
  if (!open || !w) return null;
  const urgent = w.stage === 'stage3';
  const clockIn = scenario.entries[0]?.at;
  const deadline = clockIn
    ? new Date(clockIn.getTime() + 5 * 3_600_000)
    : null;
  return (
    <CKSheet
      open={open}
      onClose={onClose}
      title={urgent ? '▲ ALARM / MEAL OVERDUE' : '△ ADVISORY / MEAL DUE'}
      tone={urgent ? 'alarm' : 'amber'}
      footer={
        <div
          className="grid grid-cols-2 gap-px"
          style={{ background: CK.rule }}
        >
          <CKBtn
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={onWaive}
          >
            SIGN 226-W WAIVER
          </CKBtn>
          <CKBtn
            size="lg"
            variant={urgent ? 'alarm' : 'primary'}
            className="w-full"
            onClick={onTakeLunch}
          >
            BEGIN MEAL NOW
          </CKBtn>
        </div>
      }
    >
      <div className="px-3 py-4">
        <div
          className="text-[10px] tracking-[0.2em]"
          style={{ color: CK.dim }}
        >
          STATUS
        </div>
        <div
          className="ck-num font-light mt-1 leading-none"
          style={{
            fontFamily: "'IBM Plex Sans Condensed', sans-serif",
            fontSize: 72,
            letterSpacing: '-0.04em',
            color: urgent ? CK.alarm : CK.amber,
          }}
        >
          {urgent
            ? `+${Math.abs(w.minutesLeft).toString().padStart(2, '0')}M`
            : `T-${w.minutesLeft.toString().padStart(2, '0')}M`}
        </div>
        <div
          className="text-[11px] mt-2 uppercase"
          style={{ color: CK.text, letterSpacing: '0.06em' }}
        >
          {urgent
            ? 'MEAL DEADLINE PASSED — ACTION REQUIRED'
            : 'MEAL DUE SOON'}
        </div>
      </div>

      <div
        className="border-t border-b"
        style={{ borderColor: CK.rule2, background: CK.surface }}
      >
        <CKKV
          k="CLOCK IN"
          v={clockIn ? fmtShort(clockIn).toUpperCase() : '—'}
        />
        <CKKV
          k="DEADLINE"
          v={deadline ? fmtShort(deadline).toUpperCase() : '—'}
          tone={urgent ? 'alarm' : 'amber'}
        />
        <CKKV k="RULE" v="CA IWC §11 / 5H" />
        <CKKV k="IF MISSED" v="1H PREMIUM PAY OWED" tone="alarm" />
      </div>

      <div
        className="px-3 py-3 text-[10px] leading-relaxed"
        style={{ color: CK.dim }}
      >
        CA LABOR CODE §512 REQUIRES A 30-MIN UNPAID MEAL PERIOD BEFORE THE END
        OF THE 5TH HOUR. WAIVER PERMITTED ONLY IF TOTAL SHIFT DOES NOT EXCEED
        6 HOURS.
      </div>
    </CKSheet>
  );
}

// ── BreakAckSheet ──────────────────────────────────────────────────────────
type BreakChoice = 'taken' | 'short' | 'skipped';

interface BreakAckSheetProps {
  open: boolean;
  breakNum: number;
  onClose: () => void;
  onConfirm: (choice: BreakChoice) => void;
}

export function BreakAckSheet({
  open,
  breakNum,
  onClose,
  onConfirm,
}: BreakAckSheetProps) {
  const [choice, setChoice] = React.useState<BreakChoice>('taken');
  if (!open) return null;
  const opts: Array<[BreakChoice, string, string]> = [
    ['taken', 'TOOK BREAK', 'FULL 10M / UNINTERRUPTED'],
    ['short', 'INTERRUPTED', 'NOTIFIES MANAGER'],
    ['skipped', 'VOLUNTARY SKIP', 'MAY TAKE LATER OR NOT AT ALL'],
  ];
  return (
    <CKSheet
      open={open}
      onClose={onClose}
      title={`REST BREAK ${breakNum} / ACK`}
      footer={
        <CKBtn
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => onConfirm(choice)}
        >
          CONFIRM ▸
        </CKBtn>
      }
    >
      <div className="px-3 py-4">
        <div
          className="text-[10px] tracking-[0.18em]"
          style={{ color: CK.dim }}
        >
          RECORD
        </div>
        <div className="text-[13px] mt-1" style={{ color: CK.text }}>
          Paid 10-minute rest break. Required for 4h or major fraction
          thereof.
        </div>
      </div>
      <div>
        {opts.map(([k, t, s]) => (
          <button
            key={k}
            type="button"
            onClick={() => setChoice(k)}
            className="w-full text-left px-3 py-3 border-b flex items-center gap-3"
            style={{
              borderColor: CK.rule,
              background:
                choice === k ? 'rgba(255,176,0,0.06)' : 'transparent',
            }}
          >
            <span
              className="w-4 h-4 flex items-center justify-center border"
              style={{
                borderColor: choice === k ? CK.amber : CK.rule2,
              }}
            >
              {choice === k && (
                <span className="w-2 h-2" style={{ background: CK.amber }} />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="text-[11px] tracking-[0.18em]"
                style={{ color: CK.text }}
              >
                {t}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: CK.dim }}>
                {s}
              </div>
            </div>
          </button>
        ))}
      </div>
    </CKSheet>
  );
}

// ── WaiverSheet ────────────────────────────────────────────────────────────
interface WaiverSheetProps {
  open: boolean;
  onClose: () => void;
  onSign: () => void;
}

export function WaiverSheet({ open, onClose, onSign }: WaiverSheetProps) {
  const [signed, setSigned] = React.useState(false);
  React.useEffect(() => {
    if (!open) setSigned(false);
  }, [open]);
  if (!open) return null;

  const dateStr = new Date()
    .toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })
    .toUpperCase();
  const sigTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <CKSheet
      open={open}
      onClose={onClose}
      title="FORM 226-W / MEAL WAIVER"
      footer={
        <CKBtn
          variant="primary"
          size="lg"
          disabled={!signed}
          onClick={onSign}
          className="w-full"
        >
          SIGN &amp; SUBMIT ▸
        </CKBtn>
      }
    >
      <div
        className="px-3 py-4 text-[11px] leading-relaxed"
        style={{ color: CK.text }}
      >
        I VOLUNTARILY WAIVE MY FIRST MEAL PERIOD TODAY. MY TOTAL SHIFT WILL
        NOT EXCEED SIX (6) HOURS. I UNDERSTAND I MAY REVOKE THIS WAIVER AT
        ANY TIME BEFORE THE DEADLINE.
      </div>
      <div
        className="border-t border-b"
        style={{ borderColor: CK.rule2, background: CK.surface }}
      >
        <CKKV k="EMPLOYEE" v="DELGADO, M. / EMP-2418" />
        <CKKV k="DATE" v={dateStr} />
        <CKKV k="WAIVER" v="FIRST MEAL" />
        <CKKV k="VALID IF" v="SHIFT ≤ 6H" />
      </div>
      <div className="px-3 py-4">
        <div
          className="text-[9px] tracking-[0.2em]"
          style={{ color: CK.dim }}
        >
          E-SIGNATURE ▼
        </div>
        <button
          type="button"
          onClick={() => setSigned(true)}
          className="w-full h-28 mt-2 border flex items-center justify-center"
          style={{
            borderColor: signed ? CK.ok : CK.rule2,
            background: signed ? 'rgba(105,210,124,0.06)' : CK.surface,
            borderStyle: signed ? 'solid' : 'dashed',
          }}
        >
          {signed ? (
            <div
              className="text-[11px] tracking-[0.18em]"
              style={{ color: CK.ok }}
            >
              ● SIGNATURE CAPTURED / {sigTime}
            </div>
          ) : (
            <svg
              width="220"
              height="50"
              viewBox="0 0 220 50"
              style={{ color: CK.dim, opacity: 0.6 }}
            >
              <path
                d="M10 40 Q 25 10, 45 30 T 85 30 T 125 35 T 170 22 T 210 32"
                stroke="currentColor"
                fill="none"
                strokeWidth="1.5"
              />
              <text
                x="110"
                y="12"
                fill="currentColor"
                fontSize="8"
                textAnchor="middle"
                letterSpacing="3"
                fontFamily="IBM Plex Mono"
              >
                TAP TO SIGN
              </text>
            </svg>
          )}
        </button>
      </div>
    </CKSheet>
  );
}

// ── AttestationSheet ───────────────────────────────────────────────────────
type AttestationOption = 'accurate' | 'missed' | 'correction';

interface AttestationSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (option: AttestationOption) => void;
  payPeriodEnding?: string;
}

export function AttestationSheet({
  open,
  onClose,
  onSubmit,
  payPeriodEnding = 'APR 27, 2026',
}: AttestationSheetProps) {
  const [opt, setOpt] = React.useState<AttestationOption | null>(null);
  React.useEffect(() => {
    if (!open) setOpt(null);
  }, [open]);
  if (!open) return null;
  const opts: Array<[AttestationOption, string, string]> = [
    ['accurate', 'RECORDS ARE ACCURATE', 'NO CORRECTIONS NEEDED'],
    ['missed', 'MISSED MEAL OR REST', 'REASON SELECTION FOLLOWS'],
    ['correction', 'NEED A CORRECTION', 'OPEN CORRECTION REQUEST'],
  ];
  return (
    <CKSheet
      open={open}
      onClose={onClose}
      title="FORM 226-C / PAY PERIOD CERTIFICATION"
      footer={
        <CKBtn
          variant="primary"
          size="lg"
          disabled={!opt}
          onClick={() => opt && onSubmit(opt)}
          className="w-full"
        >
          SUBMIT CERTIFICATION ▸
        </CKBtn>
      }
    >
      <div className="px-3 py-4">
        <div
          className="text-[10px] tracking-[0.18em]"
          style={{ color: CK.dim }}
        >
          PAY PERIOD ENDING
        </div>
        <div
          className="ck-num font-light mt-1"
          style={{
            fontFamily: "'IBM Plex Sans Condensed', sans-serif",
            fontSize: 40,
            letterSpacing: '-0.02em',
            color: CK.text,
          }}
        >
          {payPeriodEnding}
        </div>
      </div>
      <div>
        {opts.map(([k, t, s]) => (
          <button
            key={k}
            type="button"
            onClick={() => setOpt(k)}
            className="w-full text-left px-3 py-3 border-b flex items-center gap-3"
            style={{
              borderColor: CK.rule,
              background: opt === k ? 'rgba(255,176,0,0.06)' : 'transparent',
            }}
          >
            <span
              className="w-4 h-4 flex items-center justify-center border"
              style={{ borderColor: opt === k ? CK.amber : CK.rule2 }}
            >
              {opt === k && (
                <span className="w-2 h-2" style={{ background: CK.amber }} />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="text-[11px] tracking-[0.18em]"
                style={{ color: CK.text }}
              >
                {t}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: CK.dim }}>
                {s}
              </div>
            </div>
          </button>
        ))}
      </div>
    </CKSheet>
  );
}

export type { BreakChoice, AttestationOption };
