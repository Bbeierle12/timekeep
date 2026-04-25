/* Cockpit — Employee iOS view (main "Shift" screen). Instrument panel with bottom nav + live clock. */

function CKEmployeeView({ scenario, onShowWarning, onShowBreak, onShowWaiver, onShowAttestation, scenarioKey, setScenarioKey, onOpenScreen, onPunch }) {
  const now = useLiveNow(scenario.now);
  const { entries, warning } = scenario;
  const clockIn = entries.find(e => e.type === "CLOCK_IN")?.at;
  const lunchStart = entries.find(e => e.type === "LUNCH_START")?.at;
  const lunchEnd = entries.find(e => e.type === "LUNCH_END")?.at;
  const break1 = entries.find(e => e.type === "BREAK_ACK_1")?.at;
  const onLunch = !!lunchStart && !lunchEnd;
  const elapsed = clockIn ? TK.minsBetween(clockIn, now) : 0;
  const h = Math.floor(elapsed/60), m = elapsed%60;
  const seconds = now.getSeconds();

  const fivehr = 300;
  const minsToDeadline = fivehr - elapsed;
  const overMeal = !lunchStart && minsToDeadline < 0;
  const nearMeal = !lunchStart && minsToDeadline <= 30 && minsToDeadline >= 0;

  let statusLabel = "STANDBY";
  let statusTone = "dim";
  if (clockIn && !onLunch && !lunchEnd) {
    if (overMeal) { statusLabel = "MEAL OVERDUE"; statusTone = "alarm"; }
    else if (nearMeal) { statusLabel = "MEAL APPROACHING"; statusTone = "amber"; }
    else { statusLabel = "ON DUTY"; statusTone = "ok"; }
  } else if (onLunch) { statusLabel = "MEAL PERIOD"; statusTone = "amber"; }
  else if (lunchEnd && !entries.find(e => e.type === "CLOCK_OUT")) { statusLabel = "ON DUTY"; statusTone = "ok"; }

  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  return (
    <div className={cx(ckClass, "flex flex-col h-full relative ck-scan")} style={{ background: CK.bg, color: CK.text }}>
      {/* Top status strip */}
      <div className="px-3 pt-2 pb-2 border-b flex items-center justify-between" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 ck-blink" style={{ background: statusTone === "alarm" ? CK.alarm : statusTone === "amber" ? CK.amber : CK.ok }}/>
          <span className="text-[9px] tracking-[0.2em]" style={{ color: CK.dim }}>TIMEKEEP / EMP-2418</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] ck-num" style={{ color: CK.dim }}>{dateStr}</span>
          <span className="text-[9px] ck-num" style={{ color: CK.text }}>{timeStr}</span>
        </div>
      </div>

      {/* Alarm banner */}
      {warning && (
        <button onClick={onShowWarning}
          className={cx("flex items-center justify-between px-3 py-2 border-b", warning.stage === "stage3" ? "ck-flash" : "")}
          style={{ borderColor: warning.stage === "stage3" ? CK.alarm : CK.amber, background: warning.stage === "stage3" ? "rgba(255,59,59,0.06)" : "rgba(255,176,0,0.04)" }}>
          <div className="flex items-center gap-2">
            <span className={cx("w-1.5 h-1.5 ck-blink")} style={{ background: warning.stage === "stage3" ? CK.alarm : CK.amber }}/>
            <span className="text-[10px] tracking-[0.18em] font-medium" style={{ color: warning.stage === "stage3" ? CK.alarm : CK.amber }}>
              {warning.stage === "stage3" ? "▲ ALARM" : "△ ADVISORY"}
            </span>
            <span className="text-[10px]" style={{ color: CK.text }}>{warning.copy.toUpperCase()}</span>
          </div>
          <span className="text-[10px]" style={{ color: CK.dim }}>›</span>
        </button>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto ink-scroll px-3 py-3 pb-40 space-y-3">
        {/* Scenario selector */}
        <div className="flex gap-px text-[10px]">
          {[["compliant","NORMAL"],["atRisk","CAUTION"],["violation","ALARM"]].map(([k, l]) => (
            <button key={k} onClick={() => setScenarioKey(k)}
              className="flex-1 py-1.5 border tracking-[0.16em]"
              style={{
                borderColor: scenarioKey === k ? CK.text : CK.rule,
                background: scenarioKey === k ? CK.text : "transparent",
                color: scenarioKey === k ? CK.bg : CK.dim,
              }}>{l}</button>
          ))}
        </div>

        {/* Hero block */}
        <div className="border" style={{ borderColor: CK.rule2 }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule, background: "rgba(255,255,255,0.02)" }}>
            <CKLabel tone={statusTone}>{statusLabel}</CKLabel>
            <span className="text-[9px] ck-num" style={{ color: CK.dim }}>SHIFT 01 / OAK-KIT</span>
          </div>
          <div className="flex items-stretch">
            <div className="pl-8 pr-2 py-4 border-r" style={{ borderColor: CK.rule }}>
              <CKMealScale clockIn={clockIn} now={now} lunchStart={lunchStart} lunchEnd={lunchEnd} orientation="vertical" height={300}/>
            </div>
            <div className="flex-1 px-4 py-4 flex flex-col justify-between">
              <div>
                <CKLabel>ELAPSED</CKLabel>
                <div className="flex items-baseline gap-1 mt-1">
                  <CKDigit value={String(h).padStart(2,'0')} size={56} tone={overMeal ? "alarm" : "text"}/>
                  <span className="text-2xl ck-num" style={{ color: CK.dim }}>:</span>
                  <CKDigit value={String(m).padStart(2,'0')} size={56} tone={overMeal ? "alarm" : "text"}/>
                  <span className="text-lg ck-num ck-blink ml-1" style={{ color: CK.dim }}>:{String(seconds).padStart(2,'0')}</span>
                </div>
                <div className="text-[10px] mt-1 ck-num" style={{ color: CK.dim, letterSpacing: "0.14em" }}>HH : MM : SS</div>
              </div>
              <div className="space-y-2 pt-3">
                <div className="flex justify-between border-b pb-1.5" style={{ borderColor: CK.rule }}>
                  <span className="text-[9px] tracking-[0.16em]" style={{ color: CK.dim }}>MEAL T-MINUS</span>
                  <span className="text-xs ck-num" style={{ color: overMeal ? CK.alarm : nearMeal ? CK.amber : CK.text }}>
                    {overMeal ? `+${Math.abs(minsToDeadline)}M` : `${minsToDeadline}M`}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5" style={{ borderColor: CK.rule }}>
                  <span className="text-[9px] tracking-[0.16em]" style={{ color: CK.dim }}>BREAKS</span>
                  <span className="text-xs ck-num" style={{ color: CK.text }}>{break1 ? "1" : "0"}/3</span>
                </div>
                <div className="flex justify-between border-b pb-1.5" style={{ borderColor: CK.rule }}>
                  <span className="text-[9px] tracking-[0.16em]" style={{ color: CK.dim }}>EXP. OUT</span>
                  <span className="text-xs ck-num" style={{ color: CK.text }}>{clockIn ? TK.fmtShort(new Date(clockIn.getTime() + 8*3600*1000)).toUpperCase() : "--"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Punch matrix */}
        <CKPanel label="PUNCH MATRIX" value={`${entries.length.toString().padStart(2,"0")} EVENTS`}>
          <div className="grid grid-cols-2 gap-px" style={{ background: CK.rule }}>
            {[
              ["CLOCK IN",   clockIn,    !clockIn],
              ["MEAL START", lunchStart, !!clockIn && !lunchStart && !onLunch],
              ["MEAL END",   lunchEnd,   onLunch],
              ["CLOCK OUT",  null,       !!clockIn && !!lunchEnd],
            ].map(([label, ts, active]) => (
              <button key={label} disabled={!active && !ts}
                className="text-left px-3 py-3 disabled:opacity-40"
                style={{ background: ts ? "rgba(105,210,124,0.04)" : active ? "rgba(255,176,0,0.06)" : CK.surface }}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] tracking-[0.18em]" style={{ color: ts ? CK.ok : active ? CK.amber : CK.dim }}>{label}</span>
                  {ts && <span className="text-[9px]" style={{ color: CK.ok }}>●</span>}
                  {active && !ts && <span className="text-[9px] ck-blink" style={{ color: CK.amber }}>▶</span>}
                </div>
                <div className="text-base ck-num mt-1" style={{ color: ts ? CK.text : CK.fade }}>
                  {ts ? TK.fmtShort(ts).toUpperCase() : "--:--"}
                </div>
              </button>
            ))}
          </div>
        </CKPanel>

        {/* Rest breaks */}
        <CKPanel label="REST BREAKS" value="10 MIN PAID / 4H">
          <div className="p-3 space-y-2">
            {[
              { n: 1, taken: !!break1, at: break1, due: clockIn ? new Date(clockIn.getTime()+2*3600*1000) : null, available: !!clockIn },
              { n: 2, taken: false,    at: null,   due: clockIn ? new Date(clockIn.getTime()+6*3600*1000) : null, available: !!break1 && !onLunch },
              { n: 3, taken: false,    at: null,   due: null, available: false },
            ].map(b => (
              <div key={b.n} className="flex items-center gap-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
                <span className="text-[10px] tracking-[0.18em]" style={{ color: b.taken ? CK.ok : b.available ? CK.text : CK.fade }}>B{b.n}</span>
                <div className="flex-1 flex gap-px h-2.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="flex-1" style={{ background: b.taken ? CK.ok : b.available && i < 12 ? CK.text : CK.fade, opacity: b.taken ? 1 : b.available ? 0.4 : 0.15 }}/>
                  ))}
                </div>
                <span className="text-[10px] ck-num w-20 text-right" style={{ color: b.taken ? CK.ok : b.available ? CK.text : CK.dim }}>
                  {b.taken ? TK.fmtShort(b.at).toUpperCase() : b.due ? `~${TK.fmtShort(b.due).toUpperCase()}` : "—"}
                </span>
                {b.available && !b.taken && <CKBtn size="sm" onClick={() => onShowBreak(b.n)}>ACK</CKBtn>}
                {b.taken && <CKChip tone="ok">REC</CKChip>}
              </div>
            ))}
          </div>
        </CKPanel>

        {/* Event log */}
        <CKPanel label="EVENT LOG" value={`T${entries.length.toString().padStart(2,'0')}`}>
          <div className="font-mono text-[11px]">
            {entries.slice().reverse().map((e, i) => (
              <div key={i} className="flex gap-2 px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
                <span className="ck-num" style={{ color: CK.dim }}>{TK.fmtShort(e.at).toUpperCase().padStart(7,' ')}</span>
                <span style={{ color: CK.amber, width: 10 }}>{">"}</span>
                <span style={{ color: CK.text }}>{TK.entryLabel(e.type).toUpperCase()}</span>
                {e.note && <span className="ml-auto text-[10px]" style={{ color: CK.dim }}>{e.note}</span>}
              </div>
            ))}
            <div className="flex gap-2 px-3 py-1.5">
              <span className="ck-num" style={{ color: CK.dim }}>{timeStr.slice(0,5)}</span>
              <span style={{ color: CK.amber }}>{">"}</span>
              <span className="ck-blink" style={{ color: CK.text }}>_</span>
            </div>
          </div>
        </CKPanel>

        {/* Forms */}
        <div className="grid grid-cols-2 gap-px" style={{ background: CK.rule }}>
          <button onClick={onShowWaiver} className="text-left px-3 py-3" style={{ background: CK.surface }}>
            <CKLabel>FORM 226-W</CKLabel>
            <div className="text-[12px] mt-1" style={{ color: CK.text }}>MEAL WAIVER</div>
            <div className="text-[10px] mt-0.5" style={{ color: CK.dim }}>SHIFT ≤ 6H</div>
          </button>
          <button onClick={onShowAttestation} className="text-left px-3 py-3" style={{ background: CK.surface }}>
            <CKLabel>FORM 226-C</CKLabel>
            <div className="text-[12px] mt-1" style={{ color: CK.text }}>PAY CERT.</div>
            <div className="text-[10px] mt-0.5" style={{ color: CK.dim }}>BEFORE PAYROLL</div>
          </button>
        </div>
      </div>

      {/* Bottom action area + nav */}
      <div className="absolute left-0 right-0 bottom-0 border-t" style={{ borderColor: CK.rule2, background: "linear-gradient(to top, #000 70%, rgba(0,0,0,0.95) 95%, transparent)" }}>
        <div className="px-3 pt-2 pb-2">
          <div className="flex items-center justify-between mb-1.5 text-[9px] tracking-[0.18em]" style={{ color: CK.dim }}>
            <span>EMP-2418 / DELGADO,M</span>
            <span className="ck-num">{timeStr}</span>
          </div>
          {onLunch ? (
            <CKBtn variant="primary" size="lg" className="w-full" onClick={() => onPunch?.("LUNCH_END")}>END MEAL PERIOD</CKBtn>
          ) : warning?.stage === "stage3" ? (
            <CKBtn variant="alarm" size="lg" className="w-full" onClick={onShowWarning}>▲ TAKE LUNCH NOW</CKBtn>
          ) : !clockIn ? (
            <CKBtn variant="primary" size="lg" className="w-full" onClick={() => onPunch?.("CLOCK_IN")}>CLOCK IN</CKBtn>
          ) : (
            <CKBtn variant="ghost" size="lg" className="w-full" onClick={() => onPunch?.("LUNCH_START")}>START MEAL PERIOD</CKBtn>
          )}
        </div>

        {/* Bottom nav tabs */}
        <div className="grid grid-cols-5 gap-px border-t" style={{ background: CK.rule, borderColor: CK.rule2 }}>
          {[
            ["shift", "SHIFT", true],
            ["history","HIST"],
            ["pay",    "PAY"],
            ["timeoff","TIME-OFF"],
            ["profile","PROFILE"],
          ].map(([k, l, active]) => (
            <button key={k} onClick={() => k !== "shift" && onOpenScreen?.(k)}
              className="py-2 text-[9px] tracking-[0.18em]"
              style={{ background: CK.bg, color: active ? CK.amber : CK.dim, borderTop: active ? `1px solid ${CK.amber}` : "1px solid transparent" }}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CKEmployeeView });
