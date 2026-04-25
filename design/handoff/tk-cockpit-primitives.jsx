/* ═══════════════════════════════════════════════════════════════
   COCKPIT — instrument-panel aesthetic
   Black background, IBM Plex Mono throughout, hairline rules,
   tick-mark gauges, ALL CAPS labels, monochrome with one alarm color.
   No rounded cards. Sharp 90° corners. Data is the hero.
   ═══════════════════════════════════════════════════════════════ */

const CK = {
  // Tokens
  bg: "#000000",
  surface: "#0a0a0a",
  rule: "rgba(255,255,255,0.10)",
  rule2: "rgba(255,255,255,0.18)",
  text: "#e8e6df",     // warm off-white
  dim: "#8a857a",
  fade: "#3a3833",
  amber: "#ffb000",    // cockpit amber — the ONE accent
  alarm: "#ff3b3b",    // alarm red, used sparingly
  ok: "#69d27c",       // muted CRT green
};

const ckClass = "ck";

// Inject cockpit-specific CSS once
(function injectCockpitCSS() {
  if (document.getElementById("ck-style")) return;
  const s = document.createElement("style"); s.id = "ck-style";
  s.textContent = `
    .${ckClass}, .${ckClass} * { font-family: 'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace !important; letter-spacing: 0; }
    .${ckClass} .ck-display { font-family: 'IBM Plex Sans', 'Inter Tight', sans-serif !important; letter-spacing: -0.02em; }
    .${ckClass} { background: ${CK.bg}; color: ${CK.text}; }
    .ck-grid {
      background-image:
        linear-gradient(${CK.rule} 1px, transparent 1px),
        linear-gradient(90deg, ${CK.rule} 1px, transparent 1px);
      background-size: 32px 32px;
      background-position: -1px -1px;
    }
    .ck-vignette { background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%); }
    .ck-scan::before {
      content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .035;
      background: repeating-linear-gradient(0deg, rgba(255,255,255,.6) 0 1px, transparent 1px 3px);
    }
    .ck-rule { border-color: ${CK.rule}; }
    .ck-rule2 { border-color: ${CK.rule2}; }
    @keyframes ck-blink { 0%,49% {opacity:1;} 50%,100% {opacity:0;} }
    .ck-blink { animation: ck-blink 1s steps(1) infinite; }
    @keyframes ck-tick { from { transform: translateY(0);} to { transform: translateY(-100%);} }
    .ck-marquee { animation: ck-tick 60s linear infinite; }
    @keyframes ck-flash { 0%,100% { background: rgba(255,59,59,0); } 50% { background: rgba(255,59,59,0.12); } }
    .ck-flash { animation: ck-flash 1.4s ease-in-out infinite; }
    .${ckClass} .ck-corners { position: relative; }
    .${ckClass} .ck-corners::before, .${ckClass} .ck-corners::after { content:""; position:absolute; width:8px; height:8px; border-color: ${CK.text}; }
    .${ckClass} .ck-corners::before { top:-1px; left:-1px; border-top:1px solid; border-left:1px solid; }
    .${ckClass} .ck-corners::after { bottom:-1px; right:-1px; border-bottom:1px solid; border-right:1px solid; }
    .ck-num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum","zero"; }
  `;
  document.head.appendChild(s);
  // Load IBM Plex
  const link = document.createElement("link"); link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@300;500;700&display=swap";
  document.head.appendChild(link);
})();

// ── Atomic primitives ───────────────────────────────────────

const CKLabel = ({ children, className = "", tone = "dim" }) => (
  <div className={cx("text-[10px] uppercase font-medium", tone === "dim" ? "text-[color:var(--ck-dim)]" : "text-[color:var(--ck-text)]", className)}
       style={{ color: tone === "dim" ? CK.dim : tone === "amber" ? CK.amber : tone === "alarm" ? CK.alarm : CK.text, letterSpacing: "0.18em" }}>
    {children}
  </div>
);

const CKValue = ({ children, size = "md", tone = "text" }) => {
  const sizes = { sm: "text-sm", md: "text-xl", lg: "text-3xl", xl: "text-5xl" };
  const colors = { text: CK.text, amber: CK.amber, alarm: CK.alarm, ok: CK.ok, dim: CK.dim };
  return <div className={cx("ck-num font-medium", sizes[size])} style={{ color: colors[tone] }}>{children}</div>;
};

