/* Utilities — kept after old theme dropped. */

const cx = (...xs) => xs.filter(Boolean).join(" ");

// Avatar monogram — used across admin tables, detail pages.
const Avatar = ({ name, size = 32, color = "#2a2824", mono = false }) => (
  <div className="inline-flex items-center justify-center font-medium"
       style={{ width: size, height: size, background: mono ? "transparent" : color,
                border: mono ? `1px solid ${CK.rule2}` : "none",
                color: mono ? CK.text : "#e8e6df",
                fontSize: size * 0.36, letterSpacing: "0.1em",
                fontFamily: "'IBM Plex Mono', monospace" }}>
    {(name || "").split(" ").map(s => s[0]).slice(0, 2).join("")}
  </div>
);

// Inline sparkline — used in KPI cards.
const Spark = ({ values, color, height = 20, width = 64 }) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color || "#8a857a"} strokeWidth="1" strokeLinecap="square"/>
    </svg>
  );
};

// Ring — circular progress, used for countdowns.
const Ring = ({ progress = 0, size = 120, stroke = 6, color, track, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track || "rgba(255,255,255,0.08)"} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color || "#e8e6df"} strokeWidth={stroke}
                strokeDasharray={c} strokeDashoffset={off}
                style={{ transition: "stroke-dashoffset .4s linear" }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

// Live clock hook — ticks every second.
function useLiveNow(startAt) {
  const [now, setNow] = React.useState(() => startAt ? new Date(startAt.getTime()) : new Date());
  React.useEffect(() => {
    const id = setInterval(() => {
      setNow(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

Object.assign(window, { cx, Avatar, Spark, Ring, useLiveNow });
