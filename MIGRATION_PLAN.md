# Timekeep — Rust Core Migration Plan

## Overview

This document describes the migration strategy for converting Timekeep's core business logic to Rust, while retaining JavaScript/TypeScript for the web frontend, and providing bindings for Python and C/C++ consumers.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Applications                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ React    │  │ Python   │  │ C/C++ Services   │   │
│  │ Web App  │  │ Scripts  │  │ / Embedded       │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────────────┘   │
│       │              │             │                  │
│       │ WASM         │ PyO3        │ C FFI            │
│       │              │             │                  │
│  ┌────▼──────────────▼─────────────▼─────────────┐   │
│  │              timekeep-core (Rust)              │   │
│  │                                                │   │
│  │  • Compliance logic (meal/rest break rules)   │   │
│  │  • Time calculations (DST-safe)               │   │
│  │  • Validation (initials, input normalization)  │   │
│  │  • Cryptographic utilities (SHA-256, tokens)  │   │
│  │  • Constants (legal waiver/attestation text)  │   │
│  └────────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐                          │
│  │ Express  │  │ Postgres │                          │
│  │ API      │  │ Database │                          │
│  └──────────┘  └──────────┘                          │
└─────────────────────────────────────────────────────┘
```

## What Has Been Done (Phase 0)

- [x] Created `core/` Rust library with `timekeep-core` crate
- [x] Ported shared business logic from TypeScript to Rust:
  - Compliance: `is_short_lunch`, `is_lunch_compliant`
  - Time: `calculate_worked_minutes`, `minutes_between`, `detect_dst_transition`, `is_dst_transition_day`
  - Validation: `normalize_initials`
  - Token: `hash_token`, `generate_secure_token`
  - Constants: waiver text, attestation text
- [x] Added 27 unit tests covering all ported functions
- [x] Created WASM bindings (`--features wasm`) for JS/TS consumption
- [x] Created Python bindings scaffold (`--features python`) using PyO3
- [x] Created C FFI scaffold (`--features ffi`) for C/C++ integration
- [x] Added `build:core`, `test:core`, `build:core:wasm` npm scripts

## Recommended Migration Phases

### Phase 1 — WASM Integration in Web App

**Goal:** Replace `@timekeep/shared` utilities with the Rust WASM module.

1. Install `wasm-pack` and build: `wasm-pack build --target bundler --features wasm`
2. Add the generated `pkg/` as an npm dependency in `apps/web`
3. Update imports in the web app from `@timekeep/shared` to `timekeep-core`
4. Verify all compliance calculations produce identical results
5. Benchmark: compare WASM vs JS performance for batch operations

**Tools needed:** `wasm-pack`, `vite-plugin-wasm`

### Phase 2 — Node.js / Server Integration

**Goal:** Use the Rust core from the Express.js backend via native Node addon or WASM.

**Option A — WASM (simpler):**
- Build with `wasm-pack build --target nodejs --features wasm`
- Import in server code

**Option B — Native addon via NAPI-RS (faster):**
- Add `napi-rs` feature to `timekeep-core`
- Build a native `.node` addon
- Better performance for server-side crypto and compliance checks

**Recommendation:** Start with Option A; move to Option B for performance-critical paths.

### Phase 3 — Python Tooling

**Goal:** Enable Python scripts for analytics, reporting, and data processing.

1. Install `maturin` (`pip install maturin`)
2. Build: `maturin develop --features python`
3. Create Python analytics scripts that use `timekeep_core`:
   - Compliance report generators
   - Bulk time entry validation
   - Data export utilities

**Example usage:**
```python
import timekeep_core

# Check compliance
is_ok = timekeep_core.is_lunch_compliant(25.0, 30.0)  # False

# Calculate worked time
worked = timekeep_core.calculate_worked_minutes(480.0, 30.0)  # 450.0