// Bordered "panel" — no rounding. Optional corner brackets.
const CKPanel = ({ children, className = "", corners = false, label, value, accent }) => (
  <div className={cx("relative border", corners && "ck-corners", className)}
       style={{ borderColor: CK.rule, background: CK.surface }}>
    {(label || value) && (
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: CK.rule }}>
        {label && <CKLabel>{label}</CKLabel>}
        {value && <span className="text-[10px] ck-num" style={{ color: accent || CK.dim, letterSpacing: "0.1em" }}>{value}</span>}
      </div>
    )}
    {children}
  </div>
);

// Status pill — square, no radius
const CKChip = ({ children, tone = "dim" }) => {
  const colors = { dim: CK.dim, text: CK.text, amber: CK.amber, alarm: CK.alarm, ok: CK.ok };
  const c = colors[tone];
  return (
    <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-medium uppercase border"
          style={{ borderColor: c, color: c, letterSpacing: "0.14em" }}>
      {children}
    </span>
  );
};

// Square button
const CKBtn = ({ children, onClick, variant = "ghost", size = "md", className = "", disabled }) => {
  const styles = {
    ghost:   { color: CK.text,  bg: "transparent",     border: CK.rule2 },
    primary: { color: CK.bg,    bg: CK.amber,          border: CK.amber },
    alarm:   { color: "#fff",   bg: CK.alarm,          border: CK.alarm },
    quiet:   { color: CK.dim,   bg: "transparent",     border: "transparent" },
  };
  const sizes = { sm: "h-7 px-2.5 text-[11px]", md: "h-9 px-3.5 text-xs", lg: "h-11 px-4 text-sm" };
  const s = styles[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={cx("inline-flex items-center justify-center gap-2 uppercase font-medium border transition-colors disabled:opacity-40", sizes[size], className)}
      style={{ color: s.color, background: s.bg, borderColor: s.border, letterSpacing: "0.14em" }}>
      {children}
    </button>
  );
};

