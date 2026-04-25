/* Cockpit — Admin desktop. Bloomberg-terminal density.
   Layout: persistent left rail (mono icons), top status strip, grid panels. */

function CKKPI({ label, value, sub, tone = "text", trend }) {
  const colors = { text: CK.text, amber: CK.amber, alarm: CK.alarm, ok: CK.ok, dim: CK.dim };
  return (
    <div className="border p-3 relative" style={{ borderColor: CK.rule, background: CK.surface }}>
      <div className="flex items-center justify-between">
        <CKLabel>{label}</CKLabel>
        {trend && <div className="flex gap-px h-3 items-end">
          {trend.map((v, i) => <div key={i} style={{ width: 2, height: `${(v/Math.max(...trend))*12}px`, background: CK.dim }}/>)}
        </div>}
      </div>
      <div className="ck-num font-light mt-1" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", fontSize: 36, lineHeight: 1, color: colors[tone], letterSpacing: "-0.03em" }}>{value}</div>
      {sub && <div className="text-[10px] mt-1.5 tracking-wider" style={{ color: CK.dim }}>{sub}</div>}
    </div>
  );
}

function CKExposureGauge({ dollars }) {
  const target = 500;
  const p = Math.min(1, dollars / target);
  const ticks = 60;
  return (
    <div className="border p-3 relative col-span-2" style={{ borderColor: CK.rule, background: CK.surface }}>
      <div className="flex items-center justify-between">
        <CKLabel tone="alarm">EXPOSURE / PREMIUM PAY AT RISK</CKLabel>
        <span className="text-[10px] ck-num" style={{ color: CK.dim }}>USD / DAY</span>
      </div>
      <div className="flex items-end gap-4 mt-2">
        <div className="ck-num font-light" style={{ fontFamily: "'IBM Plex Sans Condensed', sans-serif", fontSize: 56, lineHeight: 1, color: CK.alarm, letterSpacing: "-0.03em" }}>
          ${dollars.toFixed(2)}
        </div>
        <div className="flex-1 pb-2">
          <div className="flex gap-px h-6 items-end">
            {Array.from({ length: ticks }).map((_, i) => {
              const f = i / (ticks-1);
              const active = f <= p;
              const height = 6 + (f * 18);
              return <div key={i} className="flex-1" style={{ height, background: active ? (f > 0.7 ? CK.alarm : f > 0.4 ? CK.amber : CK.ok) : CK.fade, opacity: active ? 1 : 0.5 }}/>;
            })}
          </div>
          <div className="flex justify-between text-[9px] ck-num mt-1" style={{ color: CK.dim }}>
            <span>$0</span><span>$250</span><span>$500 LIMIT</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CKAlertRow({ a }) {
  const tone = a.severity === "high" ? CK.alarm : CK.amber;
  return (
    <div className="grid grid-cols-[80px_1fr_auto] gap-3 px-3 py-2 border-b items-center" style={{ borderColor: CK.rule }}>
      <span className="text-[10px] tracking-[0.16em]" style={{ color: tone }}>
        {a.severity === "high" ? "▲ ALARM" : "△ ADVS"}
      </span>
      <div className="min-w-0">
        <div className="flex gap-2 items-baseline">
          <span className="text-[11px] tracking-wider" style={{ color: CK.text }}>{a.emp.toUpperCase()}</span>
          <span className="text-[9px] ck-num" style={{ color: CK.dim }}>{a.time.toUpperCase()}</span>
        </div>
        <div className="text-[10px] truncate" style={{ color: CK.dim }}>{a.msg}</div>
      </div>
      <CKBtn size="sm">REVIEW</CKBtn>
    </div>
  );
}

function CKTeamRow({ emp, onOpen }) {
  const stateMap = {
    working: ["ON DUTY", CK.ok], lunch: ["MEAL", CK.amber], break: ["BREAK", CK.text],
    off: ["OFF", CK.dim], clocked_out: ["OUT", CK.dim],
  };
  const [stateLbl, stateColor] = stateMap[emp.state] || ["—", CK.dim];
  const riskColor = emp.risk === "high" ? CK.alarm : emp.risk === "medium" ? CK.amber : CK.ok;
  return (
    <button onClick={onOpen} className="text-left grid grid-cols-[40px_180px_60px_1fr_70px_70px_60px] gap-3 px-3 py-2 items-center border-b text-[11px] w-full hover:bg-white/[0.02]" style={{ borderColor: CK.rule }}>
      <span className="ck-num text-[10px]" style={{ color: CK.dim }}>{emp.id.toUpperCase()}</span>
      <div>
        <div style={{ color: CK.text }}>{emp.name.toUpperCase()}</div>
        <div className="text-[9px]" style={{ color: CK.dim }}>{emp.role.toUpperCase()} / {emp.crew.toUpperCase()}</div>
      </div>
      <span className="text-[10px] tracking-[0.16em]" style={{ color: stateColor }}>{stateLbl}</span>
      <div className="relative h-3" style={{ background: CK.surface }}>
        {emp.in && (() => {
          const total = 8 * 60;
          const elapsed = (() => { const m = emp.elapsed.match(/(\d+)h\s+(\d+)m/); return m ? +m[1]*60 + +m[2] : 0; })();
          const fivehr = 300;
          const lunchAt = emp.lunch ? Math.round((emp.lunch.start - emp.in)/60000) : null;
          const lunchEndAt = emp.lunch?.end ? Math.round((emp.lunch.end - emp.in)/60000) : null;
          return (
            <>
              {/* tick grid */}
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${(i/8)*100}%`, background: CK.rule }}/>
              ))}
              {/* worked progress */}
              <div className="absolute top-0 bottom-0 left-0" style={{ width: `${(elapsed/total)*100}%`, background: emp.risk === "high" ? CK.alarm : CK.text, opacity: 0.6 }}/>
              {/* meal deadline */}
              <div className="absolute top-0 bottom-0 w-px" style={{ left: `${(fivehr/total)*100}%`, background: CK.amber, boxShadow: `0 0 4px ${CK.amber}` }}/>
              {/* lunch segment */}
              {lunchAt !== null && (
                <div className="absolute top-0 bottom-0 border-x" style={{ left: `${(lunchAt/total)*100}%`, width: `${((lunchEndAt || elapsed) - lunchAt)/total*100}%`, background: CK.amber, opacity: 0.4, borderColor: CK.amber }}/>
              )}
            </>
          );
        })()}
      </div>
      <span className="ck-num text-[10px] text-right" style={{ color: CK.text }}>{emp.elapsed.toUpperCase()}</span>
      <span className="text-[10px] tracking-[0.16em] text-right" style={{ color: riskColor }}>{emp.risk.toUpperCase()}</span>
      <span className="text-right" style={{ color: CK.dim }}>›</span>
    </button>
  );
}

function CKAdminDashboardPane({ onResolve }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-3">
        <CKKPI label="ON DUTY" value={TK.kpi.clockedIn} sub={`OF ${TK.kpi.employees}`} tone="ok" trend={[4,6,7,8,7,9,9,9]}/>
        <CKKPI label="VIOLATIONS / DAY" value={TK.kpi.violationsToday} sub="2 HIGH / 0 RESOLVED" tone="alarm" trend={[0,1,0,2,0,0,2,2]}/>
        <CKKPI label="COMPLY RATE" value={`${TK.kpi.complianceRate}%`} sub="30D ROLLING" tone="text" trend={[96,97,96.5,98,97.2,97.8,97.5,97.4]}/>
        <CKKPI label="STREAK" value={`${TK.kpi.streak}D`} sub="SINCE HI-SEV" tone="amber" trend={[8,9,10,11,12,13,12,12]}/>
        <CKKPI label="PEND. CERTS" value={TK.kpi.pendingCerts} sub="AWAITING" tone="text"/>
        <CKKPI label="WAIVERS" value={TK.kpi.waiversToday} sub="TODAY" tone="dim"/>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <CKExposureGauge dollars={TK.kpi.exposure}/>
        <div className="border" style={{ borderColor: CK.rule, background: CK.surface }}>
          <div className="px-3 py-1.5 border-b flex justify-between" style={{ borderColor: CK.rule }}>
            <CKLabel>SHIFT ACTIVITY · 12H</CKLabel>
            <span className="text-[10px] ck-num" style={{ color: CK.dim }}>UNITS</span>
          </div>
          <div className="p-3">
            <div className="flex items-end gap-px h-[68px]">
              {[4,6,9,14,18,22,26,24,19,14,10,8].map((v,i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-px">
                  <div style={{ height: `${v*2.4}px`, background: CK.text }}/>
                  <div className="text-[8px] ck-num text-center" style={{ color: CK.dim }}>{6+i*1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 border" style={{ borderColor: CK.rule, background: CK.surface }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
            <div className="flex items-center gap-3">
              <CKLabel>VIOLATIONS LOG / 7D</CKLabel>
              <CKChip tone="alarm">{TK.violations.filter(v => !v.resolved).length} OPEN</CKChip>
            </div>
            <div className="flex gap-1">
              <CKBtn size="sm" variant="quiet">FILTER</CKBtn>
              <CKBtn size="sm">EXPORT</CKBtn>
            </div>
          </div>
          <div className="grid grid-cols-[60px_1fr_140px_70px_60px] gap-3 px-3 py-1.5 border-b text-[9px] tracking-[0.16em]" style={{ borderColor: CK.rule, color: CK.dim }}>
            <div>DATE</div><div>EMP / DESC</div><div>TYPE</div><div className="text-right">PREMIUM</div><div className="text-right">STATUS</div>
          </div>
          {TK.violations.map(v => (
            <button key={v.id} onClick={!v.resolved ? onResolve : undefined} className="grid grid-cols-[60px_1fr_140px_70px_60px] gap-3 px-3 py-2 border-b items-center text-[11px] text-left w-full hover:bg-white/[0.02] disabled:cursor-default" style={{ borderColor: CK.rule }} disabled={v.resolved}>
              <span className="ck-num" style={{ color: CK.dim }}>{v.date.toUpperCase()}</span>
              <div className="min-w-0">
                <div style={{ color: CK.text }}>{v.emp.toUpperCase()}</div>
                <div className="text-[10px] truncate" style={{ color: CK.dim }}>{v.desc}</div>
              </div>
              <span className="text-[10px] tracking-[0.14em]" style={{ color: v.severity === "high" ? CK.alarm : CK.amber }}>{v.type.toUpperCase()}</span>
              <span className="text-right ck-num" style={{ color: CK.alarm }}>{v.premium}</span>
              <span className="text-right text-[10px] tracking-[0.16em]" style={{ color: v.resolved ? CK.ok : CK.amber }}>{v.resolved ? "RESOLVED" : "OPEN ›"}</span>
            </button>
          ))}
        </div>
        <div className="border" style={{ borderColor: CK.rule, background: CK.surface }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 ck-blink" style={{ background: CK.alarm }}/>
              <CKLabel tone="alarm">ALARM QUEUE</CKLabel>
              <CKChip tone="alarm">{TK.alerts.length}</CKChip>
            </div>
            <CKBtn size="sm" variant="quiet">CLEAR</CKBtn>
          </div>
          {TK.alerts.map(a => <CKAlertRow key={a.id} a={a}/>)}
        </div>
      </div>
    </div>
  );
}

function CKAdminTeamPane({ onOpenEmp }) {
  return (
    <div className="border" style={{ borderColor: CK.rule, background: CK.surface }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-3">
          <CKLabel>LIVE TEAM BOARD</CKLabel>
          <span className="text-[10px] ck-num" style={{ color: CK.dim }}>· {TK.team.filter(e => e.state !== "off" && e.state !== "clocked_out").length} ACTIVE</span>
        </div>
        <div className="flex gap-1">
          <CKBtn size="sm" variant="quiet">ALL</CKBtn>
          <CKBtn size="sm" variant="quiet">WORKING</CKBtn>
          <CKBtn size="sm" variant="quiet">AT RISK</CKBtn>
          <CKBtn size="sm">EXPORT</CKBtn>
        </div>
      </div>
      <div className="grid grid-cols-[40px_180px_60px_1fr_70px_70px_60px] gap-3 px-3 py-1.5 border-b text-[9px] tracking-[0.16em]" style={{ borderColor: CK.rule, color: CK.dim }}>
        <div>ID</div><div>EMPLOYEE</div><div>STATE</div><div>SHIFT TIMELINE / 0H ─ 8H</div><div className="text-right">ELAPSED</div><div className="text-right">RISK</div><div/>
      </div>
      {TK.team.map(e => <CKTeamRow key={e.id} emp={e} onOpen={onOpenEmp}/>)}
    </div>
  );
}

function CKAdminEntriesPane() {
  return (
    <div className="border" style={{ borderColor: CK.rule, background: CK.surface }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
        <CKLabel>TIME ENTRIES · {TK.entries.length} EVENTS</CKLabel>
        <div className="flex gap-1">
          <CKBtn size="sm" variant="quiet">ALL</CKBtn>
          <CKBtn size="sm" variant="quiet">FLAGGED</CKBtn>
          <CKBtn size="sm">+ ADD ENTRY</CKBtn>
        </div>
      </div>
      <div className="grid grid-cols-[70px_180px_120px_1fr_80px_70px] gap-3 px-3 py-1.5 border-b text-[9px] tracking-[0.16em]" style={{ borderColor: CK.rule, color: CK.dim }}>
        <div>TIME</div><div>EMPLOYEE</div><div>ACTION</div><div>NOTE</div><div>SOURCE</div><div>GEO</div>
      </div>
      <div className="font-mono">
        {TK.entries.map(e => {
          const flagged = e.flag === "short-lunch";
          const meta = { CLOCK_IN: ["CLOCK IN", CK.ok], CLOCK_OUT: ["CLOCK OUT", CK.alarm], LUNCH_START: ["MEAL START", CK.amber], LUNCH_END: ["MEAL END", CK.amber], BREAK_ACK_1: ["BREAK 1", CK.text], BREAK_ACK_2: ["BREAK 2", CK.text] }[e.type];
          return (
            <div key={e.id} className="grid grid-cols-[70px_180px_120px_1fr_80px_70px] gap-3 px-3 py-1.5 border-b items-center text-[11px]" style={{ borderColor: CK.rule, background: flagged ? "rgba(255,176,0,0.04)" : "transparent" }}>
              <span className="ck-num" style={{ color: CK.text }}>{TK.fmtShort(e.at).toUpperCase()}</span>
              <span style={{ color: CK.text }}>{e.emp.toUpperCase()}</span>
              <span className="text-[10px] tracking-[0.14em]" style={{ color: meta[1] }}>{meta[0]}</span>
              <span className="text-[10px] truncate" style={{ color: CK.dim }}>
                {flagged ? <span style={{ color: CK.amber }}>△ SHORT MEAL — 34M / 30M FLOOR MET</span> : "RECORDED · GEO VERIFIED"}
              </span>
              <span className="text-[10px]" style={{ color: CK.dim }}>{e.source.toUpperCase()}</span>
              <span className="text-[10px] tracking-[0.16em]" style={{ color: e.geofence === "OK" ? CK.ok : CK.dim }}>{e.geofence}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CKAdminView({ pane, setPane }) {
  const nav = [
    ["DASH", "dashboard"], ["TEAM", "team"], ["EMP", "employee"], ["ENTR", "entries"],
    ["SCHD", "schedule"], ["PAY", "payroll"], ["AUDT", "audit"], ["SETT", "settings"],
  ];
  const [resolveOpen, setResolveOpen] = React.useState(false);
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" }).toUpperCase();
  const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  return (
    <>
    <div className={cx(ckClass, "min-h-screen flex flex-col relative")} style={{ background: CK.bg, color: CK.text }}>
      {/* Top status strip — full width */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2" style={{ background: CK.amber }}/>
            <span className="text-[10px] tracking-[0.22em]" style={{ color: CK.text }}>TIMEKEEP</span>
            <span className="text-[10px] tracking-[0.16em]" style={{ color: CK.dim }}>/ ADMIN</span>
          </div>
          <span className="text-[10px]" style={{ color: CK.dim }}>OAK-KIT · ACME KITCHEN · ZONE 3</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] tracking-[0.16em] ck-num" style={{ color: CK.dim }}>
          <span>UTC-08</span>
          <span style={{ color: CK.text }}>{dateStr}</span>
          <span style={{ color: CK.text }}>{timeStr}</span>
          <span className="ck-blink" style={{ color: CK.ok }}>● LIVE</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex">
        {/* Left rail */}
        <aside className="w-[80px] border-r flex flex-col" style={{ borderColor: CK.rule }}>
          <div className="flex-1 py-2">
            {nav.map(([label, key]) => (
              <button key={key} onClick={() => setPane(key)}
                className="w-full px-2 py-3 border-l-2 flex flex-col items-center gap-1 transition-colors"
                style={{
                  borderLeftColor: pane === key ? CK.amber : "transparent",
                  background: pane === key ? "rgba(255,176,0,0.06)" : "transparent",
                  color: pane === key ? CK.text : CK.dim,
                }}>
                <span className="text-[10px] tracking-[0.18em] font-medium">{label}</span>
                {key === "dashboard" && <span className="w-1 h-1 ck-blink" style={{ background: CK.alarm }}/>}
              </button>
            ))}
          </div>
          <div className="px-2 py-3 border-t" style={{ borderColor: CK.rule }}>
            <div className="text-[9px] tracking-[0.16em] text-center" style={{ color: CK.dim }}>OWNER<br/>A.KIM</div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Sub header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: CK.rule }}>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl ck-display font-light" style={{ color: CK.text, letterSpacing: "-0.02em" }}>
                  {{ dashboard: "Dashboard", team: "Team Board", employee: "Employee File", entries: "Time Entries", schedule: "Schedule Builder", payroll: "Payroll Export", audit: "Audit Log", settings: "Settings" }[pane]}
                </h1>
                {pane === "dashboard" && <CKChip tone="alarm">▲ {TK.violations.filter(v => !v.resolved).length} OPEN</CKChip>}
              </div>
              <div className="text-[10px] tracking-[0.18em] mt-1" style={{ color: CK.dim }}>SESSION 0481 · LAST SYNC {timeStr}</div>
            </div>
            <div className="flex gap-1">
              <CKBtn size="sm" variant="quiet">SEARCH</CKBtn>
              <CKBtn size="sm" variant="quiet">TODAY</CKBtn>
              <CKBtn size="sm" variant="alarm" onClick={() => setResolveOpen(true)}>RESOLVE VIOLATION</CKBtn>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto ink-scroll p-3">
            {pane === "dashboard" && <CKAdminDashboardPane onResolve={() => setResolveOpen(true)}/>}
            {pane === "team" && <CKAdminTeamPane onOpenEmp={() => setPane("employee")}/>}
            {pane === "employee" && <CKAdminEmployeeDetail onBack={() => setPane("team")}/>}
            {pane === "entries" && <CKAdminEntriesPane/>}
            {pane === "schedule" && <CKAdminSchedulePane/>}
            {pane === "payroll" && <CKAdminPayrollPane/>}
            {pane === "audit" && <CKAdminAuditPane/>}
            {pane === "settings" && <CKAdminSettingsPane/>}
          </div>
        </main>

        {/* Right ticker rail */}
        <aside className="w-[200px] border-l flex flex-col" style={{ borderColor: CK.rule, background: CK.surface }}>
          <div className="px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
            <CKLabel>EVENT TICKER</CKLabel>
          </div>
          <div className="flex-1 overflow-hidden text-[10px] font-mono">
            {[
              ["13:47:02", "MARIA D.",   "MEAL OVERDUE +10M", "alarm"],
              ["13:46:15", "MARCUS L.",  "MEAL DUE 13M",      "amber"],
              ["13:42:08", "TANYA O.",   "MEAL END / 38M",    "ok"],
              ["13:30:04", "MARIA D.",   "MEAL START",        "amber"],
              ["13:12:55", "JAVIER R.",  "MEAL END / 27M",    "amber"],
              ["13:04:11", "MARIA D.",   "MEAL END / 34M",    "ok"],
              ["12:48:00", "TANYA O.",   "MEAL START",        "amber"],
              ["12:30:21", "MARIA D.",   "MEAL START",        "amber"],
              ["12:15:09", "JAVIER R.",  "MEAL START",        "amber"],
              ["11:45:33", "AISHA N.",   "BREAK 1",           "text"],
              ["11:31:00", "LENA B.",    "MEAL END / 31M",    "amber"],
              ["11:03:14", "MARCUS L.",  "BREAK 1",           "text"],
              ["11:00:20", "LENA B.",    "MEAL START",        "amber"],
              ["10:30:00", "PRIYA S.",   "CLOCK IN",          "ok"],
              ["10:22:08", "TANYA O.",   "BREAK 1",           "text"],
              ["10:14:55", "MARIA D.",   "BREAK 1",           "text"],
              ["10:00:00", "DEV P.",     "CLOCK IN",          "ok"],
              ["09:30:00", "AISHA N.",   "CLOCK IN",          "ok"],
              ["09:00:00", "MARCUS L.",  "CLOCK IN",          "ok"],
              ["08:48:00", "LENA B.",    "BREAK 1",           "text"],
              ["08:15:00", "TANYA O.",   "CLOCK IN",          "ok"],
              ["08:02:00", "MARIA D.",   "CLOCK IN",          "ok"],
              ["07:45:00", "JAVIER R.",  "CLOCK IN",          "ok"],
              ["06:30:00", "LENA B.",    "CLOCK IN",          "ok"],
            ].map(([t, who, what, tone], i) => {
              const c = { alarm: CK.alarm, amber: CK.amber, ok: CK.ok, text: CK.text }[tone];
              return (
                <div key={i} className="px-2 py-1 border-b" style={{ borderColor: CK.rule }}>
                  <div className="flex justify-between">
                    <span className="ck-num" style={{ color: CK.dim }}>{t}</span>
                    <span style={{ color: c }}>{tone === "alarm" ? "▲" : tone === "amber" ? "△" : "●"}</span>
                  </div>
                  <div style={{ color: CK.text }}>{who}</div>
                  <div className="text-[9px]" style={{ color: c }}>{what}</div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
      {resolveOpen && <CKAdminResolutionFlow onClose={() => setResolveOpen(false)}/>}
    </div>
    </>
  );
}

Object.assign(window, { CKAdminView });
