/// Normalizes employee initials: trims whitespace, takes first 3 characters,
/// and converts to uppercase.
///
/// Mirrors the TypeScript `normalizeInitials(value)`.
pub fn normalize_initials(value: &str) -> String {
    let trimmed = value.trim();
    let truncated: String = trimmed.chars().take(3).collect();
    truncated.to_uppercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_basic() {
        assert_eq!(normalize_initials("abc"), "ABC");
    }

    #[test]
    fn test_normalize_trims_whitespace() {
        assert_eq!(normalize_initials("  ab  "), "AB");
    }

    #[test]
    fn test_normalize_truncates_to_three() {
        assert_eq!(normalize_initials("abcdef"), "ABC");
    }

    #[test]
    fn test_normalize_short_input() {
        assert_eq!(normalize_initials("a"), "A");
    }

    #[test]
    fn test_normalize_empty() {
        assert_eq!(normalize_initials(""), "");
    }

    #[test]
    fn test_normalize_already_uppercase() {
        assert_eq!(normalize_initials("XYZ"), "XYZ");
    }
}
