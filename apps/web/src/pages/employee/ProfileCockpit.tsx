/**
 * ProfileCockpit — employee identity, next shift, preference toggles, logout.
 * Ported from `CKProfileView` in `design/handoff/tk-cockpit-employee-screens.jsx`.
 *
 * Avatar prototype used a separate component; we inline a monogram circle.
 */
import { useState } from 'react';
import { CK } from '../../components/cockpit/tokens';
import { CKBtn } from '../../components/cockpit/primitives';
import { fmtShort } from '../../components/cockpit/time';
import { ME } from '../../components/cockpit/employeeData';

export interface ProfileCockpitProps {
  onBack?: () => void;
  onLogout?: () => void;
}

const INITIAL_TOGGLES: Array<[string, boolean]> = [
  ['BREAK REMINDER / PUSH', true],
  ['LUNCH ALARM / VIBRATE', true],
  ['SHIFT PUBLISHED / EMAIL', true],
  ['PAY STUB / PAPER COPY', false],
];

export default function ProfileCockpit({
  onBack,
  onLogout,
}: ProfileCockpitProps) {
  const m = ME;
  const [toggles, setToggles] = useState(INITIAL_TOGGLES);

  const rows: Array<[string, string]> = [
    ['EMPLOYEE ID', m.id],
    ['FULL NAME', m.name.toUpperCase()],
    ['ROLE', m.role.toUpperCase()],
    ['CREW', m.crew.toUpperCase()],
    ['SITE', m.site.toUpperCase()],
    ['HIRE DATE', m.hireDate.toUpperCase()],
    ['PAY RATE', `$${m.payRate.toFixed(2)}/HR`],
    ['PHONE', m.phone],
    ['PIN', '•••• / SET 32D AGO'],
    ['GEOFENCE ZONE', `${m.shiftZone} / 100M`],
  ];

  const initial = m.name.charAt(0).toUpperCase();

  return (
    <div
      className="ck h-full flex flex-col"
      style={{ background: CK.bg }}
    >
      <div
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: CK.rule }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-[10px] tracking-[0.18em] px-2 py-1 border"
            style={{ color: CK.text, borderColor: CK.rule2 }}
          >
            ◂ BACK
          </button>
          <span
            className="text-[10px] tracking-[0.2em]"
            style={{ color: CK.dim }}
          >
            PROFILE
          </span>
        </div>
        <span
          className="text-[10px] tracking-[0.16em] ck-num"
          style={{ color: CK.dim }}
        >
          V4.2.1
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Header block */}
        <div
          className="px-3 py-4 border-b flex items-center gap-3"
          style={{ borderColor: CK.rule2 }}
        >
          <div
            className="flex items-center justify-center border"
            style={{
              width: 52,
              height: 52,
              borderColor: CK.rule2,
              background: CK.surface,
              color: CK.text,
              fontFamily: "'IBM Plex Sans Condensed', sans-serif",
              fontSize: 22,
              letterSpacing: '-0.02em',
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px]" style={{ color: CK.text }}>
              {m.name.toUpperCase()}
            </div>
            <div
              className="text-[10px] tracking-[0.16em] mt-0.5"
              style={{ color: CK.dim }}
            >
              {m.id} · {m.role.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Next shift */}
        <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
          <div
            className="text-[10px] tracking-[0.2em]"
            style={{ color: CK.dim }}
          >
            NEXT SHIFT
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className="ck-num font-light"
              style={{
                fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                fontSize: 22,
                color: CK.text,
              }}
            >
              {m.nextShift.day}
            </span>
            <span className="ck-num text-[12px]" style={{ color: CK.amber }}>
              {fmtShort(m.nextShift.start).toUpperCase()} –{' '}
              {fmtShort(m.nextShift.end).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Field rows */}
        <div className="border-b" style={{ borderColor: CK.rule }}>
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between items-baseline px-3 py-2 border-b"
              style={{ borderColor: CK.rule }}
            >
              <span
                className="text-[10px] tracking-[0.18em]"
                style={{ color: CK.dim }}
              >
                {k}
              </span>
              <span className="text-[11px] ck-num" style={{ color: CK.text }}>
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* Settings toggles */}
        <div className="border-b" style={{ borderColor: CK.rule }}>
          <div
            className="px-3 py-2 text-[9px] tracking-[0.22em]"
            style={{ color: CK.dim }}
          >
            PREFERENCES
          </div>
          {toggles.map(([label, enabled], idx) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                setToggles((prev) =>
                  prev.map((t, i) =>
                    i === idx ? [t[0], !t[1]] : t,
                  ),
                )
              }
              className="w-full flex items-center justify-between px-3 py-2 border-t text-left"
              style={{ borderColor: CK.rule }}
            >
              <span
                className="text-[11px] tracking-[0.1em]"
                style={{ color: CK.text }}
              >
                {label}
              </span>
              <div
                className="w-9 h-5 border flex items-center px-0.5"
                style={{
                  borderColor: enabled ? CK.amber : CK.rule2,
                  justifyContent: enabled ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  className="w-3 h-3"
                  style={{ background: enabled ? CK.amber : CK.dim }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="px-3 py-4">
          <CKBtn
            variant="alarm"
            size="lg"
            className="w-full"
            onClick={onLogout}
          >
            ■ END SESSION / LOGOUT
          </CKBtn>
          <div
            className="text-center text-[9px] tracking-[0.2em] mt-3"
            style={{ color: CK.dim }}
          >
            TIMEKEEP / EMP TERMINAL / v4.2.1
          </div>
        </div>
      </div>
    </div>
  );
}
