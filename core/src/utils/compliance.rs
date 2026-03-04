/// Checks if a lunch period is shorter than the minimum threshold.
///
/// California requires a minimum 30-minute off-duty meal period.
/// Returns `true` if the lunch duration is below the minimum.
pub fn is_short_lunch(minutes: f64, minimum: Option<f64>) -> bool {
    let min = minimum.unwrap_or(30.0);
    minutes < min
}

/// Checks if a lunch duration meets the minimum compliance requirement.
///
/// Returns `true` if the lunch duration meets or exceeds the minimum.
pub fn is_lunch_compliant(duration_minutes: f64, minimum_minutes: Option<f64>) -> bool {
    let min = minimum_minutes.unwrap_or(30.0);
    duration_minutes >= min
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_short_lunch_below_minimum() {
        assert!(is_short_lunch(25.0, None));
        assert!(is_short_lunch(29.0, None));
    }

    #[test]
    fn test_is_short_lunch_at_minimum() {
        assert!(!is_short_lunch(30.0, None));
    }

    #[test]
    fn test_is_short_lunch_above_minimum() {
        assert!(!is_short_lunch(35.0, None));
        assert!(!is_short_lunch(60.0, None));
    }

    #[test]
    fn test_is_short_lunch_custom_minimum() {
        assert!(is_short_lunch(14.0, Some(15.0)));
        assert!(!is_short_lunch(15.0, Some(15.0)));
        assert!(!is_short_lunch(20.0, Some(15.0)));
    }

    #[test]
    fn test_is_lunch_compliant_meets_minimum() {
        assert!(is_lunch_compliant(30.0, None));
        assert!(is_lunch_compliant(45.0, None));
    }

    #[test]
    fn test_is_lunch_compliant_below_minimum() {
        assert!(!is_lunch_compliant(25.0, None));
        assert!(!is_lunch_compliant(0.0, None));
    }

    #[test]
    fn test_is_lunch_compliant_custom_minimum() {
        assert!(is_lunch_compliant(20.0, Some(20.0)));
        assert!(!is_lunch_compliant(19.0, Some(20.0)));
    }
}
