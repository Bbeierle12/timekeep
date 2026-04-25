/* Cockpit — Employee modals. Full-bleed cockpit-styled sheets.
   No rounded corners. Terminal feel. */

function CKSheet({ open, onClose, title, footer, tone = "text", children }) {
  if (!open) return null;
  const c = tone === "alarm" ? CK.alarm : tone === "amber" ? CK.amber : CK.text;
  return (
    <div className={cx(ckClass, "absolute inset-0 z-50 flex items-end fade-in")}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.78)" }} onClick={onClose}/>
      <div className="relative w-full slide-up flex flex-col max-h-[94%] border-t-2"
           style={{ background: CK.bg, borderTopColor: c }}>
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: CK.rule }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5" style={{ background: c }}/>
            <span className="text-[10px] tracking-[0.2em]" style={{ color: c }}>{title.toUpperCase()}</span>
          </div>
          <button onClick={onClose} className="text-[10px] tracking-[0.18em] px-2 py-1 border" style={{ color: CK.dim, borderColor: CK.rule2 }}>CLOSE ✕</button>
        </div>
        <div className="flex-1 overflow-y-auto ink-scroll">{children}</div>
        {footer && <div className="border-t" style={{ borderColor: CK.rule2, background: CK.surface }}>{footer}</div>}
      </div>
    </div>
  );
}

function CKKV({ k, v, tone = "text" }) {
  const c = { text: CK.text, amber: CK.amber, alarm: CK.alarm, ok: CK.ok, dim: CK.dim }[tone];
  return (
    <div className="flex justify-between items-baseline px-3 py-2 border-b" style={{ borderColor: CK.rule }}>
      <span className="text-[10px] tracking-[0.16em]" style={{ color: CK.dim }}>{k}</span>
      <span className="text-[11px] ck-num" style={{ color: c }}>{v}</span>
    </div>
  );
}

function LunchWarningSheet({ open, scenario, onClose, onTakeLunch, onWaive }) {
  const w = scenario?.warning;
  if (!open || !w) return null;
  const urgent = w.stage === "stage3";
  const deadline = new Date(scenario.entries[0].at.getTime() + 5*3600*1000);
  return (
    <CKSheet open={open} onClose={onClose}
      title={urgent ? "▲ ALARM / MEAL OVERDUE" : "△ ADVISORY / MEAL DUE"}
      tone={urgent ? "alarm" : "amber"}
      footer={
        <div className="grid grid-cols-2 gap-px" style={{ background: CK.rule }}>
          <CKBtn size="lg" onClick={onWaive} className="w-full" variant="ghost">SIGN 226-W WAIVER</CKBtn>
          <CKBtn size="lg" onClick={onTakeLunch} variant={urgent ? "alarm" : "primary"} className="w-full">BEGIN MEAL NOW</CKBtn>
        </div>
      }>
      <div className="px-3 py-4">
        <div className="text-[10px] tracking-[0.2em]" style={{ color: CK.dim }}>STATUS</div>
        <div className="ck-num font-light mt-1 leading-none" style={{
          fontFamily: "'IBM Plex Sans Condensed', sans-serif",
          fontSize: 72, letterSpacing: "-0.04em",
          color: urgent ? CK.alarm : CK.amber,
        }}>
          {urgent ? `+${Math.abs(w.minutesLeft).toString().padStart(2,"0")}M` : `T-${w.minutesLeft.toString().padStart(2,"0")}M`}
        </div>
        <div className="text-[11px] mt-2 uppercase" style={{ color: CK.text, letterSpacing: "0.06em" }}>
          {urgent ? "MEAL DEADLINE PASSED — ACTION REQUIRED" : "MEAL DUE SOON"}
        </div>
      </div>

      <div className="border-t border-b" style={{ borderColor: CK.rule2, background: CK.surface }}>
        <CKKV k="CLOCK IN"     v={TK.fmtShort(scenario.entries[0].at).toUpperCase()}/>
        <CKKV k="DEADLINE"      v={TK.fmtShort(deadline).toUpperCase()} tone={urgent ? "alarm" : "amber"}/>
        <CKKV k="RULE"          v="CA IWC §11 / 5H"/>
        <CKKV k="IF MISSED"     v="1H PREMIUM PAY OWED" tone="alarm"/>
      </div>

      <div className="px-3 py-3 text-[10px] leading-relaxed" style={{ color: CK.dim }}>
        CA LABOR CODE §512 REQUIRES A 30-MIN UNPAID MEAL PERIOD BEFORE THE END OF THE 5TH HOUR. WAIVER
        PERMITTED ONLY IF TOTAL SHIFT DOES NOT EXCEED 6 HOURS.
      </div>
    </CKSheet>
  );
}

function BreakAckSheet({ open, breakNum, onClose, onConfirm }) {
  const [choice, setChoice] = React.useState("taken");
  if (!open) return null;
  const opts = [
    ["taken",   "TOOK BREAK", "FULL 10M / UNINTERRUPTED"],
    ["short",   "INTERRUPTED","NOTIFIES MANAGER"],
    ["skipped", "VOLUNTARY SKIP", "MAY TAKE LATER OR NOT AT ALL"],
  ];
  return (
    <CKSheet open={open} onClose={onClose} title={`REST BREAK ${breakNum} / ACK`}
      footer={<CKBtn variant="primary" size="lg" className="w-full" onClick={onConfirm}>CONFIRM ▸</CKBtn>}>
      <div className="px-3 py-4">
        <div className="text-[10px] tracking-[0.18em]" style={{ color: CK.dim }}>RECORD</div>
        <div className="text-[13px] mt-1" style={{ color: CK.text }}>
          Paid 10-minute rest break. Required for 4h or major fraction thereof.
        </div>
      </div>
      <div>
        {opts.map(([k, t, s]) => (
          <button key={k} onClick={() => setChoice(k)}
            className="w-full text-left px-3 py-3 border-b flex items-center gap-3"
            style={{ borderColor: CK.rule, background: choice === k ? "rgba(255,176,0,0.06)" : "transparent" }}>
            <span className="w-4 h-4 flex items-center justify-center border" style={{ borderColor: choice === k ? CK.amber : CK.rule2 }}>
              {choice === k && <span className="w-2 h-2" style={{ background: CK.amber }}/>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] tracking-[0.18em]" style={{ color: CK.text }}>{t}</div>
              <div className="text-[10px] mt-0.5" style={{ color: CK.dim }}>{s}</div>
            </div>
          </button>
        ))}
      </div>
    </CKSheet>
  );
}

