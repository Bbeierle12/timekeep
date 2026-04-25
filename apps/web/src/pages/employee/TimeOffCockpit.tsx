/**
 * TimeOffCockpit — request form (kind, date, hours, note) with submit confirmation.
 * Ported from `CKTimeOffView` in `design/handoff/tk-cockpit-employee-screens.jsx`.
 */
import { useState } from 'react';
import { CK } from '../../components/cockpit/tokens';
import { CKBtn } from '../../components/cockpit/primitives';
import { TIME_OFF_BALANCES } from '../../components/cockpit/employeeData';

export interface TimeOffCockpitProps {
  onBack?: () => void;
}

type Kind = 'vacation' | 'sick' | 'personal';

const KINDS: Array<[Kind, string, number, string]> = [
  ['vacation', 'VACATION', TIME_OFF_BALANCES.vacation, CK.amber],
  ['sick', 'SICK', TIME_OFF_BALANCES.sick, CK.ok],
  ['personal', 'PERSONAL', TIME_OFF_BALANCES.personal, CK.text],
];

const DAYS = [
  'MON APR 28',
  'TUE APR 29',
  'WED APR 30',
  'THU MAY 01',
  'FRI MAY 02',
  'SAT MAY 03',
  'SUN MAY 04',
];

export default function TimeOffCockpit({ onBack }: TimeOffCockpitProps) {
  const [kind, setKind] = useState<Kind>('vacation');
  const [day, setDay] = useState(2);
  const [hours, setHours] = useState(8);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const currentKind = KINDS.find(([k]) => k === kind)!;
  const currentBalance = currentKind[2];
  const currentColor = currentKind[3];

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
            TIME OFF REQUEST
          </span>
        </div>
        <span
          className="text-[10px] tracking-[0.16em] ck-num"
          style={{ color: CK.dim }}
        >
          FORM 318
        </span>
      </div>

      {submitted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div
            className="w-16 h-16 border-2 flex items-center justify-center"
            style={{ borderColor: CK.ok }}
          >
            <span className="text-2xl" style={{ color: CK.ok }}>
              ✓
            </span>
          </div>
          <div
            className="mt-4 text-[10px] tracking-[0.22em]"
            style={{ color: CK.ok }}
          >
            ● REQUEST QUEUED
          </div>
          <div
            className="mt-2 text-[11px] tracking-[0.1em]"
            style={{ color: CK.text }}
          >
            MANAGER WILL REVIEW WITHIN 2 BUSINESS DAYS.
          </div>
          <div
            className="mt-6 px-3 py-2 border text-[10px] tracking-[0.18em] ck-num"
            style={{ borderColor: CK.rule2, color: CK.dim }}
          >
            CONFIRM # TOR-{Math.floor(Math.random() * 900000 + 100000)}
          </div>
          <CKBtn className="mt-6" onClick={onBack}>
            RETURN ▸
          </CKBtn>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Balances */}
          <div
            className="grid grid-cols-3 gap-px border-b"
            style={{ background: CK.rule, borderColor: CK.rule }}
          >
            {KINDS.map(([k, l, bal, c]) => (
              <div key={k} className="px-3 py-3" style={{ background: CK.bg }}>
                <div
                  className="text-[9px] tracking-[0.2em]"
                  style={{ color: CK.dim }}
                >
                  {l}
                </div>
                <div
                  className="ck-num font-light mt-1"
                  style={{
                    fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                    fontSize: 24,
                    letterSpacing: '-0.02em',
                    color: c,
                  }}
                >
                  {bal}H
                </div>
              </div>
            ))}
          </div>

          {/* Kind selector */}
          <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
            <div
              className="text-[10px] tracking-[0.2em] mb-2"
              style={{ color: CK.dim }}
            >
              TYPE
            </div>
            <div
              className="grid grid-cols-3 gap-px"
              style={{ background: CK.rule }}
            >
              {KINDS.map(([k, l, , c]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className="py-2 text-[10px] tracking-[0.18em]"
                  style={{
                    background: kind === k ? c : CK.bg,
                    color: kind === k ? CK.bg : CK.dim,
                    fontWeight: kind === k ? 500 : 400,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Day selector */}
          <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
            <div
              className="text-[10px] tracking-[0.2em] mb-2"
              style={{ color: CK.dim }}
            >
              DATE
            </div>
            <div
              className="grid grid-cols-7 gap-px"
              style={{ background: CK.rule }}
            >
              {DAYS.map((d, i) => {
                const parts = d.split(' ');
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDay(i)}
                    className="py-2 flex flex-col items-center"
                    style={{
                      background: day === i ? CK.amber : CK.bg,
                      color: day === i ? CK.bg : CK.text,
                    }}
                  >
                    <span
                      className="text-[9px] tracking-[0.14em]"
                      style={{ opacity: 0.7 }}
                    >
                      {parts[0]}
                    </span>
                    <span className="ck-num text-[12px] font-medium mt-0.5">
                      {parts[2]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className="mt-2 text-[10px] ck-num text-center"
              style={{ color: CK.dim }}
            >
              SELECTED: {DAYS[day]}
            </div>
          </div>

          {/* Hours slider */}
          <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
            <div className="flex justify-between items-baseline mb-2">
              <span
                className="text-[10px] tracking-[0.2em]"
                style={{ color: CK.dim }}
              >
                HOURS
              </span>
              <span
                className="ck-num font-light"
                style={{
                  fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                  fontSize: 28,
                  color: CK.text,
                }}
              >
                {hours}H
              </span>
            </div>
            <div className="flex gap-px" style={{ background: CK.rule }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(h)}
                  className="flex-1 py-2 text-[10px] ck-num"
                  style={{
                    background:
                      hours >= h
                        ? hours === h
                          ? CK.text
                          : 'rgba(232,230,223,0.15)'
                        : CK.bg,
                    color:
                      hours === h ? CK.bg : hours > h ? CK.text : CK.dim,
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="px-3 py-3">
            <div
              className="text-[10px] tracking-[0.2em] mb-2"
              style={{ color: CK.dim }}
            >
              NOTE / OPTIONAL
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="REASON, CONTEXT OR REQUEST DETAILS..."
              className="w-full border px-2 py-1.5 text-[11px] resize-none"
              style={{
                borderColor: CK.rule2,
                background: CK.surface,
                color: CK.text,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            />
          </div>
        </div>
      )}

      {!submitted && (
        <div
          className="border-t"
          style={{ borderColor: CK.rule2, background: CK.surface }}
        >
          <div className="grid grid-cols-[1fr_auto] items-center px-3 py-2 text-[10px] tracking-[0.18em]">
            <div>
              <span style={{ color: CK.dim }}>BALANCE AFTER: </span>
              <span className="ck-num" style={{ color: currentColor }}>
                {currentBalance - hours}H
              </span>
            </div>
            <CKBtn
              variant="primary"
              size="lg"
              onClick={() => setSubmitted(true)}
            >
              SUBMIT REQUEST ▸
            </CKBtn>
          </div>
        </div>
      )}
    </div>
  );
}
