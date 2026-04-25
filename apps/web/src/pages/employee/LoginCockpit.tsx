/**
 * LoginCockpit — terminal-boot PIN entry screen.
 * Ported from second `CKLoginView` in `design/handoff/tk-cockpit-employee-screens.jsx`
 * (the simpler version that's exported via Object.assign).
 */
import { useEffect, useState } from 'react';
import { CK } from '../../components/cockpit/tokens';
import { CKLabel } from '../../components/cockpit/primitives';
import { useLiveNow } from '../../components/cockpit/useLiveNow';

type Phase = 'idle' | 'authing' | 'ok';

export interface LoginCockpitProps {
  onAuthed?: () => void;
}

export default function LoginCockpit({ onAuthed }: LoginCockpitProps) {
  const [pin, setPin] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [seed] = useState(() => new Date());
  const now = useLiveNow(seed);
  const dateStr = now
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
    })
    .toUpperCase();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  useEffect(() => {
    if (pin.length === 4 && phase === 'idle') {
      setPhase('authing');
      const t = setTimeout(() => {
        setPhase('ok');
        setTimeout(() => onAuthed?.(), 500);
      }, 650);
      return () => clearTimeout(t);
    }
  }, [pin, phase, onAuthed]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '▸'];

  return (
    <div
      className="ck w-full h-full flex flex-col"
      style={{ background: CK.bg, color: CK.text }}
    >
      <div className="h-14 shrink-0" />
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex justify-between items-baseline"
        style={{ borderColor: CK.rule }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 ck-blink"
            style={{ background: CK.amber }}
          />
          <span
            className="text-[10px] tracking-[0.22em]"
            style={{ color: CK.amber }}
          >
            TIMEKEEP · TERM-04
          </span>
        </div>
        <span className="text-[10px] ck-num" style={{ color: CK.dim }}>
          {dateStr} · {timeStr}
        </span>
      </div>

      {/* Hero */}
      <div className="px-4 py-6 border-b" style={{ borderColor: CK.rule }}>
        <CKLabel>CREW CLOCK / OAK-KIT</CKLabel>
        <div
          className="ck-num font-light mt-2 leading-none"
          style={{
            fontFamily: "'IBM Plex Sans Condensed', sans-serif",
            fontSize: 48,
            letterSpacing: '-0.04em',
            color: CK.text,
          }}
        >
          IDENTIFY
        </div>
        <div className="text-[11px] mt-2" style={{ color: CK.dim }}>
          ENTER 4-DIGIT PIN TO BEGIN SHIFT
        </div>
      </div>

      {/* PIN display */}
      <div
        className="px-4 py-6 flex justify-center items-center gap-3 border-b"
        style={{ borderColor: CK.rule }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-12 h-16 border flex items-center justify-center ck-num"
            style={{
              borderColor:
                phase === 'ok'
                  ? CK.ok
                  : pin.length === i
                    ? CK.amber
                    : CK.rule2,
              background: pin[i] ? 'rgba(255,176,0,0.04)' : 'transparent',
              color: phase === 'ok' ? CK.ok : CK.text,
              fontSize: 32,
              fontFamily: "'IBM Plex Sans Condensed', sans-serif",
            }}
          >
            {pin[i] ? '●' : ''}
          </div>
        ))}
      </div>

      {/* Status strip */}
      <div
        className="px-4 py-2 border-b text-[10px] tracking-[0.18em]"
        style={{
          borderColor: CK.rule,
          color:
            phase === 'authing'
              ? CK.amber
              : phase === 'ok'
                ? CK.ok
                : CK.dim,
        }}
      >
        {phase === 'authing'
          ? '◌ VERIFYING...'
          : phase === 'ok'
            ? '● CLEARED / WELCOME BACK M.DELGADO'
            : '· AWAITING INPUT'}
      </div>

      {/* Keypad */}
      <div
        className="flex-1 grid grid-cols-3 gap-px"
        style={{ background: CK.rule }}
      >
        {keys.map((k, i) => (
          <button
            key={i}
            type="button"
            disabled={phase !== 'idle'}
            onClick={() => {
              if (k === '⌫') setPin((p) => p.slice(0, -1));
              else if (k === '▸') {
                /* noop */
              } else if (pin.length < 4) setPin((p) => p + k);
            }}
            className="text-[22px] ck-num active:bg-white/[0.04] transition disabled:opacity-50"
            style={{
              background: CK.bg,
              color: k === '⌫' ? CK.amber : k === '▸' ? CK.dim : CK.text,
              fontFamily: "'IBM Plex Sans Condensed', sans-serif",
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 border-t flex justify-between text-[9px] tracking-[0.2em]"
        style={{ borderColor: CK.rule, color: CK.dim }}
      >
        <span>FW 4.12</span>
        <span>GEOFENCE · OK</span>
        <span>HELP ▸</span>
      </div>
    </div>
  );
}
