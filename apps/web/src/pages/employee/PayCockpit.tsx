/**
 * PayCockpit — current pay period earnings view with line items + breakdown.
 * Ported from `CKPayView` in `design/handoff/tk-cockpit-employee-screens.jsx`.
 */
import { CK } from '../../components/cockpit/tokens';
import { PAY_PERIOD } from '../../components/cockpit/employeeData';

export interface PayCockpitProps {
  onBack?: () => void;
  onCertify?: () => void;
}

export default function PayCockpit({ onBack, onCertify }: PayCockpitProps) {
  const p = PAY_PERIOD;
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
            EARNINGS
          </span>
        </div>
        <span
          className="text-[10px] tracking-[0.16em] ck-num"
          style={{ color: CK.dim }}
        >
          PP {p.label}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero readout */}
        <div className="px-3 py-4 border-b" style={{ borderColor: CK.rule2 }}>
          <div
            className="text-[10px] tracking-[0.18em]"
            style={{ color: CK.dim }}
          >
            ESTIMATED GROSS
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[12px] ck-num" style={{ color: CK.dim }}>
              $
            </span>
            <span
              className="ck-num font-light"
              style={{
                fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                fontSize: 72,
                letterSpacing: '-0.04em',
                color: CK.text,
                lineHeight: 0.9,
              }}
            >
              {p.gross.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] tracking-[0.16em]">
            <span style={{ color: CK.dim }}>PAY DATE</span>
            <span className="ck-num" style={{ color: CK.text }}>
              {p.payDate}
            </span>
            <span className="w-1 h-1" style={{ background: CK.amber }} />
            <span style={{ color: CK.dim }}>YTD</span>
            <span className="ck-num" style={{ color: CK.text }}>
              ${p.ytd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Certification CTA */}
        <button
          type="button"
          onClick={onCertify}
          className="w-full px-3 py-3 border-b flex items-center justify-between text-left"
          style={{
            borderColor: CK.rule2,
            background: 'rgba(255,176,0,0.04)',
          }}
        >
          <div>
            <div
              className="text-[10px] tracking-[0.2em]"
              style={{ color: CK.amber }}
            >
              △ ACTION REQUIRED
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: CK.text }}>
              CERTIFY PAY PERIOD / FORM 226-C
            </div>
          </div>
          <span style={{ color: CK.amber }}>›</span>
        </button>

        {/* Line items */}
        <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
          <div
            className="text-[10px] tracking-[0.2em] mb-2"
            style={{ color: CK.dim }}
          >
            LINE ITEMS
          </div>
          <div
            className="grid grid-cols-[50px_1fr_50px_70px_80px] gap-2 text-[9px] tracking-[0.16em] border-b pb-1.5"
            style={{ borderColor: CK.rule, color: CK.dim }}
          >
            <span>CODE</span>
            <span>DESCRIPTION</span>
            <span className="text-right">HRS</span>
            <span className="text-right">RATE</span>
            <span className="text-right">AMT</span>
          </div>
          {p.lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[50px_1fr_50px_70px_80px] gap-2 py-1.5 border-b text-[10px]"
              style={{ borderColor: CK.rule }}
            >
              <span
                className="ck-num"
                style={{ color: l.code === 'PREM' ? CK.amber : CK.dim }}
              >
                {l.code}
              </span>
              <span style={{ color: CK.text }}>{l.desc.toUpperCase()}</span>
              <span className="text-right ck-num" style={{ color: CK.dim }}>
                {l.hrs}
              </span>
              <span className="text-right ck-num" style={{ color: CK.dim }}>
                {l.rate}
              </span>
              <span
                className="text-right ck-num"
                style={{ color: l.code === 'PREM' ? CK.amber : CK.text }}
              >
                ${l.amt.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[50px_1fr_50px_70px_80px] gap-2 py-1.5 pt-2 text-[10px]">
            <span />
            <span
              className="text-right text-[9px] tracking-[0.2em]"
              style={{ color: CK.dim, gridColumn: 'span 2' }}
            >
              GROSS
            </span>
            <span />
            <span />
            <span
              className="text-right ck-num font-medium"
              style={{ color: CK.text }}
            >
              ${p.gross.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Breakdown viz */}
        <div className="px-3 py-3">
          <div
            className="text-[10px] tracking-[0.2em] mb-2"
            style={{ color: CK.dim }}
          >
            HOURS · BREAKDOWN
          </div>
          <div className="flex h-4" style={{ background: CK.surface }}>
            <div
              style={{
                width: `${(p.regHours / (p.regHours + p.otHours)) * 100}%`,
                background: CK.text,
              }}
            />
            <div
              style={{
                width: `${(p.otHours / (p.regHours + p.otHours)) * 100}%`,
                background: CK.amber,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px]">
            <div>
              <span
                className="inline-block w-2 h-2 mr-1"
                style={{ background: CK.text }}
              />
              <span style={{ color: CK.dim }}>REG </span>
              <span className="ck-num" style={{ color: CK.text }}>
                {p.regHours}H
              </span>
            </div>
            <div>
              <span
                className="inline-block w-2 h-2 mr-1"
                style={{ background: CK.amber }}
              />
              <span style={{ color: CK.dim }}>OT </span>
              <span className="ck-num" style={{ color: CK.amber }}>
                {p.otHours}H
              </span>
            </div>
            <div>
              <span className="ck-num" style={{ color: CK.dim }}>
                Σ {p.regHours + p.otHours}H
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
