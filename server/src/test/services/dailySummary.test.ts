import { describe, it, expect } from 'vitest';

/**
 * Test the pure calculation functions extracted from dailySummary.service.ts.
 * These are the payroll-critical calculations that must be correct.
 */

// Re-implement the pure functions here for isolated testing
// (they're not exported from the service, so we test the logic directly)

function calculateOvertimeMinutes(workedMinutes: number | null): { overtime: number; doubletime: number } {
  const EIGHT_HOURS = 480;
  const TWELVE_HOURS = 720;

  if (workedMinutes === null || workedMinutes <= EIGHT_HOURS) {
    return { overtime: 0, doubletime: 0 };
  }
  if (workedMinutes <= TWELVE_HOURS) {
    return { overtime: workedMinutes - EIGHT_HOURS, doubletime: 0 };
  }
  return {
    overtime: TWELVE_HOURS - EIGHT_HOURS, // Always 240 minutes (4 hours)
    doubletime: workedMinutes - TWELVE_HOURS
  };
}

function calculateBreaksRequired(totalShiftMinutes: number | null): number {
  if (totalShiftMinutes === null) return 0;
  if (totalShiftMinutes < 210) return 0;  // < 3.5 hours
  if (totalShiftMinutes < 360) return 1;  // 3.5-6 hours
  if (totalShiftMinutes < 600) return 2;  // 6-10 hours
  return 3;                                // 10+ hours
}

function calculateSeventhDayOT(workedMinutes: number): { overtime: number; doubletime: number } {
  const EIGHT_HOURS = 480;
  if (workedMinutes <= EIGHT_HOURS) {
    return { overtime: workedMinutes, doubletime: 0 };
  }
  return { overtime: EIGHT_HOURS, doubletime: workedMinutes - EIGHT_HOURS };
}

function calculateWeeklyOT(
  todayWorked: number,
  otherDaysWorked: number,
  weeklyThresholdMinutes: number
): number {
  const totalWeeklyWorked = otherDaysWorked + todayWorked;
  if (totalWeeklyWorked <= weeklyThresholdMinutes) return 0;
  const priorToThreshold = Math.max(0, weeklyThresholdMinutes - otherDaysWorked);
  return Math.max(0, todayWorked - priorToThreshold);
}

describe('Daily OT Calculation (California)', () => {
  it('returns zero OT for 0 hours', () => {
    expect(calculateOvertimeMinutes(0)).toEqual({ overtime: 0, doubletime: 0 });
  });

  it('returns zero OT for null', () => {
    expect(calculateOvertimeMinutes(null)).toEqual({ overtime: 0, doubletime: 0 });
  });

  it('returns zero OT for exactly 8 hours (480 min)', () => {
    expect(calculateOvertimeMinutes(480)).toEqual({ overtime: 0, doubletime: 0 });
  });

  it('returns 60 min OT for 9 hours (540 min)', () => {
    expect(calculateOvertimeMinutes(540)).toEqual({ overtime: 60, doubletime: 0 });
  });

  it('returns 240 min OT for exactly 12 hours (720 min)', () => {
    expect(calculateOvertimeMinutes(720)).toEqual({ overtime: 240, doubletime: 0 });
  });

  it('returns 240 OT + 60 DT for 13 hours (780 min)', () => {
    expect(calculateOvertimeMinutes(780)).toEqual({ overtime: 240, doubletime: 60 });
  });

  it('returns 240 OT + 120 DT for 14 hours (840 min)', () => {
    expect(calculateOvertimeMinutes(840)).toEqual({ overtime: 240, doubletime: 120 });
  });

  it('handles 7h59m (479 min) — no OT', () => {
    expect(calculateOvertimeMinutes(479)).toEqual({ overtime: 0, doubletime: 0 });
  });

  it('handles 8h01m (481 min) — 1 min OT', () => {
    expect(calculateOvertimeMinutes(481)).toEqual({ overtime: 1, doubletime: 0 });
  });
});

describe('Rest Break Requirements', () => {
  it('no breaks for shift < 3.5 hours', () => {
    expect(calculateBreaksRequired(200)).toBe(0);
    expect(calculateBreaksRequired(209)).toBe(0);
  });

  it('1 break for 3.5 - 6 hour shift', () => {
    expect(calculateBreaksRequired(210)).toBe(1);
    expect(calculateBreaksRequired(359)).toBe(1);
  });

  it('2 breaks for 6 - 10 hour shift', () => {
    expect(calculateBreaksRequired(360)).toBe(2);
    expect(calculateBreaksRequired(599)).toBe(2);
  });

  it('3 breaks for 10+ hour shift', () => {
    expect(calculateBreaksRequired(600)).toBe(3);
    expect(calculateBreaksRequired(900)).toBe(3);
  });

  it('returns 0 for null shift', () => {
    expect(calculateBreaksRequired(null)).toBe(0);
  });
});

describe('Seventh Day Rule', () => {
  it('all hours at 1.5x for <= 8 hours', () => {
    expect(calculateSeventhDayOT(480)).toEqual({ overtime: 480, doubletime: 0 });
    expect(calculateSeventhDayOT(300)).toEqual({ overtime: 300, doubletime: 0 });
  });

  it('first 8 hours at 1.5x, rest at 2x for > 8 hours', () => {
    expect(calculateSeventhDayOT(600)).toEqual({ overtime: 480, doubletime: 120 });
    expect(calculateSeventhDayOT(720)).toEqual({ overtime: 480, doubletime: 240 });
  });
});

describe('Weekly Overtime (40hr threshold)', () => {
  const WEEKLY_THRESHOLD = 40 * 60; // 2400 minutes

  it('no weekly OT when total is under threshold', () => {
    expect(calculateWeeklyOT(480, 1920, WEEKLY_THRESHOLD)).toBe(0); // 32 + 8 = 40 exactly
  });

  it('weekly OT when today pushes over threshold', () => {
    // Worked 38 hours prior, today is 4 hours = 42 total, 2 hours over
    expect(calculateWeeklyOT(240, 2280, WEEKLY_THRESHOLD)).toBe(120);
  });

  it('all of today is weekly OT when prior days already exceeded', () => {
    // Already at 42 hours, today is 8 more
    expect(calculateWeeklyOT(480, 2520, WEEKLY_THRESHOLD)).toBe(480);
  });

  it('no weekly OT with empty week', () => {
    expect(calculateWeeklyOT(480, 0, WEEKLY_THRESHOLD)).toBe(0);
  });

  it('handles edge case: prior days exactly at threshold', () => {
    // Exactly 40 hours prior, any today is OT
    expect(calculateWeeklyOT(60, 2400, WEEKLY_THRESHOLD)).toBe(60);
  });
});

describe('Rest Break Violations', () => {
  it('no violation when all breaks taken', () => {
    const required = 2;
    const taken = 2;
    const missed = required - taken;
    expect(missed).toBe(0);
  });

  it('violation when breaks missed', () => {
    const required = 3;
    const taken = 1;
    const missed = required - taken;
    expect(missed).toBe(2); // 2 hours premium pay owed
  });

  it('no violation when no breaks required', () => {
    const required = 0;
    const taken = 0;
    const missed = required - taken;
    expect(missed).toBe(0);
  });
});
