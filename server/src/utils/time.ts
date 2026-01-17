/**
 * Calculates the actual elapsed minutes between two timestamps.
 * Uses Unix timestamps which are DST-safe - calculates real elapsed time,
 * not clock hours (e.g., during spring forward, 2:00 AM to 4:00 AM is 1 hour).
 */
export function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

/**
 * Detects if a date range spans a DST transition in a given timezone.
 * Returns the type of transition if one occurs, or null if no transition.
 */
export function detectDstTransition(
  start: Date,
  end: Date,
  timezone: string
): 'spring_forward' | 'fall_back' | null {
  // Get the UTC offset in minutes for both times
  const getUtcOffset = (date: Date, tz: string): number => {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    return (utcDate.getTime() - tzDate.getTime()) / 60000;
  };

  const startOffset = getUtcOffset(start, timezone);
  const endOffset = getUtcOffset(end, timezone);

  if (startOffset === endOffset) {
    return null;
  }

  // Spring forward: offset decreases (e.g., -480 to -420 for PST to PDT)
  // Fall back: offset increases (e.g., -420 to -480 for PDT to PST)
  return endOffset > startOffset ? 'fall_back' : 'spring_forward';
}

/**
 * Checks if a given date is a DST transition day in a timezone.
 */
export function isDstTransitionDay(date: Date, timezone: string): boolean {
  // Check if midnight to 11:59 PM spans a DST transition
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return detectDstTransition(startOfDay, endOfDay, timezone) !== null;
}
