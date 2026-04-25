/* Mock data + state engine. Three scenarios match the Tweaks "state" option.
   Time model: everything is pegged to `now`, a mutable virtual wall clock starting at 1:47 PM.
   This lets the admin and employee views agree on a shared universe. */

const TK = (() => {
  // Virtual "today" — anchored so the scenario lands naturally
  const today = new Date();
  today.setHours(13, 47, 0, 0);

  const mkTime = (h, m) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Scenarios for the current employee (Maria Delgado) — used by the iOS view
  const scenarios = {
    compliant: {
      label: "On track",
      now: mkTime(13, 47),
      entries: [
        { type: "CLOCK_IN", at: mkTime(8, 2), note: "Clocked in — Geofence OK" },
        { type: "BREAK_ACK_1", at: mkTime(10, 14), note: "Rest break 1 taken" },
        { type: "LUNCH_START", at: mkTime(12, 30), note: "Lunch start" },
        { type: "LUNCH_END", at: mkTime(13, 4), note: "Lunch end — 34 min" },
      ],
      warning: null,
    },
    atRisk: {
      label: "Approaching 5-hour deadline",
      now: mkTime(12, 48),
      entries: [
        { type: "CLOCK_IN", at: mkTime(8, 2), note: "Clocked in — Geofence OK" },
        { type: "BREAK_ACK_1", at: mkTime(10, 14), note: "Rest break 1 taken" },
      ],
      warning: { stage: "stage2", minutesLeft: 14, copy: "Lunch required by 1:02 PM" },
    },
    violation: {
      label: "Past 5-hour deadline — waiver or premium",
      now: mkTime(13, 12),
      entries: [
        { type: "CLOCK_IN", at: mkTime(8, 2), note: "Clocked in — Geofence OK" },
        { type: "BREAK_ACK_1", at: mkTime(10, 14), note: "Rest break 1 taken" },
      ],
      warning: { stage: "stage3", minutesLeft: -10, copy: "Deadline passed. Take lunch now or sign waiver." },
    },
  };

  // Team roster — used by admin compliance + entries views
  const team = [
    { id: "e01", name: "Maria Delgado",  role: "Line Cook",     crew: "Kitchen",   avatar: "M", color: "#ef4444", state: "working", in: mkTime(8,2),   elapsed: "5h 45m", lunch: null, break1: mkTime(10,14), risk: "high",  flags: ["Lunch overdue","No waiver"] },
    { id: "e02", name: "Javier Ruiz",    role: "Prep Cook",     crew: "Kitchen",   avatar: "J", color: "#f59e0b", state: "lunch",   in: mkTime(7,45),  elapsed: "4h 32m", lunch: { start: mkTime(12,15) }, break1: mkTime(10,0), risk: "low",  flags: [] },
    { id: "e03", name: "Priya Shah",     role: "Server",        crew: "Front",     avatar: "P", color: "#0ea5e9", state: "working", in: mkTime(10,30), elapsed: "3h 17m", lunch: null, break1: null,          risk: "medium", flags: ["Break 1 due in 12 min"] },
    { id: "e04", name: "Marcus Lee",     role: "Barista",       crew: "Front",     avatar: "M", color: "#8b5cf6", state: "working", in: mkTime(9,0),   elapsed: "4h 47m", lunch: null, break1: mkTime(11,3),  risk: "medium",flags: ["Lunch due in 13 min"] },
    { id: "e05", name: "Tanya Okafor",   role: "Shift Lead",    crew: "Front",     avatar: "T", color: "#22c55e", state: "working", in: mkTime(8,15),  elapsed: "5h 32m", lunch: { start: mkTime(12,10), end: mkTime(12,48) }, break1: mkTime(10,22), risk: "low",  flags: [] },
    { id: "e06", name: "Dev Patel",      role: "Dishwasher",    crew: "Kitchen",   avatar: "D", color: "#06b6d4", state: "working", in: mkTime(10,0),  elapsed: "3h 47m", lunch: null, break1: null,          risk: "low",   flags: [] },
    { id: "e07", name: "Sana Khalil",    role: "Host",          crew: "Front",     avatar: "S", color: "#ec4899", state: "break",   in: mkTime(9,30),  elapsed: "4h 17m", lunch: null, break1: null,          risk: "low",   flags: [] },
    { id: "e08", name: "Reed Thompson",  role: "Line Cook",     crew: "Kitchen",   avatar: "R", color: "#14b8a6", state: "off",     in: null,          elapsed: "—",       lunch: null, break1: null,          risk: "low",   flags: [] },
    { id: "e09", name: "Omar Haddad",    role: "Grill",         crew: "Kitchen",   avatar: "O", color: "#eab308", state: "working", in: mkTime(11,0),  elapsed: "2h 47m", lunch: null, break1: null,          risk: "low",   flags: [] },
    { id: "e10", name: "Lena Bauer",     role: "Pastry",        crew: "Kitchen",   avatar: "L", color: "#f472b6", state: "working", in: mkTime(6,30),  elapsed: "7h 17m", lunch: { start: mkTime(11,0), end: mkTime(11,31) }, break1: mkTime(8,48), risk: "high", flags: ["Short lunch — 31 min (under 30 min floor met)","2nd meal required by 2:30 PM"] },
    { id: "e11", name: "Kenji Sato",     role: "Server",        crew: "Front",     avatar: "K", color: "#84cc16", state: "clocked_out", in: mkTime(6,0), elapsed: "6h 30m", lunch: { start: mkTime(10,0), end: mkTime(10,32) }, break1: mkTime(8,4), risk: "low", flags: ["Pending certification"] },
    { id: "e12", name: "Aisha Nouri",    role: "Line Cook",     crew: "Kitchen",   avatar: "A", color: "#a855f7", state: "working", in: mkTime(9,30),  elapsed: "4h 17m", lunch: null, break1: mkTime(11,45), risk: "low",   flags: [] },
  ];

  // Violations in the last 7 days
  const violations = [
    { id: "v01", date: "Apr 23", emp: "Maria Delgado", type: "Meal period missed", desc: "No lunch recorded, no waiver on file. Premium pay owed.", severity: "high", resolved: false, premium: "$18.75" },
    { id: "v02", date: "Apr 23", emp: "Lena Bauer",    type: "Second meal required", desc: "Shift > 10 hours without second meal period.", severity: "high", resolved: false, premium: "$22.40" },
    { id: "v03", date: "Apr 22", emp: "Marcus Lee",    type: "Late meal period", desc: "Lunch taken at 5h 18m (>5h cutoff).",                 severity: "medium", resolved: true,  premium: "$16.50" },
    { id: "v04", date: "Apr 22", emp: "Priya Shah",    type: "Rest break missed", desc: "No rest break recorded in first 4-hour block.",          severity: "medium", resolved: true,  premium: "$16.50" },
    { id: "v05", date: "Apr 21", emp: "Javier Ruiz",   type: "Short meal period", desc: "Lunch duration 24 min (< 30 min floor).",                severity: "high",   resolved: false, premium: "$18.00" },
    { id: "v06", date: "Apr 20", emp: "Reed Thompson", type: "7th consecutive day", desc: "Worked 7 consecutive days without 24-hr rest.",       severity: "medium", resolved: true,  premium: "$42.00" },
  ];

  // Today’s alerts
  const alerts = [
    { id: "a01", emp: "Maria Delgado", severity: "high",   msg: "Meal period deadline passed at 1:02 PM — no waiver on file", time: "10 min ago" },
    { id: "a02", emp: "Priya Shah",    severity: "medium", msg: "Rest break 1 approaching — due in 12 minutes",                time: "2 min ago" },
    { id: "a03", emp: "Marcus Lee",    severity: "medium", msg: "Meal period due in 13 minutes",                                time: "just now" },
    { id: "a04", emp: "Lena Bauer",    severity: "high",   msg: "Second meal period required — shift exceeds 10 hours at 2:30 PM", time: "5 min ago" },
  ];

  // Today's time entries across team (for admin entries table)
  const entries = [
    { id: "t01", emp: "Lena Bauer",    type: "CLOCK_IN",   at: mkTime(6,30), geofence: "OK",  source: "Mobile" },
    { id: "t02", emp: "Kenji Sato",    type: "CLOCK_IN",   at: mkTime(6,0),  geofence: "OK",  source: "Kiosk" },
    { id: "t03", emp: "Javier Ruiz",   type: "CLOCK_IN",   at: mkTime(7,45), geofence: "OK",  source: "Mobile" },
    { id: "t04", emp: "Maria Delgado", type: "CLOCK_IN",   at: mkTime(8,2),  geofence: "OK",  source: "Mobile" },
    { id: "t05", emp: "Tanya Okafor",  type: "CLOCK_IN",   at: mkTime(8,15), geofence: "OK",  source: "Kiosk" },
    { id: "t06", emp: "Lena Bauer",    type: "BREAK_ACK_1",at: mkTime(8,48), geofence: "—",   source: "Mobile" },
    { id: "t07", emp: "Marcus Lee",    type: "CLOCK_IN",   at: mkTime(9,0),  geofence: "OK",  source: "Mobile" },
    { id: "t08", emp: "Aisha Nouri",   type: "CLOCK_IN",   at: mkTime(9,30), geofence: "OK",  source: "Mobile" },
    { id: "t09", emp: "Sana Khalil",   type: "CLOCK_IN",   at: mkTime(9,30), geofence: "OK",  source: "Mobile" },
    { id: "t10", emp: "Priya Shah",    type: "CLOCK_IN",   at: mkTime(10,30),geofence: "OK",  source: "Kiosk" },
    { id: "t11", emp: "Dev Patel",     type: "CLOCK_IN",   at: mkTime(10,0), geofence: "OK",  source: "Mobile" },
    { id: "t12", emp: "Maria Delgado", type: "BREAK_ACK_1",at: mkTime(10,14),geofence: "—",   source: "Mobile" },
    { id: "t13", emp: "Tanya Okafor",  type: "BREAK_ACK_1",at: mkTime(10,22),geofence: "—",   source: "Mobile" },
    { id: "t14", emp: "Lena Bauer",    type: "LUNCH_START",at: mkTime(11,0), geofence: "OK",  source: "Mobile" },
    { id: "t15", emp: "Marcus Lee",    type: "BREAK_ACK_1",at: mkTime(11,3), geofence: "—",   source: "Mobile" },
    { id: "t16", emp: "Lena Bauer",    type: "LUNCH_END",  at: mkTime(11,31),geofence: "OK",  source: "Mobile",  flag: "short-lunch" },
    { id: "t17", emp: "Aisha Nouri",   type: "BREAK_ACK_1",at: mkTime(11,45),geofence: "—",   source: "Mobile" },
    { id: "t18", emp: "Tanya Okafor",  type: "LUNCH_START",at: mkTime(12,10),geofence: "OK",  source: "Mobile" },
    { id: "t19", emp: "Javier Ruiz",   type: "LUNCH_START",at: mkTime(12,15),geofence: "OK",  source: "Mobile" },
    { id: "t20", emp: "Maria Delgado", type: "LUNCH_START",at: mkTime(12,30),geofence: "OK",  source: "Mobile" },
    { id: "t21", emp: "Tanya Okafor",  type: "LUNCH_END",  at: mkTime(12,48),geofence: "OK",  source: "Mobile" },
    { id: "t22", emp: "Maria Delgado", type: "LUNCH_END",  at: mkTime(13,4), geofence: "OK",  source: "Mobile",  flag: "short-lunch" },
  ];

  // KPI rollups
  const kpi = {
    employees: 42,
    clockedIn: 9,
    onLunch: 2,
    onBreak: 1,
    violationsToday: 2,
    waiversToday: 1,
    attestationsToday: 3,
    pendingCerts: 4,
    exposure: 41.15, // dollars of premium pay at risk
    streak: 12, // days without high-severity violations — reset by v01/v02 today
    complianceRate: 97.4,
  };

  const fmtTime = (d) => {
    if (!d) return "—";
    let h = d.getHours(); const m = d.getMinutes();
    const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return `${h}:${String(m).padStart(2,"0")} ${ap}`;
  };
  const fmtShort = (d) => {
    if (!d) return "—";
    let h = d.getHours(); const m = d.getMinutes();
    const ap = h >= 12 ? "p" : "a"; h = h % 12 || 12;
    return `${h}:${String(m).padStart(2,"0")}${ap}`;
  };
  const minsBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));

  // ── Employee profile (Maria) — for Profile / Pay / Shift History screens ──
  const me = {
    id: "EMP-2418",
    name: "Maria Delgado",
    role: "Line Cook",
    crew: "Kitchen",
    site: "Oak-Kit Acme Kitchen",
    shiftZone: "ZONE 3",
    hireDate: "Nov 14, 2022",
    payRate: 24.50,
    pin: "••••",
    phone: "(510) 555-0194",
    nextShift: { day: "TUE APR 30", start: mkTime(8, 0), end: mkTime(16, 0) },
  };

  // ── Shift history: this week + last week ──
  const shifts = [
    { date: "MON APR 21", in: "08:00", out: "16:04", worked: "8h 04m", meal: "12:30–13:04 (34m)", break: "10:14", status: "clean",     premium: null },
    { date: "TUE APR 22", in: "08:02", out: "16:18", worked: "8h 16m", meal: "13:18–13:49 (31m)", break: "10:22", status: "short_meal", premium: "$0.00" },
    { date: "WED APR 23", in: "08:02", out: "—",     worked: "5h 45m", meal: "—",                 break: "10:14", status: "violation", premium: "$24.50" },
    { date: "THU APR 24", in: "—",     out: "—",     worked: "—",      meal: "—",                 break: "—",     status: "off",       premium: null },
    { date: "FRI APR 25", in: "—",     out: "—",     worked: "—",      meal: "—",                 break: "—",     status: "scheduled", premium: null },
    { date: "SAT APR 26", in: "—",     out: "—",     worked: "—",      meal: "—",                 break: "—",     status: "scheduled", premium: null },
    { date: "SUN APR 27", in: "—",     out: "—",     worked: "—",      meal: "—",                 break: "—",     status: "off",       premium: null },
  ];

  // ── Current pay period ──
  const payPeriod = {
    label: "APR 14 – APR 27",
    payDate: "MAY 02",
    regHours: 38.25,
    otHours: 2.5,
    premiumPay: 24.50,
    gross: 1076.63,
    ytd: 8412.08,
    lines: [
      { code: "REG",  desc: "Regular hours",          hrs: "38.25", rate: "$24.50", amt: 937.13 },
      { code: "OT",   desc: "Overtime @ 1.5x",         hrs: "2.50",  rate: "$36.75", amt: 91.88 },
      { code: "PREM", desc: "Meal period premium",     hrs: "1.00",  rate: "$24.50", amt: 24.50 },
      { code: "REST", desc: "Paid rest break",         hrs: "0.67",  rate: "included", amt: 0 },
    ],
  };

  // ── Time-off request reasons ──
  const timeOffBalances = { vacation: 32, sick: 16, personal: 4 };

  // ── Schedule: week grid (7 days × employees) ──
  const scheduleWeek = [
    { day: "MON", date: "APR 28", cells: [
      ["Maria Delgado",  "08–16", "KT"], ["Javier Ruiz", "07–15", "KT"], ["Lena Bauer", "06–14", "KT"],
      ["Priya Shah", "10–18", "FR"], ["Tanya Okafor", "09–17", "FR"],
    ]},
    { day: "TUE", date: "APR 29", cells: [
      ["Maria Delgado",  "08–16", "KT"], ["Javier Ruiz", "07–15", "KT"], ["Dev Patel", "10–18", "KT"],
      ["Marcus Lee", "09–17", "FR"], ["Sana Khalil", "09–17", "FR"], ["Aisha Nouri", "09–17", "KT"],
    ]},
    { day: "WED", date: "APR 30", cells: [
      ["Maria Delgado",  "08–16", "KT"], ["Lena Bauer", "06–14", "KT"], ["Omar Haddad", "11–19", "KT"],
      ["Priya Shah", "10–18", "FR"], ["Tanya Okafor", "09–17", "FR"], ["Kenji Sato", "10–18", "FR"],
    ]},
    { day: "THU", date: "MAY 01", cells: [
      ["Javier Ruiz", "07–15", "KT"], ["Dev Patel", "10–18", "KT"], ["Aisha Nouri", "09–17", "KT"],
      ["Marcus Lee", "09–17", "FR"], ["Sana Khalil", "09–17", "FR"],
    ]},
    { day: "FRI", date: "MAY 02", cells: [
      ["Maria Delgado",  "10–18", "KT"], ["Lena Bauer", "06–14", "KT"], ["Omar Haddad", "11–19", "KT"],
      ["Priya Shah", "10–18", "FR"], ["Tanya Okafor", "09–17", "FR"], ["Kenji Sato", "10–18", "FR"],
    ]},
    { day: "SAT", date: "MAY 03", cells: [
      ["Javier Ruiz", "08–16", "KT"], ["Dev Patel", "10–18", "KT"], ["Omar Haddad", "11–23", "KT"],
      ["Marcus Lee", "10–22", "FR"], ["Sana Khalil", "10–22", "FR"], ["Kenji Sato", "10–22", "FR"],
    ]},
    { day: "SUN", date: "MAY 04", cells: [
      ["Lena Bauer", "06–14", "KT"], ["Aisha Nouri", "09–17", "KT"],
      ["Tanya Okafor", "10–18", "FR"], ["Sana Khalil", "10–18", "FR"],
    ]},
  ];

  // ── Audit log — immutable event stream ──
  const audit = [
    { at: "13:47:02", actor: "SYSTEM",         action: "ALARM RAISED",      target: "EMP-2418 · MARIA DELGADO", meta: "meal overdue +10m",          level: "high" },
    { at: "13:46:15", actor: "SYSTEM",         action: "ADVISORY",          target: "EMP-2415 · MARCUS LEE",    meta: "meal due in 13m",            level: "med"  },
    { at: "13:42:08", actor: "EMP-2420",       action: "PUNCH",             target: "LUNCH_END",                meta: "geo OK · 38m duration",       level: "info" },
    { at: "13:30:04", actor: "EMP-2418",       action: "PUNCH",             target: "LUNCH_START",              meta: "geo OK",                      level: "info" },
    { at: "13:04:11", actor: "EMP-2418",       action: "PUNCH",             target: "LUNCH_END",                meta: "geo OK · 34m duration",       level: "info" },
    { at: "12:48:00", actor: "EMP-2420",       action: "PUNCH",             target: "LUNCH_START",              meta: "geo OK",                      level: "info" },
    { at: "12:30:21", actor: "EMP-2418",       action: "PUNCH",             target: "LUNCH_START",              meta: "geo OK",                      level: "info" },
    { at: "12:15:09", actor: "EMP-2419",       action: "PUNCH",             target: "LUNCH_START",              meta: "geo OK",                      level: "info" },
    { at: "11:45:33", actor: "EMP-2427",       action: "PUNCH",             target: "BREAK_ACK_1",              meta: "rest break 1",                level: "info" },
    { at: "11:31:00", actor: "EMP-2422",       action: "PUNCH",             target: "LUNCH_END",                meta: "⚠ short meal · 31m",          level: "med"  },
    { at: "11:03:14", actor: "EMP-2415",       action: "PUNCH",             target: "BREAK_ACK_1",              meta: "rest break 1",                level: "info" },
    { at: "11:00:20", actor: "EMP-2422",       action: "PUNCH",             target: "LUNCH_START",              meta: "geo OK",                      level: "info" },
    { at: "10:30:00", actor: "EMP-2411",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "kiosk KSK-03",                level: "info" },
    { at: "10:22:08", actor: "EMP-2420",       action: "PUNCH",             target: "BREAK_ACK_1",              meta: "rest break 1",                level: "info" },
    { at: "10:15:00", actor: "A.KIM",          action: "RESOLVED VIOLATION", target: "V-04 · P.SHAH",            meta: "premium paid · $16.50",       level: "high" },
    { at: "10:14:55", actor: "EMP-2418",       action: "PUNCH",             target: "BREAK_ACK_1",              meta: "rest break 1",                level: "info" },
    { at: "10:00:00", actor: "EMP-2414",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "mobile",                      level: "info" },
    { at: "09:30:00", actor: "EMP-2427",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "mobile",                      level: "info" },
    { at: "09:12:44", actor: "A.KIM",          action: "POLICY EDITED",     target: "RULE-ML-005",              meta: "meal floor 30→31 rejected",   level: "med"  },
    { at: "09:00:00", actor: "EMP-2415",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "mobile",                      level: "info" },
    { at: "08:48:00", actor: "EMP-2422",       action: "PUNCH",             target: "BREAK_ACK_1",              meta: "rest break 1",                level: "info" },
    { at: "08:15:00", actor: "EMP-2420",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "kiosk KSK-01",                level: "info" },
    { at: "08:02:00", actor: "EMP-2418",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "mobile · geo OK",             level: "info" },
    { at: "07:45:00", actor: "EMP-2419",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "mobile",                      level: "info" },
    { at: "07:14:00", actor: "SYSTEM",         action: "SCHEDULE PUBLISHED", target: "WEEK 18 · 12 EMPLOYEES",   meta: "by A.KIM",                    level: "info" },
    { at: "06:30:00", actor: "EMP-2422",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "mobile",                      level: "info" },
    { at: "06:00:00", actor: "EMP-2423",       action: "PUNCH",             target: "CLOCK_IN",                 meta: "kiosk KSK-01",                level: "info" },
  ];

  // ── Settings: policy rules ──
  const rules = [
    { code: "ML-001", label: "First meal period required by",     value: "5h 00m into shift",  mandatory: true },
    { code: "ML-002", label: "Minimum meal duration",              value: "30 minutes",          mandatory: true },
    { code: "ML-003", label: "Meal waivable if shift ≤",           value: "6 hours",             mandatory: true },
    { code: "ML-004", label: "Second meal required after",         value: "10 hours worked",     mandatory: true },
    { code: "RB-001", label: "Rest break required per",            value: "4 hours (major frac)",mandatory: true },
    { code: "RB-002", label: "Rest break duration",                 value: "10 minutes paid",    mandatory: true },
    { code: "OT-001", label: "Daily overtime threshold",            value: "8 hours",             mandatory: true },
    { code: "OT-002", label: "Double-time threshold",               value: "12 hours",            mandatory: true },
    { code: "GEO-01", label: "Geofence radius",                     value: "100 meters",          mandatory: false },
    { code: "GEO-02", label: "Out-of-fence allowed with approval",  value: "enabled",             mandatory: false },
    { code: "PR-001", label: "Premium pay rate",                    value: "1 hour @ regular",    mandatory: true },
    { code: "SIGN-01",label: "E-signature on waiver",               value: "required",            mandatory: true },
  ];

  const entryLabel = (t) => ({
    CLOCK_IN: "Clocked in",
    CLOCK_OUT: "Clocked out",
    LUNCH_START: "Lunch start",
    LUNCH_END: "Lunch end",
    BREAK_ACK_1: "Rest break 1",
    BREAK_ACK_2: "Rest break 2",
    BREAK_ACK_3: "Rest break 3",
  })[t] || t;

  return { today, mkTime, scenarios, team, violations, alerts, entries, kpi, me, shifts, payPeriod, timeOffBalances, scheduleWeek, audit, rules, fmtTime, fmtShort, minsBetween, entryLabel };
})();

window.TK = TK;
