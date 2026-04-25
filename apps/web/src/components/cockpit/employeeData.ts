/**
 * Cockpit employee mock data — TS port of `TK.{me,shifts,payPeriod,timeOffBalances}`
 * from `design/handoff/tk-data.jsx`.
 *
 * Used by the Login / ShiftHistory / Pay / TimeOff / Profile cockpit screens.
 * Will be replaced by TanStack Query hooks against the real APIs in P1.5.
 */
const mkTime = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export interface CKEmployeeMe {
  id: string;
  name: string;
  role: string;
  crew: string;
  site: string;
  shiftZone: string;
  hireDate: string;
  payRate: number;
  pin: string;
  phone: string;
  nextShift: { day: string; start: Date; end: Date };
}

export const ME: CKEmployeeMe = {
  id: 'EMP-2418',
  name: 'Maria Delgado',
  role: 'Line Cook',
  crew: 'Kitchen',
  site: 'Oak-Kit Acme Kitchen',
  shiftZone: 'ZONE 3',
  hireDate: 'Nov 14, 2022',
  payRate: 24.5,
  pin: '••••',
  phone: '(510) 555-0194',
  nextShift: { day: 'TUE APR 30', start: mkTime(8, 0), end: mkTime(16, 0) },
};

export type CKShiftStatus =
  | 'clean'
  | 'short_meal'
  | 'violation'
  | 'off'
  | 'scheduled';

export interface CKShiftRecord {
  date: string;
  in: string;
  out: string;
  worked: string;
  meal: string;
  break: string;
  status: CKShiftStatus;
  premium: string | null;
}

export const SHIFTS: CKShiftRecord[] = [
  { date: 'MON APR 21', in: '08:00', out: '16:04', worked: '8h 04m', meal: '12:30–13:04 (34m)', break: '10:14', status: 'clean', premium: null },
  { date: 'TUE APR 22', in: '08:02', out: '16:18', worked: '8h 16m', meal: '13:18–13:49 (31m)', break: '10:22', status: 'short_meal', premium: '$0.00' },
  { date: 'WED APR 23', in: '08:02', out: '—', worked: '5h 45m', meal: '—', break: '10:14', status: 'violation', premium: '$24.50' },
  { date: 'THU APR 24', in: '—', out: '—', worked: '—', meal: '—', break: '—', status: 'off', premium: null },
  { date: 'FRI APR 25', in: '—', out: '—', worked: '—', meal: '—', break: '—', status: 'scheduled', premium: null },
  { date: 'SAT APR 26', in: '—', out: '—', worked: '—', meal: '—', break: '—', status: 'scheduled', premium: null },
  { date: 'SUN APR 27', in: '—', out: '—', worked: '—', meal: '—', break: '—', status: 'off', premium: null },
];

export interface CKPayLine {
  code: string;
  desc: string;
  hrs: string;
  rate: string;
  amt: number;
}

export interface CKPayPeriod {
  label: string;
  payDate: string;
  regHours: number;
  otHours: number;
  premiumPay: number;
  gross: number;
  ytd: number;
  lines: CKPayLine[];
}

export const PAY_PERIOD: CKPayPeriod = {
  label: 'APR 14 – APR 27',
  payDate: 'MAY 02',
  regHours: 38.25,
  otHours: 2.5,
  premiumPay: 24.5,
  gross: 1076.63,
  ytd: 8412.08,
  lines: [
    { code: 'REG', desc: 'Regular hours', hrs: '38.25', rate: '$24.50', amt: 937.13 },
    { code: 'OT', desc: 'Overtime @ 1.5x', hrs: '2.50', rate: '$36.75', amt: 91.88 },
    { code: 'PREM', desc: 'Meal period premium', hrs: '1.00', rate: '$24.50', amt: 24.5 },
    { code: 'REST', desc: 'Paid rest break', hrs: '0.67', rate: 'included', amt: 0 },
  ],
};

export interface CKTimeOffBalances {
  vacation: number;
  sick: number;
  personal: number;
}

export const TIME_OFF_BALANCES: CKTimeOffBalances = {
  vacation: 32,
  sick: 16,
  personal: 4,
};
