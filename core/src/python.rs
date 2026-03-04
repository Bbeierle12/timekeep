//! Python bindings for timekeep-core using PyO3.
//!
//! Build with: `maturin develop --features python`
//! Or: `maturin build --release --features python`

use pyo3::prelude::*;

use crate::utils::{compliance, time, token, validation};

#[pyfunction]
#[pyo3(name = "is_short_lunch")]
fn py_is_short_lunch(minutes: f64, minimum: Option<f64>) -> bool {
    compliance::is_short_lunch(minutes, minimum)
}

#[pyfunction]
#[pyo3(name = "is_lunch_compliant")]
fn py_is_lunch_compliant(duration_minutes: f64, minimum_minutes: Option<f64>) -> bool {
    compliance::is_lunch_compliant(duration_minutes, minimum_minutes)
}

#[pyfunction]
#[pyo3(name = "calculate_worked_minutes")]
fn py_calculate_worked_minutes(total_shift_minutes: f64, lunch_minutes: f64) -> f64 {
    time::calculate_worked_minutes(total_shift_minutes, lunch_minutes)
}

#[pyfunction]
#[pyo3(name = "normalize_initials")]
fn py_normalize_initials(value: &str) -> String {
    validation::normalize_initials(value)
}

#[pyfunction]
#[pyo3(name = "hash_token")]
fn py_hash_token(token_str: &str) -> String {
    token::hash_token(token_str)
}

#[pyfunction]
#[pyo3(name = "generate_secure_token")]
fn py_generate_secure_token(length: Option<usize>) -> String {
    token::generate_secure_token(length)
}

/// The `timekeep_core` Python module, implemented in Rust.
#[pymodule]
fn timekeep_core(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(py_is_short_lunch, m)?)?;
    m.add_function(wrap_pyfunction!(py_is_lunch_compliant, m)?)?;
    m.add_function(wrap_pyfunction!(py_calculate_worked_minutes, m)?)?;
    m.add_function(wrap_pyfunction!(py_normalize_initials, m)?)?;
    m.add_function(wrap_pyfunction!(py_hash_token, m)?)?;
    m.add_function(wrap_pyfunction!(py_generate_secure_token, m)?)?;
    Ok(())
}