# Normalize initials
initials = timekeep_core.normalize_initials("  jds  ")  # "JDS"
```

### Phase 4 — C/C++ Integration

**Goal:** Enable embedded systems, kiosk hardware, or native mobile modules.

1. Build: `cargo build --release --features ffi`
2. The shared library (`libtimekeep_core.so` / `.dylib` / `.dll`) exports C-compatible functions
3. Use from C/C++ with the provided header signatures
4. Consider `cbindgen` to auto-generate a C header file

**Example C usage:**
```c
#include <stdio.h>

// From timekeep-core FFI
extern double timekeep_calculate_worked_minutes(double total, double lunch);
extern int timekeep_is_lunch_compliant(double duration, double minimum);
extern void timekeep_free_string(char* ptr);

int main() {
    double worked = timekeep_calculate_worked_minutes(480.0, 30.0);
    printf("Worked: %.0f minutes\n", worked);  // 450
    return 0;
}
```

### Phase 5 — Server Rewrite (Long-term)

**Goal:** Migrate the Express.js API server to Rust (Axum or Actix-web).

This is the largest and most impactful phase. Recommended approach:

1. **Start with new endpoints** — write new API routes in Rust while Express continues serving existing ones
2. **Reverse proxy** — run both servers, route traffic based on path
3. **Gradual migration** — move routes one-by-one, with integration tests ensuring parity
4. **Database layer** — use `sqlx` or `diesel` for PostgreSQL access

**Rust web framework recommendations:**
- **Axum** — modern, modular, good ecosystem (recommended)
- **Actix-web** — battle-tested, highest performance
- **Rocket** — developer-friendly, good for rapid prototyping

### Phase 6 — Mobile Native Modules

**Goal:** Use Rust core in React Native via native modules.

- **Android:** JNI bindings via `jni-rs` crate
- **iOS:** C FFI (already available) or Swift bindings via `swift-bridge`
- **Alternative:** Use `uniffi` for cross-platform mobile bindings

## Technology Recommendations

| Use Case | Recommended Tool | Notes |
|----------|-----------------|-------|
| JS/TS interop | `wasm-pack` + `wasm-bindgen` | Already scaffolded |
| Python interop | `PyO3` + `maturin` | Already scaffolded |
| C/C++ interop | C FFI + `cbindgen` | Already scaffolded |
| Node.js native addon | `napi-rs` | Higher performance than WASM |
| Web server | Axum | Modern async, Tower middleware |
| Database ORM | `sqlx` | Compile-time SQL verification |
| Serialization | `serde` | Already in use |
| Error handling | `thiserror` + `anyhow` | For library vs application code |
| Async runtime | `tokio` | Industry standard |
| Testing | `cargo test` + `proptest` | Property-based testing |
| Benchmarks | `criterion` | Statistical benchmarking |

## File Structure

```
timekeep/
├── core/                          # Rust core library
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                 # Module root
│       ├── wasm.rs                # WASM bindings (--features wasm)
│       ├── python.rs              # Python bindings (--features python)
│       ├── ffi.rs                 # C FFI bindings (--features ffi)
│       ├── types/
│       │   └── mod.rs             # Core data types
│       ├── utils/
│       │   ├── mod.rs
│       │   ├── compliance.rs      # Meal/rest break compliance
│       │   ├── time.rs            # DST-safe time calculations
│       │   ├── token.rs           # SHA-256, secure token generation
│       │   └── validation.rs      # Input normalization
│       └── constants/
│           ├── mod.rs
│           ├── waiver_text.rs     # Legal waiver text
│           └── attestation_text.rs # Legal attestation text
├── apps/web/                      # React frontend (consumes WASM)
├── server/                        # Express.js API (Phase 2: WASM/NAPI)
├── packages/shared/               # Legacy TS shared (to be replaced)
└── MIGRATION_PLAN.md              # This document
```

## Getting Started

```bash
# Build the Rust core
npm run build:core

# Run Rust tests
npm run test:core

# Build WASM package (requires wasm-pack)
npm run build:core:wasm
```