function WaiverSheet({ open, onClose, onSign }) {
  const [signed, setSigned] = React.useState(false);
  React.useEffect(() => { if (!open) setSigned(false); }, [open]);
  if (!open) return null;
  return (
    <CKSheet open={open} onClose={onClose} title="FORM 226-W / MEAL WAIVER"
      footer={<CKBtn variant="primary" size="lg" disabled={!signed} onClick={onSign} className="w-full">SIGN & SUBMIT ▸</CKBtn>}>
      <div className="px-3 py-4 text-[11px] leading-relaxed" style={{ color: CK.text }}>
        I VOLUNTARILY WAIVE MY FIRST MEAL PERIOD TODAY. MY TOTAL SHIFT WILL NOT EXCEED SIX (6) HOURS.
        I UNDERSTAND I MAY REVOKE THIS WAIVER AT ANY TIME BEFORE THE DEADLINE.
      </div>
      <div className="border-t border-b" style={{ borderColor: CK.rule2, background: CK.surface }}>
        <CKKV k="EMPLOYEE" v="DELGADO, M. / EMP-2418"/>
        <CKKV k="DATE"     v={new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase()}/>
        <CKKV k="WAIVER"   v="FIRST MEAL"/>
        <CKKV k="VALID IF" v="SHIFT ≤ 6H"/>
      </div>
      <div className="px-3 py-4">
        <div className="text-[9px] tracking-[0.2em]" style={{ color: CK.dim }}>E-SIGNATURE ▼</div>
        <button onClick={() => setSigned(true)}
          className="w-full h-28 mt-2 border flex items-center justify-center"
          style={{ borderColor: signed ? CK.ok : CK.rule2,
                   background: signed ? "rgba(105,210,124,0.06)" : CK.surface,
                   borderStyle: signed ? "solid" : "dashed" }}>
          {signed ? (
            <div className="text-[11px] tracking-[0.18em]" style={{ color: CK.ok }}>● SIGNATURE CAPTURED / 13:47:58</div>
          ) : (
            <svg width="220" height="50" viewBox="0 0 220 50" style={{ color: CK.dim, opacity: 0.6 }}>
              <path d="M10 40 Q 25 10, 45 30 T 85 30 T 125 35 T 170 22 T 210 32" stroke="currentColor" fill="none" strokeWidth="1.5"/>
              <text x="110" y="12" fill="currentColor" fontSize="8" textAnchor="middle" letterSpacing="3" fontFamily="IBM Plex Mono">TAP TO SIGN</text>
            </svg>
          )}
        </button>
      </div>
    </CKSheet>
  );
}

function AttestationSheet({ open, onClose, onSubmit }) {
  const [opt, setOpt] = React.useState(null);
  React.useEffect(() => { if (!open) setOpt(null); }, [open]);
  if (!open) return null;
  const opts = [
    ["accurate", "RECORDS ARE ACCURATE", "NO CORRECTIONS NEEDED"],
    ["missed",   "MISSED MEAL OR REST",   "REASON SELECTION FOLLOWS"],
    ["correction","NEED A CORRECTION",    "OPEN CORRECTION REQUEST"],
  ];
  return (
    <CKSheet open={open} onClose={onClose} title="FORM 226-C / PAY PERIOD CERTIFICATION"
      footer={<CKBtn variant="primary" size="lg" disabled={!opt} onClick={onSubmit} className="w-full">SUBMIT CERTIFICATION ▸</CKBtn>}>
      <div className="px-3 py-4">
        <div className="text-[10px] tracking-[0.18em]" style={{ color: CK.dim }}>PAY PERIOD ENDING</div>
        <div className="ck-num font-light mt-1" style={{
          fontFamily: "'IBM Plex Sans Condensed', sans-serif",
          fontSize: 40, letterSpacing: "-0.02em", color: CK.text,
        }}>APR 27, 2026</div>
      </div>
      <div>
        {opts.map(([k, t, s]) => (
          <button key={k} onClick={() => setOpt(k)}
            className="w-full text-left px-3 py-3 border-b flex items-center gap-3"
            style={{ borderColor: CK.rule, background: opt === k ? "rgba(255,176,0,0.06)" : "transparent" }}>
            <span className="w-4 h-4 flex items-center justify-center border" style={{ borderColor: opt === k ? CK.amber : CK.rule2 }}>
              {opt === k && <span className="w-2 h-2" style={{ background: CK.amber }}/>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] tracking-[0.18em]" style={{ color: CK.text }}>{t}</div>
              <div className="text-[10px] mt-0.5" style={{ color: CK.dim }}>{s}</div>
            </div>
          </button>
        ))}
      </div>
    </CKSheet>
  );
}

Object.assign(window, { CKSheet, CKKV, LunchWarningSheet, BreakAckSheet, WaiverSheet, AttestationSheet });
