/* Cockpit — Additional employee screens: Shift history, Pay, Time-off, Profile. */

// ─────────────────────────────────────────────────────────────
function CKShiftHistoryView({ onBack }) {
  const totalWorked = TK.shifts.reduce((acc, s) => {
    const m = s.worked.match(/(\d+)h\s+(\d+)m/);
    return acc + (m ? (+m[1]*60 + +m[2]) : 0);
  }, 0);
  const totalH = Math.floor(totalWorked / 60), totalM = totalWorked % 60;

  const statusMap = {
    clean:      ["CLEAN",     CK.ok],
    short_meal: ["SHORT MEAL", CK.amber],
    violation:  ["VIOLATION",  CK.alarm],
    off:        ["OFF",        CK.dim],
    scheduled:  ["SCHEDULED",  CK.dim],
  };

  return (
    <div className={cx(ckClass, "h-full flex flex-col")} style={{ background: CK.bg }}>
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-[10px] tracking-[0.18em] px-2 py-1 border" style={{ color: CK.text, borderColor: CK.rule2 }}>◂ BACK</button>
          <span className="text-[10px] tracking-[0.2em]" style={{ color: CK.dim }}>SHIFT HISTORY</span>
        </div>
        <span className="text-[10px] tracking-[0.16em] ck-num" style={{ color: CK.dim }}>WEEK 18</span>
      </div>

      <div className="flex-1 overflow-y-auto ink-scroll">
        <div className="grid grid-cols-3 gap-px border-b" style={{ background: CK.rule, borderColor: CK.rule }}>
          {[
            ["WORKED", `${totalH}H ${String(totalM).padStart(2,"0")}M`, CK.text],
            ["CLEAN",  "2/3",     CK.ok],
            ["FLAGS",  "1",       CK.amber],
          ].map(([l, v, c], i) => (
            <div key={i} className="px-3 py-3" style={{ background: CK.bg }}>
              <div className="text-[9px] tracking-[0.2em]" style={{ color: CK.dim }}>{l}</div>
              <div className="ck-num font-light mt-1" style={{
                fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                fontSize: 26, letterSpacing: "-0.02em", color: c,
              }}>{v}</div>
            </div>
          ))}
        </div>

        {TK.shifts.map((s, i) => {
          const [label, color] = statusMap[s.status];
          const isToday = i === 2;
          return (
            <div key={i} className="border-b px-3 py-3" style={{ borderColor: CK.rule, background: isToday ? "rgba(255,176,0,0.03)" : "transparent" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-[0.2em] ck-num" style={{ color: CK.text }}>{s.date}</span>
                    {isToday && <span className="text-[9px] tracking-[0.18em] ck-blink" style={{ color: CK.amber }}>◂ TODAY</span>}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: CK.dim }}>
                    {s.status === "off" ? "REST DAY" : s.status === "scheduled" ? `SCHEDULED ${s.in || "—"}` : `${s.in} → ${s.out}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] tracking-[0.16em]" style={{ color }}>{label}</div>
                  {s.worked !== "—" && <div className="text-[11px] ck-num mt-0.5" style={{ color: CK.text }}>{s.worked}</div>}
                </div>
              </div>

              {s.meal !== "—" && (
                <div className="mt-2.5 grid grid-cols-2 gap-px" style={{ background: CK.rule }}>
                  <div className="px-2 py-1.5" style={{ background: CK.surface }}>
                    <div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>MEAL</div>
                    <div className="text-[10px] ck-num mt-0.5" style={{ color: s.status === "short_meal" ? CK.amber : s.status === "violation" ? CK.alarm : CK.text }}>{s.meal}</div>
                  </div>
                  <div className="px-2 py-1.5" style={{ background: CK.surface }}>
                    <div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>BREAK</div>
                    <div className="text-[10px] ck-num mt-0.5" style={{ color: CK.text }}>{s.break}</div>
                  </div>
                </div>
              )}

              {s.premium && (
                <div className="mt-2 flex items-center justify-between px-2 py-1.5 border" style={{ borderColor: CK.rule2 }}>
                  <span className="text-[10px] tracking-[0.18em]" style={{ color: CK.amber }}>PREMIUM PAY</span>
                  <span className="text-[11px] ck-num" style={{ color: s.premium === "$0.00" ? CK.dim : CK.amber }}>{s.premium}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
function CKPayView({ onBack, onCertify }) {
  const p = TK.payPeriod;
  return (
    <div className={cx(ckClass, "h-full flex flex-col")} style={{ background: CK.bg }}>
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-[10px] tracking-[0.18em] px-2 py-1 border" style={{ color: CK.text, borderColor: CK.rule2 }}>◂ BACK</button>
          <span className="text-[10px] tracking-[0.2em]" style={{ color: CK.dim }}>EARNINGS</span>
        </div>
        <span className="text-[10px] tracking-[0.16em] ck-num" style={{ color: CK.dim }}>PP {p.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto ink-scroll">
        {/* Hero readout */}
        <div className="px-3 py-4 border-b" style={{ borderColor: CK.rule2 }}>
          <div className="text-[10px] tracking-[0.18em]" style={{ color: CK.dim }}>ESTIMATED GROSS</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[12px] ck-num" style={{ color: CK.dim }}>$</span>
            <span className="ck-num font-light" style={{
              fontFamily: "'IBM Plex Sans Condensed', sans-serif",
              fontSize: 72, letterSpacing: "-0.04em", color: CK.text, lineHeight: 0.9,
            }}>{p.gross.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] tracking-[0.16em]">
            <span style={{ color: CK.dim }}>PAY DATE</span>
            <span className="ck-num" style={{ color: CK.text }}>{p.payDate}</span>
            <span className="w-1 h-1" style={{ background: CK.amber }}/>
            <span style={{ color: CK.dim }}>YTD</span>
            <span className="ck-num" style={{ color: CK.text }}>${p.ytd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Certification CTA */}
        <button onClick={onCertify} className="w-full px-3 py-3 border-b flex items-center justify-between text-left"
          style={{ borderColor: CK.rule2, background: "rgba(255,176,0,0.04)" }}>
          <div>
            <div className="text-[10px] tracking-[0.2em]" style={{ color: CK.amber }}>△ ACTION REQUIRED</div>
            <div className="text-[12px] mt-0.5" style={{ color: CK.text }}>CERTIFY PAY PERIOD / FORM 226-C</div>
          </div>
          <span style={{ color: CK.amber }}>›</span>
        </button>

        {/* Line items */}
        <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
          <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: CK.dim }}>LINE ITEMS</div>
          <div className="grid grid-cols-[50px_1fr_50px_70px_80px] gap-2 text-[9px] tracking-[0.16em] border-b pb-1.5" style={{ borderColor: CK.rule, color: CK.dim }}>
            <span>CODE</span><span>DESCRIPTION</span><span className="text-right">HRS</span><span className="text-right">RATE</span><span className="text-right">AMT</span>
          </div>
          {p.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[50px_1fr_50px_70px_80px] gap-2 py-1.5 border-b text-[10px]" style={{ borderColor: CK.rule }}>
              <span className="ck-num" style={{ color: l.code === "PREM" ? CK.amber : CK.dim }}>{l.code}</span>
              <span style={{ color: CK.text }}>{l.desc.toUpperCase()}</span>
              <span className="text-right ck-num" style={{ color: CK.dim }}>{l.hrs}</span>
              <span className="text-right ck-num" style={{ color: CK.dim }}>{l.rate}</span>
              <span className="text-right ck-num" style={{ color: l.code === "PREM" ? CK.amber : CK.text }}>${l.amt.toFixed(2)}</span>
            </div>
          ))}
          <div className="grid grid-cols-[50px_1fr_50px_70px_80px] gap-2 py-1.5 pt-2 text-[10px]">
            <span/><span className="text-right text-[9px] tracking-[0.2em]" style={{ color: CK.dim, gridColumn: "span 2" }}>GROSS</span><span/><span/><span className="text-right ck-num font-medium" style={{ color: CK.text }}>${p.gross.toFixed(2)}</span>
          </div>
        </div>

        {/* Breakdown viz */}
        <div className="px-3 py-3">
          <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: CK.dim }}>HOURS · BREAKDOWN</div>
          <div className="flex h-4" style={{ background: CK.surface }}>
            <div style={{ width: `${(p.regHours/(p.regHours+p.otHours))*100}%`, background: CK.text }}/>
            <div style={{ width: `${(p.otHours/(p.regHours+p.otHours))*100}%`, background: CK.amber }}/>
          </div>
          <div className="flex justify-between mt-2 text-[10px]">
            <div><span className="inline-block w-2 h-2 mr-1" style={{ background: CK.text }}/><span style={{ color: CK.dim }}>REG </span><span className="ck-num" style={{ color: CK.text }}>{p.regHours}H</span></div>
            <div><span className="inline-block w-2 h-2 mr-1" style={{ background: CK.amber }}/><span style={{ color: CK.dim }}>OT </span><span className="ck-num" style={{ color: CK.amber }}>{p.otHours}H</span></div>
            <div><span className="ck-num" style={{ color: CK.dim }}>Σ {p.regHours + p.otHours}H</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
function CKTimeOffView({ onBack }) {
  const [kind, setKind] = React.useState("vacation");
  const [day, setDay] = React.useState(2);
  const [hours, setHours] = React.useState(8);
  const [note, setNote] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const kinds = [
    ["vacation", "VACATION", TK.timeOffBalances.vacation, CK.amber],
    ["sick",     "SICK",     TK.timeOffBalances.sick,     CK.ok],
    ["personal", "PERSONAL", TK.timeOffBalances.personal, CK.text],
  ];
  const days = ["MON APR 28", "TUE APR 29", "WED APR 30", "THU MAY 01", "FRI MAY 02", "SAT MAY 03", "SUN MAY 04"];
  const currentKind = kinds.find(([k]) => k === kind);

  return (
    <div className={cx(ckClass, "h-full flex flex-col")} style={{ background: CK.bg }}>
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-[10px] tracking-[0.18em] px-2 py-1 border" style={{ color: CK.text, borderColor: CK.rule2 }}>◂ BACK</button>
          <span className="text-[10px] tracking-[0.2em]" style={{ color: CK.dim }}>TIME OFF REQUEST</span>
        </div>
        <span className="text-[10px] tracking-[0.16em] ck-num" style={{ color: CK.dim }}>FORM 318</span>
      </div>

      {submitted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 border-2 flex items-center justify-center" style={{ borderColor: CK.ok }}>
            <span className="text-2xl" style={{ color: CK.ok }}>✓</span>
          </div>
          <div className="mt-4 text-[10px] tracking-[0.22em]" style={{ color: CK.ok }}>● REQUEST QUEUED</div>
          <div className="mt-2 text-[11px] tracking-[0.1em]" style={{ color: CK.text }}>
            MANAGER WILL REVIEW WITHIN 2 BUSINESS DAYS.
          </div>
          <div className="mt-6 px-3 py-2 border text-[10px] tracking-[0.18em] ck-num" style={{ borderColor: CK.rule2, color: CK.dim }}>
            CONFIRM # TOR-{Math.floor(Math.random() * 900000 + 100000)}
          </div>
          <CKBtn className="mt-6" onClick={onBack}>RETURN ▸</CKBtn>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto ink-scroll">
          {/* Balances */}
          <div className="grid grid-cols-3 gap-px border-b" style={{ background: CK.rule, borderColor: CK.rule }}>
            {kinds.map(([k, l, bal, c]) => (
              <div key={k} className="px-3 py-3" style={{ background: CK.bg }}>
                <div className="text-[9px] tracking-[0.2em]" style={{ color: CK.dim }}>{l}</div>
                <div className="ck-num font-light mt-1" style={{
                  fontFamily: "'IBM Plex Sans Condensed', sans-serif",
                  fontSize: 24, letterSpacing: "-0.02em", color: c,
                }}>{bal}H</div>
              </div>
            ))}
          </div>

          {/* Kind selector */}
          <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
            <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: CK.dim }}>TYPE</div>
            <div className="grid grid-cols-3 gap-px" style={{ background: CK.rule }}>
              {kinds.map(([k, l, _, c]) => (
                <button key={k} onClick={() => setKind(k)}
                  className="py-2 text-[10px] tracking-[0.18em]"
                  style={{ background: kind === k ? c : CK.bg, color: kind === k ? CK.bg : CK.dim, fontWeight: kind === k ? 500 : 400 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Day selector */}
          <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
            <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: CK.dim }}>DATE</div>
            <div className="grid grid-cols-7 gap-px" style={{ background: CK.rule }}>
              {days.map((d, i) => {
                const parts = d.split(" ");
                return (
                  <button key={i} onClick={() => setDay(i)}
                    className="py-2 flex flex-col items-center"
                    style={{ background: day === i ? CK.amber : CK.bg, color: day === i ? CK.bg : CK.text }}>
                    <span className="text-[9px] tracking-[0.14em]" style={{ opacity: 0.7 }}>{parts[0]}</span>
                    <span className="ck-num text-[12px] font-medium mt-0.5">{parts[2]}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] ck-num text-center" style={{ color: CK.dim }}>SELECTED: {days[day]}</div>
          </div>

          {/* Hours slider */}
          <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[10px] tracking-[0.2em]" style={{ color: CK.dim }}>HOURS</span>
              <span className="ck-num font-light" style={{ fontFamily: "'IBM Plex Sans Condensed'", fontSize: 28, color: CK.text }}>{hours}H</span>
            </div>
            <div className="flex gap-px" style={{ background: CK.rule }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                <button key={h} onClick={() => setHours(h)}
                  className="flex-1 py-2 text-[10px] ck-num"
                  style={{ background: hours >= h ? (hours === h ? CK.text : "rgba(232,230,223,0.15)") : CK.bg,
                           color: hours === h ? CK.bg : hours > h ? CK.text : CK.dim }}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="px-3 py-3">
            <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: CK.dim }}>NOTE / OPTIONAL</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="REASON, CONTEXT OR REQUEST DETAILS..."
              className="w-full border px-2 py-1.5 text-[11px] resize-none"
              style={{ borderColor: CK.rule2, background: CK.surface, color: CK.text, fontFamily: "'IBM Plex Mono', monospace" }}/>
          </div>
        </div>
      )}

      {!submitted && (
        <div className="border-t" style={{ borderColor: CK.rule2, background: CK.surface }}>
          <div className="grid grid-cols-[1fr_auto] items-center px-3 py-2 text-[10px] tracking-[0.18em]">
            <div>
              <span style={{ color: CK.dim }}>BALANCE AFTER: </span>
              <span className="ck-num" style={{ color: currentKind[3] }}>{currentKind[2] - hours}H</span>
            </div>
            <CKBtn variant="primary" size="lg" onClick={() => setSubmitted(true)}>SUBMIT REQUEST ▸</CKBtn>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
function CKProfileView({ onBack, onLogout }) {
  const m = TK.me;
  const rows = [
    ["EMPLOYEE ID",    m.id],
    ["FULL NAME",      m.name.toUpperCase()],
    ["ROLE",           m.role.toUpperCase()],
    ["CREW",           m.crew.toUpperCase()],
    ["SITE",           m.site.toUpperCase()],
    ["HIRE DATE",      m.hireDate.toUpperCase()],
    ["PAY RATE",       `$${m.payRate.toFixed(2)}/HR`],
    ["PHONE",          m.phone],
    ["PIN",            "•••• / SET 32D AGO"],
    ["GEOFENCE ZONE",  `${m.shiftZone} / 100M`],
  ];

  return (
    <div className={cx(ckClass, "h-full flex flex-col")} style={{ background: CK.bg }}>
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-[10px] tracking-[0.18em] px-2 py-1 border" style={{ color: CK.text, borderColor: CK.rule2 }}>◂ BACK</button>
          <span className="text-[10px] tracking-[0.2em]" style={{ color: CK.dim }}>PROFILE</span>
        </div>
        <span className="text-[10px] tracking-[0.16em] ck-num" style={{ color: CK.dim }}>V4.2.1</span>
      </div>

      <div className="flex-1 overflow-y-auto ink-scroll">
        {/* Header block */}
        <div className="px-3 py-4 border-b flex items-center gap-3" style={{ borderColor: CK.rule2 }}>
          <Avatar name={m.name} size={52} mono/>
          <div className="flex-1 min-w-0">
            <div className="text-[15px]" style={{ color: CK.text }}>{m.name.toUpperCase()}</div>
            <div className="text-[10px] tracking-[0.16em] mt-0.5" style={{ color: CK.dim }}>{m.id} · {m.role.toUpperCase()}</div>
          </div>
        </div>

        {/* Next shift */}
        <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
          <div className="text-[10px] tracking-[0.2em]" style={{ color: CK.dim }}>NEXT SHIFT</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="ck-num font-light" style={{ fontFamily: "'IBM Plex Sans Condensed'", fontSize: 22, color: CK.text }}>
              {m.nextShift.day}
            </span>
            <span className="ck-num text-[12px]" style={{ color: CK.amber }}>
              {TK.fmtShort(m.nextShift.start).toUpperCase()} – {TK.fmtShort(m.nextShift.end).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Field rows */}
        <div className="border-b" style={{ borderColor: CK.rule }}>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between items-baseline px-3 py-2 border-b" style={{ borderColor: CK.rule }}>
              <span className="text-[10px] tracking-[0.18em]" style={{ color: CK.dim }}>{k}</span>
              <span className="text-[11px] ck-num" style={{ color: CK.text }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Settings toggles */}
        <div className="border-b" style={{ borderColor: CK.rule }}>
          <div className="px-3 py-2 text-[9px] tracking-[0.22em]" style={{ color: CK.dim }}>PREFERENCES</div>
          {[
            ["BREAK REMINDER / PUSH",    true],
            ["LUNCH ALARM / VIBRATE",    true],
            ["SHIFT PUBLISHED / EMAIL",  true],
            ["PAY STUB / PAPER COPY",    false],
          ].map(([label, enabled]) => (
            <div key={label} className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: CK.rule }}>
              <span className="text-[11px] tracking-[0.1em]" style={{ color: CK.text }}>{label}</span>
              <div className="w-9 h-5 border flex items-center px-0.5" style={{ borderColor: enabled ? CK.amber : CK.rule2, justifyContent: enabled ? "flex-end" : "flex-start" }}>
                <div className="w-3 h-3" style={{ background: enabled ? CK.amber : CK.dim }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="px-3 py-4">
          <CKBtn variant="alarm" size="lg" className="w-full" onClick={onLogout}>■ END SESSION / LOGOUT</CKBtn>
          <div className="text-center text-[9px] tracking-[0.2em] mt-3" style={{ color: CK.dim }}>TIMEKEEP / EMP TERMINAL / v4.2.1</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function CKLoginView({ onAuthed }) {
  const [pin, setPin] = React.useState("");
  const [phase, setPhase] = React.useState("idle"); // idle | authing | ok
  const now = useLiveNow();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" }).toUpperCase();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  React.useEffect(() => {
    if (pin.length === 4 && phase === "idle") {
      setPhase("authing");
      const t = setTimeout(() => { setPhase("ok"); setTimeout(onAuthed, 500); }, 650);
      return () => clearTimeout(t);
    }
  }, [pin, phase]);

  const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","▸"];

  return (
    <div className={cx(ckClass, "w-full h-full flex flex-col")} style={{ background: CK.bg, color: CK.text }}>
      <div className="h-14 shrink-0"/>
      {/* Header */}
      <div className="px-4 py-3 border-b flex justify-between items-baseline" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 ck-blink" style={{ background: CK.amber }}/>
          <span className="text-[10px] tracking-[0.22em]" style={{ color: CK.amber }}>TIMEKEEP · TERM-04</span>
        </div>
        <span className="text-[10px] ck-num" style={{ color: CK.dim }}>{dateStr} · {timeStr}</span>
      </div>

      {/* Hero */}
      <div className="px-4 py-6 border-b" style={{ borderColor: CK.rule }}>
        <CKLabel>CREW CLOCK / OAK-KIT</CKLabel>
        <div className="ck-num font-light mt-2 leading-none" style={{ fontFamily: "'IBM Plex Sans Condensed'", fontSize: 48, letterSpacing: "-0.04em", color: CK.text }}>
          IDENTIFY
        </div>
        <div className="text-[11px] mt-2" style={{ color: CK.dim }}>ENTER 4-DIGIT PIN TO BEGIN SHIFT</div>
      </div>

      {/* PIN display */}
      <div className="px-4 py-6 flex justify-center items-center gap-3 border-b" style={{ borderColor: CK.rule }}>
        {[0,1,2,3].map(i => (
          <div key={i} className="w-12 h-16 border flex items-center justify-center ck-num"
               style={{
                 borderColor: phase === "ok" ? CK.ok : pin.length === i ? CK.amber : CK.rule2,
                 background: pin[i] ? "rgba(255,176,0,0.04)" : "transparent",
                 color: phase === "ok" ? CK.ok : CK.text,
                 fontSize: 32, fontFamily: "'IBM Plex Sans Condensed'",
               }}>
            {pin[i] ? "●" : ""}
          </div>
        ))}
      </div>

      {/* Status strip */}
      <div className="px-4 py-2 border-b text-[10px] tracking-[0.18em]" style={{ borderColor: CK.rule,
           color: phase === "authing" ? CK.amber : phase === "ok" ? CK.ok : CK.dim }}>
        {phase === "authing" ? "◌ VERIFYING..." : phase === "ok" ? "● CLEARED / WELCOME BACK M.DELGADO" : "· AWAITING INPUT"}
      </div>

      {/* Keypad */}
      <div className="flex-1 grid grid-cols-3 gap-px" style={{ background: CK.rule }}>
        {keys.map((k, i) => (
          <button key={i}
            disabled={phase !== "idle"}
            onClick={() => {
              if (k === "⌫") setPin(p => p.slice(0, -1));
              else if (k === "▸") { /* noop */ }
              else if (pin.length < 4) setPin(p => p + k);
            }}
            className="text-[22px] ck-num active:bg-white/[0.04] transition"
            style={{ background: CK.bg, color: k === "⌫" ? CK.amber : k === "▸" ? CK.dim : CK.text,
                     fontFamily: "'IBM Plex Sans Condensed'" }}>
            {k}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex justify-between text-[9px] tracking-[0.2em]" style={{ borderColor: CK.rule, color: CK.dim }}>
        <span>FW 4.12</span>
        <span>GEOFENCE · OK</span>
        <span>HELP ▸</span>
      </div>
    </div>
  );
}

Object.assign(window, { CKLoginView, CKShiftHistoryView, CKPayView, CKTimeOffView, CKProfileView });
