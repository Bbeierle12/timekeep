pub mod constants;
pub mod types;
pub mod utils;

// Re-export commonly used items
pub use types::EmployeeSummary;
pub use utils::compliance::{is_lunch_compliant, is_short_lunch};
pub use utils::time::{calculate_worked_minutes, detect_dst_transition, minutes_between};
pub use utils::token::{generate_secure_token, hash_token};
pub use utils::validation::normalize_initials;

#[cfg(feature = "wasm")]
pub mod wasm;

#[cfg(feature = "python")]
pub mod python;

#[cfg(feature = "ffi")]
pub mod ffi;
