use chrono::{DateTime, Offset, TimeZone, Utc};
use chrono_tz::Tz;

/// Calculates the total worked minutes after deducting lunch time.
///
/// Mirrors the TypeScript `calculateWorkedMinutes(totalShiftMinutes, lunchMinutes)`.
/// Returns 0 if the result would be negative.
pub fn calculate_worked_minutes(total_shift_minutes: f64, lunch_minutes: f64) -> f64 {
    f64::max(0.0, total_shift_minutes - lunch_minutes)
}

/// Calculates the elapsed minutes between two timestamps.
///
/// Uses Unix timestamps which are DST-safe — calculates real elapsed time,
/// not clock hours (e.g., during spring forward, 2:00 AM to 4:00 AM is 1 hour).
pub fn minutes_between(start: DateTime<Utc>, end: DateTime<Utc>) -> i64 {
    let diff_ms = end.timestamp_millis() - start.timestamp_millis();
    let minutes = (diff_ms as f64 / 60000.0).round() as i64;
    i64::max(0, minutes)
}

/// The type of DST transition detected.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DstTransition {
    SpringForward,
    FallBack,
}

/// Detects if a date range spans a DST transition in a given timezone.
///
/// Returns the type of transition if one occurs, or `None` if no transition.
pub fn detect_dst_transition(
    start: DateTime<Utc>,
    end: DateTime<Utc>,
    timezone: &str,
) -> Option<DstTransition> {
    let tz: Tz = match timezone.parse() {
        Ok(tz) => tz,
        Err(_) => return None,
    };

    let start_local = start.with_timezone(&tz);
    let end_local = end.with_timezone(&tz);

    let start_offset = start_local.offset().fix().local_minus_utc();
    let end_offset = end_local.offset().fix().local_minus_utc();

    if start_offset == end_offset {
        return None;
    }

    // Spring forward: local offset increases (e.g., -8h → -7h for PST → PDT)
    // Fall back: local offset decreases (e.g., -7h → -8h for PDT → PST)
    if end_offset > start_offset {
        Some(DstTransition::SpringForward)
    } else {
        Some(DstTransition::FallBack)
    }
}

/// Checks if a given date is a DST transition day in a timezone.
pub fn is_dst_transition_day(date: DateTime<Utc>, timezone: &str) -> bool {
    let tz: Tz = match timezone.parse() {
        Ok(tz) => tz,
        Err(_) => return false,
    };

    let local_date = date.with_timezone(&tz).date_naive();

    let start_of_day = tz
        .from_local_datetime(&local_date.and_hms_opt(0, 0, 0).unwrap())
        .earliest();
    let end_of_day = tz
        .from_local_datetime(&local_date.and_hms_opt(23, 59, 59).unwrap())
        .latest();

    match (start_of_day, end_of_day) {
        (Some(start), Some(end)) => {
            let start_offset = start.offset().fix().local_minus_utc();
            let end_offset = end.offset().fix().local_minus_utc();
            start_offset != end_offset
        }
        _ => true, // If we can't resolve, it's likely a DST transition
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_calculate_worked_minutes_normal() {
        assert_eq!(calculate_worked_minutes(480.0, 30.0), 450.0);
    }

    #[test]
    fn test_calculate_worked_minutes_no_lunch() {
        assert_eq!(calculate_worked_minutes(360.0, 0.0), 360.0);
    }

    #[test]
    fn test_calculate_worked_minutes_negative_clamps_to_zero() {
        assert_eq!(calculate_worked_minutes(20.0, 30.0), 0.0);
    }

    #[test]
    fn test_minutes_between_normal() {
        let start = Utc.with_ymd_and_hms(2024, 6, 15, 8, 0, 0).unwrap();
        let end = Utc.with_ymd_and_hms(2024, 6, 15, 16, 0, 0).unwrap();
        assert_eq!(minutes_between(start, end), 480);
    }

    #[test]
    fn test_minutes_between_same_time() {
        let t = Utc.with_ymd_and_hms(2024, 6, 15, 8, 0, 0).unwrap();
        assert_eq!(minutes_between(t, t), 0);
    }

    #[test]
    fn test_minutes_between_negative_clamps_to_zero() {
        let start = Utc.with_ymd_and_hms(2024, 6, 15, 16, 0, 0).unwrap();
        let end = Utc.with_ymd_and_hms(2024, 6, 15, 8, 0, 0).unwrap();
        assert_eq!(minutes_between(start, end), 0);
    }

    #[test]
    fn test_detect_dst_transition_no_transition() {
        let start = Utc.with_ymd_and_hms(2024, 6, 15, 15, 0, 0).unwrap(); // Summer, no DST change
        let end = Utc.with_ymd_and_hms(2024, 6, 15, 23, 0, 0).unwrap();
        assert_eq!(
            detect_dst_transition(start, end, "America/Los_Angeles"),
            None
        );
    }

    #[test]
    fn test_detect_dst_invalid_timezone() {
        let start = Utc.with_ymd_and_hms(2024, 3, 10, 9, 0, 0).unwrap();
        let end = Utc.with_ymd_and_hms(2024, 3, 10, 11, 0, 0).unwrap();
        assert_eq!(detect_dst_transition(start, end, "Invalid/Timezone"), None);
    }
}
