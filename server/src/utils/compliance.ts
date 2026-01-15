export function isLunchCompliant(durationMinutes: number, minimumMinutes = 30) {
  return durationMinutes >= minimumMinutes;
}
