//! WebAssembly bindings for timekeep-core.
//!
//! Compile with: `wasm-pack build --target bundler` (or `--target nodejs` for Node.js)
//! Enable with: `cargo build --features wasm`

use wasm_bindgen::prelude::*;

use crate::utils::{compliance, time, token, validation};

// --- Compliance ---

#[wasm_bindgen(js_name = "isShortLunch")]
pub fn is_short_lunch(minutes: f64, minimum: Option<f64>) -> bool {
    compliance::is_short_lunch(minutes, minimum)
}

#[wasm_bindgen(js_name = "isLunchCompliant")]
pub fn is_lunch_compliant(duration_minutes: f64, minimum_minutes: Option<f64>) -> bool {
    compliance::is_lunch_compliant(duration_minutes, minimum_minutes)
}

// --- Time ---

#[wasm_bindgen(js_name = "calculateWorkedMinutes")]
pub fn calculate_worked_minutes(total_shift_minutes: f64, lunch_minutes: f64) -> f64 {
    time::calculate_worked_minutes(total_shift_minutes, lunch_minutes)
}

// --- Validation ---

#[wasm_bindgen(js_name = "normalizeInitials")]
pub fn normalize_initials(value: &str) -> String {
    validation::normalize_initials(value)
}

// --- Token ---

#[wasm_bindgen(js_name = "hashToken")]
pub fn hash_token(token_str: &str) -> String {
    token::hash_token(token_str)
}