// ── The hero gauge: linear meal-period scale with tick marks ─────────────────
// Vertical (mobile) or horizontal (admin) — instrument-style with tickmarks.
function CKMealScale({ clockIn, now, lunchStart, lunchEnd, orientation = "vertical", height = 320 }) {
  if (!clockIn) return <div style={{ color: CK.dim }} className="text-xs">— NOT ON SHIFT —</div>;
  const totalHr = 8;
  const elapsedMin = TK.minsBetween(clockIn, now);
  const fivehrMin = 300;
  const fourhrMin = 240;
  const mealMin = lunchStart ? TK.minsBetween(clockIn, lunchStart) : null;
  const lunchEndMin = lunchEnd ? TK.minsBetween(clockIn, lunchEnd) : null;

  const overMeal = !mealMin && elapsedMin > fivehrMin;
  const ticks = [];
  for (let i = 0; i <= totalHr * 4; i++) {
    const min = i * 15;
    const major = i % 4 === 0;
    const half = i % 2 === 0;
    ticks.push({ min, major, half, hour: major ? i / 4 : null });
  }

  if (orientation === "vertical") {
    const pos = (m) => Math.min(1, m / (totalHr * 60)) * 100;
    return (
      <div className="relative" style={{ height, width: 80 }}>
        {/* Track */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: CK.rule2 }} />
        {/* Filled progress (worked) */}
        <div className="absolute left-1/2 -translate-x-1/2 w-1.5"
             style={{ top: 0, height: `${pos(elapsedMin)}%`, background: overMeal ? CK.alarm : elapsedMin > fivehrMin - 30 ? CK.amber : CK.text }} />
        {/* Ticks */}
        {ticks.map((t, i) => {
          const y = pos(t.min);
          return (
            <div key={i} className="absolute left-1/2 -translate-x-1/2 flex items-center" style={{ top: `${y}%`, transform: `translate(-50%, -50%)` }}>
              <span className="block" style={{ width: t.major ? 18 : t.half ? 12 : 6, height: 1, background: t.major ? CK.text : CK.rule2 }} />
              {t.major && <span className="absolute right-full pr-1.5 text-[10px] ck-num" style={{ color: CK.dim }}>{t.hour}H</span>}
            </div>
          );
        })}
        {/* 5-hour deadline marker */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${pos(fivehrMin)}%`, transform: "translateY(-50%)" }}>
          <div className="w-full h-px" style={{ background: overMeal ? CK.alarm : CK.amber, boxShadow: `0 0 6px ${overMeal ? CK.alarm : CK.amber}` }} />
          <div className="absolute left-full pl-2 text-[9px] uppercase ck-num font-medium whitespace-nowrap"
               style={{ color: overMeal ? CK.alarm : CK.amber, letterSpacing: "0.14em" }}>
            ▲ MEAL DUE
          </div>
        </div>
        {/* Lunch segment */}
        {mealMin && (
          <div className="absolute left-1/2 -translate-x-1/2 w-2 border-y border-x"
               style={{ top: `${pos(mealMin)}%`, height: `${pos((lunchEndMin || elapsedMin)) - pos(mealMin)}%`, borderColor: CK.amber, background: "rgba(255,176,0,0.15)" }} />
        )}
        {/* Now indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center" style={{ top: `${pos(elapsedMin)}%`, transform: "translate(-50%,-50%)" }}>
          <div className="w-4 h-4 border-2 ck-blink" style={{ borderColor: overMeal ? CK.alarm : CK.text, background: CK.bg }} />
        </div>
      </div>
    );
  }

  // Horizontal variant
  const pos = (m) => Math.min(1, m / (totalHr * 60)) * 100;
  return (
    <div className="relative w-full" style={{ height: 56 }}>
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px" style={{ background: CK.rule2 }} />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5" style={{ width: `${pos(elapsedMin)}%`, background: overMeal ? CK.alarm : CK.text }} />
      {ticks.map((t, i) => {
        const x = pos(t.min);
        return (
          <div key={i} className="absolute top-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: `${x}%`, transform: `translate(-50%, -50%)` }}>
            <span style={{ width: 1, height: t.major ? 12 : t.half ? 8 : 4, background: t.major ? CK.text : CK.rule2 }}/>
            {t.major && <span className="absolute top-full mt-0.5 text-[9px] ck-num" style={{ color: CK.dim }}>{t.hour}H</span>}
          </div>
        );
      })}
      <div className="absolute top-0 bottom-0 flex flex-col items-center justify-center" style={{ left: `${pos(fivehrMin)}%`, transform: "translateX(-50%)" }}>
        <div className="h-full w-px" style={{ background: overMeal ? CK.alarm : CK.amber, boxShadow: `0 0 4px ${overMeal ? CK.alarm : CK.amber}` }}/>
        <div className="absolute -top-3 text-[8px] uppercase ck-num font-bold" style={{ color: overMeal ? CK.alarm : CK.amber, letterSpacing: "0.14em" }}>MEAL</div>
      </div>
      {mealMin && (
        <div className="absolute top-1/2 -translate-y-1/2 h-3 border-y border-x"
             style={{ left: `${pos(mealMin)}%`, width: `${pos((lunchEndMin || elapsedMin)) - pos(mealMin)}%`, borderColor: CK.amber, background: "rgba(255,176,0,0.15)" }}/>
      )}
      <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 ck-blink" style={{ left: `${pos(elapsedMin)}%`, borderColor: overMeal ? CK.alarm : CK.text, background: CK.bg }}/>
    </div>
  );
}

// Big segmented digital readout (HH:MM:SS style)
function CKDigit({ value, size = 56, tone = "text" }) {
  const colors = { text: CK.text, amber: CK.amber, alarm: CK.alarm, ok: CK.ok };
  return (
    <div className="ck-num leading-none font-light" style={{ fontSize: size, color: colors[tone], fontFamily: "'IBM Plex Sans Condensed', sans-serif", letterSpacing: "-0.04em" }}>
      {value}
    </div>
  );
}

Object.assign(window, { CK, CKLabel, CKValue, CKPanel, CKChip, CKBtn, CKMealScale, CKDigit, ckClass });
