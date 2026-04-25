/* Cockpit — Employee flows: Login (PIN / biometric) + animated Punch transitions.
   Hold-to-clock-in ring + state machine that moves between login → active → end-of-shift. */

// ─────────────────────────────────────────────────────────────
// Login screen — terminal-boot feel. Type in EMP ID + 4-digit PIN.
function CKLoginView({ onAuthed }) {
  const [id, setId] = React.useState("EMP-2418");
  const [pin, setPin] = React.useState("");
  const [bootLine, setBootLine] = React.useState(0);
  const now = useLiveNow();

  const bootLines = [
    "INIT / TIMEKEEP TERMINAL v4.2.1",
    "LINK / RAIL-A OAK-KIT · 128ms",
    "SYNC / POLICY TABLE · CA IWC §11",
    "GEO / FENCE OK · 100M RADIUS",
    "READY / IDENT REQUIRED ▸",
  ];

  React.useEffect(() => {
    if (bootLine >= bootLines.length) return;
    const id = setTimeout(() => setBootLine(n => n + 1), 380);
    return () => clearTimeout(id);
  }, [bootLine]);

  const keypad = ["1","2","3","4","5","6","7","8","9","FACE","0","⌫"];
  const press = (k) => {
    if (k === "⌫") setPin(p => p.slice(0,-1));
    else if (k === "FACE") { /* biometric flash */ setPin("••••"); setTimeout(onAuthed, 500); }
    else if (pin.length < 4) {
      const next = pin + k;
      setPin(next);
      if (next.length === 4) setTimeout(onAuthed, 450);
    }
  };

  const dateStr = now.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"2-digit" }).toUpperCase();
  const timeStr = now.toLocaleTimeString("en-US", { hour12:false });

  return (
    <div className={cx(ckClass, "h-full flex flex-col relative ck-scan")} style={{ background: CK.bg }}>
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: CK.rule }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 ck-blink" style={{ background: CK.amber }}/>
          <span className="text-[10px] tracking-[0.22em]" style={{ color: CK.text }}>TIMEKEEP</span>
          <span className="text-[10px] tracking-[0.16em]" style={{ color: CK.dim }}>/ BOOT</span>
        </div>
        <span className="text-[10px] ck-num" style={{ color: CK.dim }}>{timeStr}</span>
      </div>

      {/* Boot log */}
      <div className="px-3 py-3 border-b" style={{ borderColor: CK.rule }}>
        <div className="space-y-1 text-[10px] font-mono" style={{ minHeight: 110 }}>
          {bootLines.slice(0, bootLine).map((l, i) => (
            <div key={i} className="flex gap-2 fade-in">
              <span style={{ color: CK.amber }}>›</span>
              <span style={{ color: i === bootLines.length - 1 ? CK.amber : CK.dim }}>{l}</span>
            </div>
          ))}
          {bootLine < bootLines.length && <div className="flex gap-2"><span className="ck-blink" style={{ color: CK.amber }}>_</span></div>}
        </div>
      </div>

      {/* ID + PIN display */}
      <div className="px-3 py-4">
        <div className="text-[10px] tracking-[0.18em]" style={{ color: CK.dim }}>EMPLOYEE IDENT</div>
        <div className="ck-num mt-1 mb-4" style={{
          fontFamily: "'IBM Plex Sans Condensed', sans-serif",
          fontSize: 40, letterSpacing: "-0.02em", color: CK.text,
        }}>{id}</div>

        <div className="text-[10px] tracking-[0.18em]" style={{ color: CK.dim }}>PIN</div>
        <div className="flex gap-2 mt-2">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex-1 h-12 border flex items-center justify-center"
                 style={{ borderColor: i < pin.length ? CK.amber : CK.rule2, background: i < pin.length ? "rgba(255,176,0,0.05)" : "transparent" }}>
              {i < pin.length && <span className="w-2 h-2" style={{ background: CK.amber }}/>}
              {i === pin.length && bootLine >= bootLines.length && <span className="ck-blink text-xs" style={{ color: CK.dim }}>_</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Keypad */}
      <div className="flex-1 grid grid-cols-3 gap-px px-3 pb-3" style={{ background: CK.rule }}>
        {keypad.map(k => (
          <button key={k} onClick={() => press(k)} disabled={bootLine < bootLines.length}
            className="disabled:opacity-30 flex items-center justify-center transition-colors active:bg-white/5"
            style={{ background: CK.bg, color: k === "FACE" ? CK.amber : k === "⌫" ? CK.dim : CK.text,
                     fontSize: k === "FACE" ? 11 : 24, letterSpacing: k === "FACE" ? "0.2em" : "0",
                     fontFamily: k.length === 1 ? "'IBM Plex Sans Condensed'" : "'IBM Plex Mono'",
                     fontWeight: 300 }}>
            {k}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t text-[9px] tracking-[0.2em] flex justify-between" style={{ borderColor: CK.rule, color: CK.dim }}>
        <span>OAK-KIT · ZONE 3</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// Hold-to-punch ring — press and hold for 1200ms to commit.
function CKHoldPunch({ label, sublabel, variant = "primary", onCommit, size = 200, accent }) {
  const [progress, setProgress] = React.useState(0);
  const [held, setHeld] = React.useState(false);
  const [committed, setCommitted] = React.useState(false);
  const rafRef = React.useRef(null);
  const startRef = React.useRef(0);
  const DUR = 1200;

  const tone = accent || (variant === "alarm" ? CK.alarm : variant === "amber" ? CK.amber : CK.amber);

  const tick = React.useCallback(() => {
    const t = Math.min(1, (performance.now() - startRef.current) / DUR);
    setProgress(t);
    if (t < 1) rafRef.current = requestAnimationFrame(tick);
    else { setCommitted(true); setTimeout(() => { setCommitted(false); setProgress(0); setHeld(false); onCommit?.(); }, 350); }
  }, [onCommit]);

  const start = () => { if (committed) return; setHeld(true); startRef.current = performance.now(); rafRef.current = requestAnimationFrame(tick); };
  const stop  = () => { if (committed) return; cancelAnimationFrame(rafRef.current); setHeld(false); setProgress(0); };

  return (
    <button
      onMouseDown={start} onMouseUp={stop} onMouseLeave={stop}
      onTouchStart={(e) => { e.preventDefault(); start(); }}
      onTouchEnd={stop} onTouchCancel={stop}
      className="relative select-none touch-none"
      style={{ width: size, height: size }}>
      {/* Outer tick ring */}
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * 2 * Math.PI;
          const r1 = size/2 - 6;
          const r2 = size/2 - (i % 5 === 0 ? 12 : 9);
          const x1 = size/2 + r1 * Math.cos(angle);
          const y1 = size/2 + r1 * Math.sin(angle);
          const x2 = size/2 + r2 * Math.cos(angle);
          const y2 = size/2 + r2 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={CK.rule2} strokeWidth={i % 5 === 0 ? 1 : 0.5}/>;
        })}
        {/* Progress arc */}
        <circle cx={size/2} cy={size/2} r={size/2 - 18} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={size/2 - 18} fill="none" stroke={tone} strokeWidth={4} strokeLinecap="square"
                strokeDasharray={2 * Math.PI * (size/2 - 18)}
                strokeDashoffset={2 * Math.PI * (size/2 - 18) * (1 - progress)}/>
      </svg>
      {/* Corner brackets */}
      <div className="absolute inset-4">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: held ? tone : CK.rule2 }}/>
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: held ? tone : CK.rule2 }}/>
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: held ? tone : CK.rule2 }}/>
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: held ? tone : CK.rule2 }}/>
      </div>
      {/* Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        {committed ? (
          <>
            <span className="text-[10px] tracking-[0.22em]" style={{ color: CK.ok }}>● CONFIRMED</span>
            <span className="ck-num text-xl" style={{ color: CK.ok }}>{TK.fmtShort(new Date()).toUpperCase()}</span>
          </>
        ) : (
          <>
            <span className="text-[10px] tracking-[0.22em]" style={{ color: held ? tone : CK.dim }}>
              {held ? "HOLD..." : "HOLD TO CONFIRM"}
            </span>
            <span className="font-light mt-1" style={{
              fontFamily: "'IBM Plex Sans Condensed', sans-serif",
              fontSize: 28, letterSpacing: "-0.02em",
              color: held ? CK.text : CK.text,
            }}>{label}</span>
            {sublabel && <span className="text-[9px] tracking-[0.2em]" style={{ color: CK.dim }}>{sublabel}</span>}
          </>
        )}
      </div>
    </button>
  );
}

Object.assign(window, { CKLoginView, CKHoldPunch });
