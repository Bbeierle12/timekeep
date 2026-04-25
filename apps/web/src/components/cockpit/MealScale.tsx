/**
 * CKMealScale — instrument-style meal-period gauge.
 * Source: design/handoff/tk-cockpit-primitives.jsx
 *
 * Shows elapsed shift time against an 8-hour scale with 15-minute tick marks,
 * the 5-hour California meal-period deadline, and (if present) the recorded
 * lunch segment. Vertical orientation = mobile, horizontal = admin.
 */
import * as React from 'react';
import { CK } from './tokens';

export type MealScaleOrientation = 'vertical' | 'horizontal';

export interface MealScaleProps {
  /** Clock-in timestamp. If null, scale renders an "off shift" message. */
  clockIn: Date | null;
  /** Current wall-clock time (allows scenario/test injection). */
  now: Date;
  /** Lunch start, if recorded. */
  lunchStart?: Date | null;
  /** Lunch end, if recorded. */
  lunchEnd?: Date | null;
  orientation?: MealScaleOrientation;
  /** Vertical-only: pixel height. */
  height?: number;
}

const MS_PER_MIN = 60_000;
const minsBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / MS_PER_MIN);

interface Tick {
  min: number;
  major: boolean;
  half: boolean;
  hour: number | null;
}

function buildTicks(totalHours: number): Tick[] {
  const out: Tick[] = [];
  for (let i = 0; i <= totalHours * 4; i++) {
    const major = i % 4 === 0;
    out.push({
      min: i * 15,
      major,
      half: i % 2 === 0,
      hour: major ? i / 4 : null,
    });
  }
  return out;
}

export function MealScale({
  clockIn,
  now,
  lunchStart = null,
  lunchEnd = null,
  orientation = 'vertical',
  height = 320,
}: MealScaleProps) {
  if (!clockIn) {
    return (
      <div style={{ color: CK.dim }} className="text-xs">
        — NOT ON SHIFT —
      </div>
    );
  }

  const totalHr = 8;
  const elapsedMin = minsBetween(clockIn, now);
  const fivehrMin = 300;
  const mealMin = lunchStart ? minsBetween(clockIn, lunchStart) : null;
  const lunchEndMin = lunchEnd ? minsBetween(clockIn, lunchEnd) : null;
  const overMeal = mealMin == null && elapsedMin > fivehrMin;
  const ticks = buildTicks(totalHr);
  const pos = (m: number) => Math.min(1, m / (totalHr * 60)) * 100;

  const progressColor = overMeal
    ? CK.alarm
    : elapsedMin > fivehrMin - 30
      ? CK.amber
      : CK.text;

  if (orientation === 'vertical') {
    return (
      <div className="relative" style={{ height, width: 80 }}>
        {/* Track */}
        <div
          className="absolute left-1/2 top-0 bottom-0 w-px"
          style={{ background: CK.rule2 }}
        />
        {/* Filled progress (worked) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-1.5"
          style={{ top: 0, height: `${pos(elapsedMin)}%`, background: progressColor }}
        />
        {/* Ticks */}
        {ticks.map((t, i) => (
          <div
            key={i}
            className="absolute left-1/2 -translate-x-1/2 flex items-center"
            style={{ top: `${pos(t.min)}%`, transform: 'translate(-50%, -50%)' }}
          >
            <span
              className="block"
              style={{
                width: t.major ? 18 : t.half ? 12 : 6,
                height: 1,
                background: t.major ? CK.text : CK.rule2,
              }}
            />
            {t.major && (
              <span
                className="absolute right-full pr-1.5 text-[10px] ck-num"
                style={{ color: CK.dim }}
              >
                {t.hour}H
              </span>
            )}
          </div>
        ))}
        {/* 5-hour deadline marker */}
        <div
          className="absolute left-0 right-0 flex items-center"
          style={{ top: `${pos(fivehrMin)}%`, transform: 'translateY(-50%)' }}
        >
          <div
            className="w-full h-px"
            style={{
              background: overMeal ? CK.alarm : CK.amber,
              boxShadow: `0 0 6px ${overMeal ? CK.alarm : CK.amber}`,
            }}
          />
          <div
            className="absolute left-full pl-2 text-[9px] uppercase ck-num font-medium whitespace-nowrap"
            style={{
              color: overMeal ? CK.alarm : CK.amber,
              letterSpacing: '0.14em',
            }}
          >
            ▲ MEAL DUE
          </div>
        </div>
        {/* Lunch segment */}
        {mealMin != null && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-2 border-y border-x"
            style={{
              top: `${pos(mealMin)}%`,
              height: `${pos(lunchEndMin ?? elapsedMin) - pos(mealMin)}%`,
              borderColor: CK.amber,
              background: 'rgba(255,176,0,0.15)',
            }}
          />
        )}
        {/* Now indicator */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center"
          style={{ top: `${pos(elapsedMin)}%`, transform: 'translate(-50%,-50%)' }}
        >
          <div
            className="w-4 h-4 border-2 ck-blink"
            style={{ borderColor: overMeal ? CK.alarm : CK.text, background: CK.bg }}
          />
        </div>
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className="relative w-full" style={{ height: 56 }}>
      <div
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px"
        style={{ background: CK.rule2 }}
      />
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5"
        style={{ width: `${pos(elapsedMin)}%`, background: overMeal ? CK.alarm : CK.text }}
      />
      {ticks.map((t, i) => (
        <div
          key={i}
          className="absolute top-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${pos(t.min)}%`, transform: 'translate(-50%, -50%)' }}
        >
          <span
            style={{
              width: 1,
              height: t.major ? 12 : t.half ? 8 : 4,
              background: t.major ? CK.text : CK.rule2,
            }}
          />
          {t.major && (
            <span
              className="absolute top-full mt-0.5 text-[9px] ck-num"
              style={{ color: CK.dim }}
            >
              {t.hour}H
            </span>
          )}
        </div>
      ))}
      <div
        className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
        style={{ left: `${pos(fivehrMin)}%`, transform: 'translateX(-50%)' }}
      >
        <div
          className="h-full w-px"
          style={{
            background: overMeal ? CK.alarm : CK.amber,
            boxShadow: `0 0 4px ${overMeal ? CK.alarm : CK.amber}`,
          }}
        />
        <div
          className="absolute -top-3 text-[8px] uppercase ck-num font-bold"
          style={{ color: overMeal ? CK.alarm : CK.amber, letterSpacing: '0.14em' }}
        >
          MEAL
        </div>
      </div>
      {mealMin != null && (
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 border-y border-x"
          style={{
            left: `${pos(mealMin)}%`,
            width: `${pos(lunchEndMin ?? elapsedMin) - pos(mealMin)}%`,
            borderColor: CK.amber,
            background: 'rgba(255,176,0,0.15)',
          }}
        />
      )}
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 ck-blink"
        style={{
          left: `${pos(elapsedMin)}%`,
          borderColor: overMeal ? CK.alarm : CK.text,
          background: CK.bg,
        }}
      />
    </div>
  );
}

export default MealScale;
