export function calculateWorkedMinutes(totalShiftMinutes: number, lunchMinutes: number) {
  return Math.max(0, totalShiftMinutes - lunchMinutes);
}
