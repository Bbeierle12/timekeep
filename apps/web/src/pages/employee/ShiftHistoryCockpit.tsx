/**
 * ShiftHistoryCockpit — week summary + per-day shift records.
 * Ported from `CKShiftHistoryView` in `design/handoff/tk-cockpit-employee-screens.jsx`.
 */
import { CK } from '../../components/cockpit/tokens';
import { SHIFTS, type CKShiftStatus } from '../../components/cockpit/employeeData';

export interface ShiftHistoryCockpitProps {
  onBack?: () => void;
}

const STATUS_MAP: Record<CKShiftStatus, [string, string]> = {
  clean: ['CLEAN', CK.ok],
  short_meal: ['SHORT MEAL', CK.amber],
  violation: ['VIOLATION', CK.alarm],
  off: ['OFF', CK.dim],
  scheduled: ['SCHEDULED', CK.dim],
};

export default function ShiftHistoryCockpit({
  onBack,
}: ShiftHistoryCockpitProps) {
  const totalWorked = SHIFTS.reduce((acc, s) => {
    const m = s.worked.match(/(\d+)h\s+(\d+)m/);
    return acc + (m ? +m[1] * 60 + +m[2] : 0);
  }, 0);
  const totalH = Math.floor(totalWorked / 60);
  const totalM = totalWorked % 60;

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
            SHIFT HISTORY
          </span>
        </div>
        <span
          className="text-[10px] tracking-[0.16em] ck-num"
          style={{ color: CK.dim }}
        >
          WEEK 18
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="grid grid-cols-3 gap-px border-b"
          style={{ background: CK.rule, borderColor: CK.rule }}
        >
          {(
            [
              ['WORKED', `${totalH}H ${String(totalM).padStart(2, '0')}M`, CK.text],
              ['CLEAN', '2/3', CK.ok],
              ['FLAGS', '1', CK.amber],
            ] as const
          ).map(([l, v, c], i) => (
            <div key={i} className="px-3 py-3" style={{ background: CK.bg }}>
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
                  fontSize: 26,
                  letterSpacing: '-0.02em',
                  color: c,
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {SHIFTS.map((s, i) => {
          const [label, color] = STATUS_MAP[s.status];
          const isToday = i === 2;
          return (
            <div
              key={i}
              className="border-b px-3 py-3"
              style={{
                borderColor: CK.rule,
                background: isToday ? 'rgba(255,176,0,0.03)' : 'transparent',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] tracking-[0.2em] ck-num"
                      style={{ color: CK.text }}
                    >
                      {s.date}
                    </span>
                    {isToday && (
                      <span
                        className="text-[9px] tracking-[0.18em] ck-blink"
                        style={{ color: CK.amber }}
                      >
                        ◂ TODAY
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[10px] mt-1"
                    style={{ color: CK.dim }}
                  >
                    {s.status === 'off'
                      ? 'REST DAY'
                      : s.status === 'scheduled'
                        ? `SCHEDULED ${s.in || '—'}`
                        : `${s.in} → ${s.out}`}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-[10px] tracking-[0.16em]"
                    style={{ color }}
                  >
                    {label}
                  </div>
                  {s.worked !== '—' && (
                    <div
                      className="text-[11px] ck-num mt-0.5"
                      style={{ color: CK.text }}
                    >
                      {s.worked}
                    </div>
                  )}
                </div>
              </div>

              {s.meal !== '—' && (
                <div
                  className="mt-2.5 grid grid-cols-2 gap-px"
                  style={{ background: CK.rule }}
                >
                  <div
                    className="px-2 py-1.5"
                    style={{ background: CK.surface }}
                  >
                    <div
                      className="text-[9px] tracking-[0.18em]"
                      style={{ color: CK.dim }}
                    >
                      MEAL
                    </div>
                    <div
                      className="text-[10px] ck-num mt-0.5"
                      style={{
                        color:
                          s.status === 'short_meal'
                            ? CK.amber
                            : s.status === 'violation'
                              ? CK.alarm
                              : CK.text,
                      }}
                    >
                      {s.meal}
                    </div>
                  </div>
                  <div
                    className="px-2 py-1.5"
                    style={{ background: CK.surface }}
                  >
                    <div
                      className="text-[9px] tracking-[0.18em]"
                      style={{ color: CK.dim }}
                    >
                      BREAK
                    </div>
                    <div
                      className="text-[10px] ck-num mt-0.5"
                      style={{ color: CK.text }}
                    >
                      {s.break}
                    </div>
                  </div>
                </div>
              )}

              {s.premium && (
                <div
                  className="mt-2 flex items-center justify-between px-2 py-1.5 border"
                  style={{ borderColor: CK.rule2 }}
                >
                  <span
                    className="text-[10px] tracking-[0.18em]"
                    style={{ color: CK.amber }}
                  >
                    PREMIUM PAY
                  </span>
                  <span
                    className="text-[11px] ck-num"
                    style={{
                      color: s.premium === '$0.00' ? CK.dim : CK.amber,
                    }}
                  >
                    {s.premium}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
