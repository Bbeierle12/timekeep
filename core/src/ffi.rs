//! C Foreign Function Interface (FFI) for timekeep-core.
//!
//! Compile with: `cargo build --release --features ffi`
//! This produces a shared library (`.so` / `.dylib` / `.dll`) that can be
//! linked from C, C++, or any language supporting C FFI.
//!
//! # Safety
//! All functions accepting `*const c_char` require valid, null-terminated UTF-8 strings.
//! Functions returning `*mut c_char` allocate memory that must be freed with `timekeep_free_string`.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;

use crate::utils::{compliance, time, token, validation};

/// Free a string allocated by timekeep-core.
///
/// # Safety
/// `ptr` must be a pointer previously returned by a timekeep function.
#[no_mangle]
pub unsafe extern "C" fn timekeep_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        drop(CString::from_raw(ptr));
    }
}

#[no_mangle]
pub extern "C" fn timekeep_is_short_lunch(minutes: f64, minimum: f64) -> bool {
    let min = if minimum <= 0.0 {
        None
    } else {
        Some(minimum)
    };
    compliance::is_short_lunch(minutes, min)
}

#[no_mangle]
pub extern "C" fn timekeep_is_lunch_compliant(duration_minutes: f64, minimum: f64) -> bool {
    let min = if minimum <= 0.0 {
        None
    } else {
        Some(minimum)
    };
    compliance::is_lunch_compliant(duration_minutes, min)
}

#[no_mangle]
pub extern "C" fn timekeep_calculate_worked_minutes(
    total_shift_minutes: f64,
    lunch_minutes: f64,
) -> f64 {
    time::calculate_worked_minutes(total_shift_minutes, lunch_minutes)
}

/// Normalize initials. Caller must free the returned string with `timekeep_free_string`.
///
/// # Safety
/// `value` must be a valid null-terminated UTF-8 string.
#[no_mangle]
pub unsafe extern "C" fn timekeep_normalize_initials(value: *const c_char) -> *mut c_char {
    let c_str = CStr::from_ptr(value);
    let input = match c_str.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let result = validation::normalize_initials(input);
    CString::new(result).unwrap_or_default().into_raw()
}

/// Hash a token string. Caller must free the returned string with `timekeep_free_string`.
///
/// # Safety
/// `token_str` must be a valid null-terminated UTF-8 string.
#[no_mangle]
pub unsafe extern "C" fn timekeep_hash_token(token_str: *const c_char) -> *mut c_char {
    let c_str = CStr::from_ptr(token_str);
    let input = match c_str.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let result = token::hash_token(input);
    CString::new(result).unwrap_or_default().into_raw()
}
