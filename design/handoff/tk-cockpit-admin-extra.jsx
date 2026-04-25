/* Cockpit — Additional admin panes: Employee detail, Schedule, Payroll, Audit, Settings, Resolution. */

// ─────────────────────────────────────────────────────────────
// Employee detail — drilldown for one person.
function CKAdminEmployeeDetail({ empId = "e01", onBack }) {
  const e = TK.team.find(t => t.id === empId) || TK.team[0];
  const stateMap = {
    working: ["ON DUTY", CK.ok], lunch: ["MEAL", CK.amber], break: ["BREAK", CK.text],
    off: ["OFF", CK.dim], clocked_out: ["OUT", CK.dim],
  };
  const [stateLbl, stateColor] = stateMap[e.state] || ["—", CK.dim];

  return (
    <div className="space-y-3">
      {/* Header card */}
      <div className="border" style={{ borderColor: CK.rule, background: CK.surface }}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-[10px] tracking-[0.18em] px-2 py-1 border" style={{ color: CK.text, borderColor: CK.rule2 }}>◂ ROSTER</button>
            <CKLabel>EMPLOYEE FILE / {e.id.toUpperCase()}</CKLabel>
          </div>
          <div className="flex gap-1">
            <CKBtn size="sm" variant="quiet">MESSAGE</CKBtn>
            <CKBtn size="sm" variant="quiet">EDIT</CKBtn>
            <CKBtn size="sm">EXPORT FILE</CKBtn>
          </div>
        </div>
        <div className="grid grid-cols-[120px_1fr_320px] gap-px" style={{ background: CK.rule }}>
          <div className="px-4 py-5 flex flex-col items-center justify-center" style={{ background: CK.bg }}>
            <Avatar name={e.name} size={68} mono/>
            <div className="text-[9px] tracking-[0.2em] mt-2" style={{ color: stateColor }}>● {stateLbl}</div>
          </div>
          <div className="px-4 py-4" style={{ background: CK.bg }}>
            <div className="text-[10px] tracking-[0.2em]" style={{ color: CK.dim }}>FULL NAME</div>
            <div className="ck-num font-light mt-0.5" style={{ fontFamily: "'IBM Plex Sans Condensed'", fontSize: 28, color: CK.text, letterSpacing: "-0.02em" }}>{e.name.toUpperCase()}</div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-[11px]">
              <div><div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>ROLE</div><div style={{ color: CK.text }}>{e.role.toUpperCase()}</div></div>
              <div><div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>CREW</div><div style={{ color: CK.text }}>{e.crew.toUpperCase()}</div></div>
              <div><div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>SHIFT IN</div><div className="ck-num" style={{ color: CK.text }}>{e.in ? TK.fmtShort(e.in).toUpperCase() : "—"}</div></div>
              <div><div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>ELAPSED</div><div className="ck-num" style={{ color: CK.text }}>{e.elapsed.toUpperCase()}</div></div>
              <div><div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>RISK</div><div style={{ color: e.risk === "high" ? CK.alarm : e.risk === "medium" ? CK.amber : CK.ok }}>{e.risk.toUpperCase()}</div></div>
              <div><div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>HIRE</div><div className="ck-num" style={{ color: CK.text }}>NOV 14, 2022</div></div>
            </div>
          </div>
          <div className="px-4 py-4" style={{ background: CK.bg }}>
            <CKLabel>RISK FACTORS</CKLabel>
            {e.flags.length === 0 ? (
              <div className="mt-2 text-[11px]" style={{ color: CK.ok }}>● ALL CLEAR / NO FLAGS</div>
            ) : (
              <div className="mt-2 space-y-1">
                {e.flags.map((f, i) => (
                  <div key={i} className="flex gap-2 text-[10px]">
                    <span style={{ color: CK.alarm }}>▲</span>
                    <span style={{ color: CK.text }}>{f.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-px text-center" style={{ background: CK.rule }}>
              {[["YTD HRS","312"],["PREMS","2"],["WAIVERS","1"]].map(([l,v],i) => (
                <div key={i} className="px-2 py-2" style={{ background: CK.bg }}>
                  <div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>{l}</div>
                  <div className="ck-num text-[18px]" style={{ color: CK.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Today's timeline */}
      <CKPanel label="TODAY · TIMELINE" value="0H — 8H">
        <div className="px-4 py-4">
          <CKMealScale clockIn={e.in} now={new Date()} lunchStart={e.lunch?.start} lunchEnd={e.lunch?.end} orientation="horizontal"/>
        </div>
        <div className="border-t grid grid-cols-4 gap-px" style={{ borderColor: CK.rule, background: CK.rule }}>
          {[
            ["CLOCK IN", e.in ? TK.fmtShort(e.in).toUpperCase() : "—", CK.ok],
            ["BREAK 1", e.break1 ? TK.fmtShort(e.break1).toUpperCase() : "—", e.break1 ? CK.text : CK.dim],
            ["MEAL", e.lunch?.start ? TK.fmtShort(e.lunch.start).toUpperCase() : "—", e.lunch?.start ? CK.amber : CK.dim],
            ["MEAL END", e.lunch?.end ? TK.fmtShort(e.lunch.end).toUpperCase() : "—", e.lunch?.end ? CK.amber : CK.dim],
          ].map(([l,v,c],i) => (
            <div key={i} className="px-3 py-2" style={{ background: CK.bg }}>
              <div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>{l}</div>
              <div className="ck-num text-[14px] mt-0.5" style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </CKPanel>

      {/* Compliance record + week worked */}
      <div className="grid grid-cols-2 gap-3">
        <CKPanel label="COMPLIANCE / 30D">
          <div className="p-3">
            <div className="grid grid-cols-30 gap-px" style={{ gridTemplateColumns: "repeat(30, 1fr)" }}>
              {Array.from({ length: 30 }).map((_, i) => {
                const r = (i * 7919 % 100);
                const tone = r < 5 ? CK.alarm : r < 12 ? CK.amber : CK.ok;
                return <div key={i} className="h-5" style={{ background: tone, opacity: 0.55 }}/>;
              })}
            </div>
            <div className="flex justify-between mt-2 text-[9px] ck-num" style={{ color: CK.dim }}>
              <span>30D AGO</span><span>TODAY</span>
            </div>
            <div className="grid grid-cols-3 gap-px mt-3" style={{ background: CK.rule }}>
              {[["CLEAN","26",CK.ok],["FLAGS","3",CK.amber],["VIOLS","1",CK.alarm]].map(([l,v,c],i) => (
                <div key={i} className="px-2 py-2 text-center" style={{ background: CK.bg }}>
                  <div className="text-[9px] tracking-[0.16em]" style={{ color: CK.dim }}>{l}</div>
                  <div className="ck-num text-[18px]" style={{ color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </CKPanel>

        <CKPanel label="VIOLATIONS / 90D">
          <div>
            {TK.violations.filter(v => v.emp === e.name).map((v, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr_70px] gap-2 px-3 py-2 border-b text-[10px]" style={{ borderColor: CK.rule }}>
                <span className="ck-num" style={{ color: CK.dim }}>{v.date.toUpperCase()}</span>
                <div>
                  <div className="text-[10px] tracking-[0.14em]" style={{ color: v.severity === "high" ? CK.alarm : CK.amber }}>{v.type.toUpperCase()}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: CK.dim }}>{v.desc}</div>
                </div>
                <span className="text-right ck-num" style={{ color: v.resolved ? CK.dim : CK.alarm }}>{v.resolved ? "RES" : v.premium}</span>
              </div>
            ))}
            {TK.violations.filter(v => v.emp === e.name).length === 0 && (
              <div className="px-3 py-6 text-center text-[10px] tracking-[0.18em]" style={{ color: CK.ok }}>
                ● NO VIOLATIONS ON RECORD
              </div>
            )}
          </div>
        </CKPanel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Violation resolution — wizard pane.
function CKAdminResolutionFlow({ violation, onClose }) {
  const v = violation || TK.violations.find(x => !x.resolved);
  const [step, setStep] = React.useState(1);
  const [decision, setDecision] = React.useState("pay");
  const [note, setNote] = React.useState("");

  if (!v) return null;
  const decisions = [
    ["pay",     "PAY PREMIUM",       `1H @ REGULAR · ${v.premium}`, CK.amber],
    ["waiver",  "WAIVER ON FILE",    "EMPLOYEE SIGNED 226-W",        CK.text],
    ["dispute", "DISPUTE / CORRECT", "OPEN INVESTIGATION",            CK.alarm],
  ];

  return (
    <div className="absolute inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="m-auto border w-[640px] max-h-[88vh] overflow-y-auto ink-scroll fade-in" style={{ borderColor: CK.alarm, background: CK.bg }}>
        <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: CK.rule2 }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 ck-blink" style={{ background: CK.alarm }}/>
            <span className="text-[10px] tracking-[0.22em]" style={{ color: CK.alarm }}>▲ VIOLATION RESOLUTION / V-{v.id.slice(1).toUpperCase()}</span>
          </div>
          <button onClick={onClose} className="text-[10px] tracking-[0.18em] px-2 py-1 border" style={{ color: CK.dim, borderColor: CK.rule2 }}>CANCEL ✕</button>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-3 gap-px border-b" style={{ background: CK.rule, borderColor: CK.rule }}>
          {["1 REVIEW","2 DECIDE","3 SIGN-OFF"].map((s, i) => (
            <div key={s} className="px-3 py-2" style={{ background: CK.bg }}>
              <div className="text-[9px] tracking-[0.2em]" style={{ color: step === i+1 ? CK.amber : step > i+1 ? CK.ok : CK.dim }}>
                {step > i+1 ? "● " : ""}{s}
              </div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="px-4 py-4 border-b" style={{ borderColor: CK.rule }}>
              <CKLabel>INCIDENT</CKLabel>
              <div className="text-[18px] mt-1" style={{ color: CK.text }}>{v.type.toUpperCase()}</div>
              <div className="text-[11px] mt-2" style={{ color: CK.dim }}>{v.desc}</div>
            </div>
            <div>
              {[
                ["EMPLOYEE", v.emp.toUpperCase()],
                ["DATE", v.date.toUpperCase()],
                ["SEVERITY", v.severity.toUpperCase(), v.severity === "high" ? CK.alarm : CK.amber],
                ["RULE", "CA IWC §11 / MEAL PERIOD"],
                ["EVIDENCE", "NO LUNCH ENTRY / NO WAIVER"],
                ["ESTIMATED LIABILITY", v.premium, CK.alarm],
              ].map(([k,vv,c],i) => (
                <CKKV key={i} k={k} v={vv} tone={c === CK.alarm ? "alarm" : "text"}/>
              ))}
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2" style={{ borderColor: CK.rule2 }}>
              <CKBtn variant="ghost" onClick={onClose}>DEFER</CKBtn>
              <CKBtn variant="primary" onClick={() => setStep(2)}>CONTINUE ▸</CKBtn>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="px-4 py-4">
              <CKLabel>DISPOSITION</CKLabel>
              <div className="text-[12px] mt-1" style={{ color: CK.dim }}>SELECT THE OUTCOME. WILL APPEAR IN AUDIT LOG.</div>
            </div>
            {decisions.map(([k, t, s, c]) => (
              <button key={k} onClick={() => setDecision(k)}
                className="w-full text-left px-4 py-3 border-b flex items-center gap-3"
                style={{ borderColor: CK.rule, background: decision === k ? "rgba(255,176,0,0.06)" : "transparent" }}>
                <span className="w-4 h-4 flex items-center justify-center border" style={{ borderColor: decision === k ? CK.amber : CK.rule2 }}>
                  {decision === k && <span className="w-2 h-2" style={{ background: CK.amber }}/>}
                </span>
                <div className="flex-1">
                  <div className="text-[11px] tracking-[0.18em]" style={{ color: c }}>{t}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: CK.dim }}>{s}</div>
                </div>
              </button>
            ))}
            <div className="px-4 py-3">
              <CKLabel>NOTE / OPTIONAL</CKLabel>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder="MANAGER NOTES, CORRECTIVE ACTION, ETC."
                className="w-full border px-2 py-1.5 mt-2 text-[11px] resize-none"
                style={{ borderColor: CK.rule2, background: CK.surface, color: CK.text, fontFamily: "'IBM Plex Mono', monospace" }}/>
            </div>
            <div className="px-4 py-3 border-t flex justify-between gap-2" style={{ borderColor: CK.rule2 }}>
              <CKBtn variant="ghost" onClick={() => setStep(1)}>◂ BACK</CKBtn>
              <CKBtn variant="primary" onClick={() => setStep(3)}>CONTINUE ▸</CKBtn>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="px-4 py-4">
              <CKLabel>SIGN-OFF</CKLabel>
              <div className="text-[12px] mt-1" style={{ color: CK.text }}>I CERTIFY THIS RESOLUTION COMPLIES WITH POLICY AND APPLICABLE LABOR LAW.</div>
            </div>
            <div className="border-t border-b" style={{ borderColor: CK.rule2 }}>
              <CKKV k="DISPOSITION" v={decisions.find(d => d[0] === decision)[1]} tone="amber"/>
              <CKKV k="EFFECTIVE" v="IMMEDIATELY"/>
              <CKKV k="SIGNED BY" v="A.KIM / OWNER"/>
              <CKKV k="TIMESTAMP" v={new Date().toLocaleString("en-US",{hour12:false}).toUpperCase()}/>
            </div>
            <div className="px-4 py-4">
              <div className="text-[9px] tracking-[0.2em]" style={{ color: CK.dim }}>E-SIGNATURE</div>
              <div className="mt-2 h-20 border flex items-center justify-center" style={{ borderColor: CK.ok, background: "rgba(105,210,124,0.04)" }}>
                <div className="text-[11px] tracking-[0.18em]" style={{ color: CK.ok }}>● SIGNATURE READY / TAP COMMIT</div>
              </div>
            </div>
            <div className="px-4 py-3 border-t flex justify-between gap-2" style={{ borderColor: CK.rule2 }}>
              <CKBtn variant="ghost" onClick={() => setStep(2)}>◂ BACK</CKBtn>
              <CKBtn variant="alarm" onClick={onClose}>■ COMMIT RESOLUTION</CKBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Schedule builder pane.
function CKAdminSchedulePane() {
  const crewColor = (c) => c === "KT" ? CK.amber : CK.text;
  return (
    <div className="space-y-3">
      <div className="border" style={{ borderColor: CK.rule, background: CK.surface }}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
          <div className="flex items-center gap-3">
            <CKLabel>WEEK 18 · APR 28 — MAY 04</CKLabel>
            <CKChip tone="ok">PUBLISHED</CKChip>
          </div>
          <div className="flex gap-1">
            <CKBtn size="sm" variant="quiet">◂ WK 17</CKBtn>
            <CKBtn size="sm" variant="quiet">WK 19 ▸</CKBtn>
            <CKBtn size="sm" variant="quiet">DUPLICATE</CKBtn>
            <CKBtn size="sm">+ NEW SHIFT</CKBtn>
          </div>
        </div>
        {/* KPI strip */}
        <div className="grid grid-cols-5 gap-px border-b" style={{ background: CK.rule, borderColor: CK.rule }}>
          {[
            ["SHIFTS",  "37",     CK.text],
            ["EMPLOYEES","12",    CK.text],
            ["TOTAL HRS","296",   CK.text],
            ["EST PAYROLL","$7.2K", CK.amber],
            ["FILL",    "100%",   CK.ok],
          ].map(([l,v,c],i) => (
            <div key={i} className="px-3 py-2" style={{ background: CK.bg }}>
              <div className="text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>{l}</div>
              <div className="ck-num text-[20px] mt-0.5" style={{ color: c, fontFamily: "'IBM Plex Sans Condensed'" }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Grid */}
        <div className="grid" style={{ gridTemplateColumns: "120px repeat(7, 1fr)" }}>
          {/* Header row */}
          <div className="px-2 py-2 border-r border-b text-[9px] tracking-[0.18em]" style={{ borderColor: CK.rule, color: CK.dim }}>STAFF</div>
          {TK.scheduleWeek.map(d => (
            <div key={d.day} className="px-2 py-2 border-r border-b" style={{ borderColor: CK.rule }}>
              <div className="text-[9px] tracking-[0.2em]" style={{ color: CK.amber }}>{d.day}</div>
              <div className="text-[9px] ck-num mt-0.5" style={{ color: CK.dim }}>{d.date}</div>
            </div>
          ))}
          {/* Employee rows */}
          {TK.team.slice(0, 8).map((emp, ri) => (
            <React.Fragment key={emp.id}>
              <div className="px-2 py-2 border-r border-b flex items-center gap-2" style={{ borderColor: CK.rule, background: ri % 2 ? CK.surface : "transparent" }}>
                <Avatar name={emp.name} size={22} mono/>
                <div>
                  <div className="text-[10px]" style={{ color: CK.text }}>{emp.name.split(" ")[1].toUpperCase()}</div>
                  <div className="text-[8px] tracking-[0.16em]" style={{ color: CK.dim }}>{emp.role.toUpperCase()}</div>
                </div>
              </div>
              {TK.scheduleWeek.map(day => {
                const cell = day.cells.find(([n]) => n === emp.name);
                return (
                  <div key={day.day} className="border-r border-b px-1.5 py-2 min-h-[42px]" style={{ borderColor: CK.rule, background: ri % 2 ? CK.surface : "transparent" }}>
                    {cell ? (
                      <div className="border px-1.5 py-1" style={{ borderColor: crewColor(cell[2]), background: cell[2] === "KT" ? "rgba(255,176,0,0.06)" : "transparent" }}>
                        <div className="text-[10px] ck-num" style={{ color: CK.text }}>{cell[1]}</div>
                        <div className="text-[8px] tracking-[0.18em]" style={{ color: crewColor(cell[2]) }}>{cell[2]}</div>
                      </div>
                    ) : (
                      <div className="text-[9px] text-center pt-2" style={{ color: CK.fade }}>—</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Payroll pane.
function CKAdminPayrollPane() {
  const lines = TK.team.slice(0, 10).map((e, i) => {
    const reg = 38 + (i * 7 % 7);
    const ot = (i * 3 % 4) * 0.5;
    const prem = i === 0 ? 24.50 : i === 5 ? 22.40 : 0;
    const rate = 22 + (i % 4) * 1.5;
    const total = reg * rate + ot * rate * 1.5 + prem;
    return { e, reg, ot, prem, rate, total };
  });
  const totals = lines.reduce((a, l) => ({
    reg: a.reg + l.reg, ot: a.ot + l.ot, prem: a.prem + l.prem, total: a.total + l.total
  }), { reg: 0, ot: 0, prem: 0, total: 0 });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-3">
        {[
          ["PERIOD",     "APR 14–27",  CK.text],
          ["EMPLOYEES",  lines.length, CK.text],
          ["REG HRS",    totals.reg.toFixed(1), CK.text],
          ["OT HRS",     totals.ot.toFixed(1),  CK.amber],
          ["GROSS",      `$${totals.total.toFixed(2)}`, CK.ok],
        ].map(([l, v, c], i) => (
          <div key={i} className="border p-3" style={{ borderColor: CK.rule, background: CK.surface }}>
            <CKLabel>{l}</CKLabel>
            <div className="ck-num font-light mt-1" style={{ fontFamily: "'IBM Plex Sans Condensed'", fontSize: 32, letterSpacing: "-0.03em", color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="border" style={{ borderColor: CK.rule, background: CK.surface }}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
          <div className="flex items-center gap-3">
            <CKLabel>PAYROLL EXPORT / PRE-FLIGHT</CKLabel>
            <CKChip tone="amber">DRAFT</CKChip>
          </div>
          <div className="flex gap-1">
            <CKBtn size="sm" variant="quiet">CSV</CKBtn>
            <CKBtn size="sm" variant="quiet">XLSX</CKBtn>
            <CKBtn size="sm" variant="quiet">ADP</CKBtn>
            <CKBtn size="sm" variant="primary">FINALIZE & SEND</CKBtn>
          </div>
        </div>
        <div className="grid grid-cols-[80px_180px_60px_60px_70px_80px_80px] gap-3 px-3 py-1.5 border-b text-[9px] tracking-[0.16em]" style={{ borderColor: CK.rule, color: CK.dim }}>
          <div>EMP ID</div><div>NAME / ROLE</div><div className="text-right">REG</div><div className="text-right">OT</div><div className="text-right">RATE</div><div className="text-right">PREM</div><div className="text-right">TOTAL</div>
        </div>
        {lines.map(({ e, reg, ot, prem, rate, total }, i) => (
          <div key={e.id} className="grid grid-cols-[80px_180px_60px_60px_70px_80px_80px] gap-3 px-3 py-1.5 border-b items-center text-[11px]" style={{ borderColor: CK.rule, background: prem > 0 ? "rgba(255,176,0,0.04)" : "transparent" }}>
            <span className="ck-num" style={{ color: CK.dim }}>{e.id.toUpperCase()}</span>
            <div>
              <div style={{ color: CK.text }}>{e.name.toUpperCase()}</div>
              <div className="text-[9px] tracking-[0.16em]" style={{ color: CK.dim }}>{e.role.toUpperCase()}</div>
            </div>
            <span className="text-right ck-num" style={{ color: CK.text }}>{reg.toFixed(1)}</span>
            <span className="text-right ck-num" style={{ color: ot > 0 ? CK.amber : CK.dim }}>{ot.toFixed(1)}</span>
            <span className="text-right ck-num" style={{ color: CK.dim }}>${rate.toFixed(2)}</span>
            <span className="text-right ck-num" style={{ color: prem > 0 ? CK.alarm : CK.dim }}>{prem > 0 ? `$${prem.toFixed(2)}` : "—"}</span>
            <span className="text-right ck-num" style={{ color: CK.text, fontWeight: 500 }}>${total.toFixed(2)}</span>
          </div>
        ))}
        <div className="grid grid-cols-[80px_180px_60px_60px_70px_80px_80px] gap-3 px-3 py-2 items-center text-[11px]" style={{ background: CK.rule2 }}>
          <span/><span className="text-[9px] tracking-[0.2em]" style={{ color: CK.dim }}>TOTAL</span>
          <span className="text-right ck-num" style={{ color: CK.text }}>{totals.reg.toFixed(1)}</span>
          <span className="text-right ck-num" style={{ color: CK.amber }}>{totals.ot.toFixed(1)}</span>
          <span/>
          <span className="text-right ck-num" style={{ color: CK.alarm }}>${totals.prem.toFixed(2)}</span>
          <span className="text-right ck-num font-medium" style={{ color: CK.text }}>${totals.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Audit log pane.
function CKAdminAuditPane() {
  const levelColor = { high: CK.alarm, med: CK.amber, info: CK.dim };
  const levelGlyph = { high: "▲", med: "△", info: "·" };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {[
          ["EVENTS / 24H", "287", CK.text],
          ["PUNCHES",      "242", CK.text],
          ["POLICY EDITS", "3",   CK.amber],
          ["ALARMS",       "4",   CK.alarm],
        ].map(([l, v, c], i) => (
          <div key={i} className="border p-3" style={{ borderColor: CK.rule, background: CK.surface }}>
            <CKLabel>{l}</CKLabel>
            <div className="ck-num font-light mt-1" style={{ fontFamily: "'IBM Plex Sans Condensed'", fontSize: 28, letterSpacing: "-0.03em", color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="border" style={{ borderColor: CK.rule, background: CK.surface }}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
          <div className="flex items-center gap-3">
            <CKLabel>IMMUTABLE EVENT STREAM</CKLabel>
            <span className="text-[10px] tracking-[0.16em]" style={{ color: CK.dim }}>· CHAIN VERIFIED · SHA-256</span>
            <CKChip tone="ok">● LIVE</CKChip>
          </div>
          <div className="flex gap-1">
            <CKBtn size="sm" variant="quiet">FILTER</CKBtn>
            <CKBtn size="sm" variant="quiet">SEARCH</CKBtn>
            <CKBtn size="sm">EXPORT 7D</CKBtn>
          </div>
        </div>
        <div className="grid grid-cols-[80px_140px_180px_220px_1fr_30px] gap-3 px-3 py-1.5 border-b text-[9px] tracking-[0.16em]" style={{ borderColor: CK.rule, color: CK.dim }}>
          <div>TIME</div><div>ACTOR</div><div>ACTION</div><div>TARGET</div><div>META</div><div className="text-right">LVL</div>
        </div>
        <div className="font-mono">
          {TK.audit.map((a, i) => (
            <div key={i} className="grid grid-cols-[80px_140px_180px_220px_1fr_30px] gap-3 px-3 py-1.5 border-b items-center text-[10px]" style={{ borderColor: CK.rule }}>
              <span className="ck-num" style={{ color: CK.dim }}>{a.at}</span>
              <span style={{ color: a.actor === "SYSTEM" ? CK.amber : a.actor === "A.KIM" ? CK.text : CK.dim }}>{a.actor}</span>
              <span className="tracking-[0.14em]" style={{ color: levelColor[a.level] }}>{a.action}</span>
              <span style={{ color: CK.text }}>{a.target}</span>
              <span style={{ color: CK.dim }}>{a.meta}</span>
              <span className="text-right" style={{ color: levelColor[a.level] }}>{levelGlyph[a.level]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings pane.
function CKAdminSettingsPane() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-3">
          <CKPanel label="POLICY RULES / CALIFORNIA IWC §11" value="12 ACTIVE">
            <div>
              {TK.rules.map((r, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_220px_60px] gap-3 px-3 py-2 border-b items-center text-[11px]" style={{ borderColor: CK.rule }}>
                  <span className="ck-num text-[10px]" style={{ color: CK.amber }}>{r.code}</span>
                  <span style={{ color: CK.text }}>{r.label.toUpperCase()}</span>
                  <span className="ck-num text-[10px]" style={{ color: CK.text }}>{r.value.toUpperCase()}</span>
                  <span className="text-right text-[9px] tracking-[0.18em]" style={{ color: r.mandatory ? CK.alarm : CK.dim }}>
                    {r.mandatory ? "▲ MANDATORY" : "EDITABLE"}
                  </span>
                </div>
              ))}
            </div>
          </CKPanel>

          <CKPanel label="GEOFENCES / 1 SITE">
            <div className="p-3 grid grid-cols-3 gap-3">
              <div className="col-span-1 border" style={{ borderColor: CK.rule2, background: CK.bg }}>
                {/* SVG mini-map */}
                <svg width="100%" height="160" viewBox="0 0 200 160">
                  <defs>
                    <pattern id="gridSettings" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke={CK.rule} strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="200" height="160" fill="url(#gridSettings)"/>
                  <circle cx="100" cy="80" r="50" fill={CK.amber} opacity="0.1" stroke={CK.amber} strokeWidth="1" strokeDasharray="2 3"/>
                  <circle cx="100" cy="80" r="3" fill={CK.amber}/>
                  <text x="100" y="68" fill={CK.amber} textAnchor="middle" fontSize="8" letterSpacing="2" fontFamily="IBM Plex Mono">OAK-KIT</text>
                  <text x="100" y="148" fill={CK.dim} textAnchor="middle" fontSize="7" letterSpacing="2" fontFamily="IBM Plex Mono">100M RADIUS</text>
                </svg>
              </div>
              <div className="col-span-2">
                <CKKV k="SITE NAME" v="OAK-KIT / ACME KITCHEN"/>
                <CKKV k="LAT" v="37.8044° N" tone="text"/>
                <CKKV k="LNG" v="122.2712° W"/>
                <CKKV k="RADIUS" v="100 METERS" tone="amber"/>
                <CKKV k="OUT-OF-FENCE" v="REQUIRES MGR APPROVAL"/>
                <div className="px-3 py-3">
                  <CKBtn size="sm" variant="quiet">EDIT GEOFENCE</CKBtn>
                </div>
              </div>
            </div>
          </CKPanel>
        </div>

        <div className="space-y-3">
          <CKPanel label="CREWS / 2 GROUPS">
            <div>
              {[
                ["KITCHEN", "KT", 7, CK.amber],
                ["FRONT", "FR", 5, CK.text],
              ].map(([n, code, count, c], i) => (
                <div key={i} className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 border text-[9px] tracking-[0.18em]" style={{ borderColor: c, color: c }}>{code}</span>
                      <span className="text-[12px]" style={{ color: CK.text }}>{n}</span>
                    </div>
                    <span className="ck-num text-[11px]" style={{ color: CK.dim }}>{count} STAFF</span>
                  </div>
                </div>
              ))}
              <div className="px-3 py-3">
                <CKBtn size="sm" variant="quiet">+ ADD CREW</CKBtn>
              </div>
            </div>
          </CKPanel>

          <CKPanel label="INTEGRATIONS">
            <div>
              {[
                ["ADP RUN",         "PAYROLL EXPORT",  "CONNECTED", CK.ok],
                ["GUSTO",           "PAYROLL ALT.",     "AVAILABLE", CK.dim],
                ["7SHIFTS",         "SCHEDULING",       "CONNECTED", CK.ok],
                ["SLACK",           "ALARM ROUTING",    "CONNECTED", CK.ok],
                ["QUICKBOOKS",      "ACCOUNTING",       "AVAILABLE", CK.dim],
              ].map(([n, t, s, c], i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 border-b" style={{ borderColor: CK.rule }}>
                  <div>
                    <div className="text-[11px]" style={{ color: CK.text }}>{n}</div>
                    <div className="text-[9px] tracking-[0.16em]" style={{ color: CK.dim }}>{t}</div>
                  </div>
                  <span className="text-[9px] tracking-[0.18em] self-center" style={{ color: c }}>● {s}</span>
                </div>
              ))}
            </div>
          </CKPanel>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CKAdminEmployeeDetail, CKAdminResolutionFlow, CKAdminSchedulePane, CKAdminPayrollPane, CKAdminAuditPane, CKAdminSettingsPane });
