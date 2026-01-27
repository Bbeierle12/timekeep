# TimeKeep Platform — Comprehensive Architecture & Code Critique

**Date:** 2026-01-27
**Reviewer:** Senior Software Architect & California Labor Law Compliance Audit
**Scope:** Full-stack audit across architecture, security, compliance, database, error handling, testing, performance, code quality, UX, mobile, DevOps, and legal risk.

---

## Prioritized Findings

### CRITICAL Findings

---

#### C-01 | MFA TOTP Verification Is a Stub — Accepts Any 6-Digit Code
- **Severity:** Critical
- **Category:** 2 — Security
- **Affected File:** `server/src/services/mfa.service.ts:137-147`
- **Finding:** The `verifyTotpCode()` method contains a `TODO` comment and unconditionally returns `true` for any 6-digit numeric string. No actual TOTP verification library (e.g., `speakeasy`, `otplib`) is integrated.
- **Impact:** Any attacker who knows an admin email and password can bypass MFA entirely by submitting any 6-digit code. MFA provides zero additional security.
- **Recommendation:** Install `otplib` or `speakeasy`, implement proper TOTP verification against the stored secret, and add replay-attack protection with a time-window check.
- **Effort:** Low

---

#### C-02 | Overtime Calculation Is Completely Unimplemented
- **Severity:** Critical
- **Category:** 3 — California Labor Law Compliance
- **Affected File:** `server/src/services/dailySummary.service.ts` (missing logic); `company_settings` table (unused fields)
- **Finding:** The schema defines `overtime_minutes` and `doubletime_minutes` columns in `daily_summaries`, and `overtime_daily_minutes` (default 480) and `doubletime_daily_minutes` (default 720) thresholds in `company_settings`. However, no code anywhere in the codebase calculates these values. They are always 0.
- **Impact:** Payroll reports will show zero overtime and zero double-time regardless of actual hours worked. This is a direct California wage-and-hour violation (Labor Code §510). Employers relying on TimeKeep for payroll could face class-action exposure.
- **Recommendation:** Implement daily overtime calculation in `dailySummary.service.ts`: hours > 8 = 1.5x, hours > 12 = 2x. Add weekly overtime (hours > 40 in workweek = 1.5x). Track weekly totals in a new `weekly_summaries` table or computed query.
- **Effort:** High

---

#### C-03 | 7th Consecutive Day Rule Is Completely Unimplemented
- **Severity:** Critical
- **Category:** 3 — California Labor Law Compliance
- **Affected File:** `company_settings` table (`seventh_day_rule_enabled DEFAULT TRUE`); no service implements it
- **Finding:** California Labor Code §510(a) requires 1.5x pay for the first 8 hours and 2x pay for hours beyond 8 on the 7th consecutive day of work in a workweek. The setting `seventh_day_rule_enabled` exists but is never read or used. No service tracks consecutive work days.
- **Impact:** Systematic underpayment of 7th-day premium wages. Major compliance liability.
- **Recommendation:** Build a `weeklyCompliance.service.ts` that tracks consecutive work days per employee per workweek, flags 7th-day shifts, and applies the correct premium multiplier.
- **Effort:** High

---

#### C-04 | Audit Logging Service Is Never Called
- **Severity:** Critical
- **Category:** 12 — Legal & Compliance Risk
- **Affected File:** `server/src/services/audit.service.ts` (defined); no caller found in routes or other services
- **Finding:** The `auditService.log()` method exists with a proper schema (actor, action, target, GPS, IP, user-agent, JSONB details) and the `audit_log` table is created in migrations. However, a codebase-wide search reveals no route, middleware, or service ever calls `auditService.log()`.
- **Impact:** There is no audit trail whatsoever. Time entries can be modified without record. Admin actions are untracked. In a wage dispute, the employer cannot produce tamper-evident logs. This undermines the entire compliance posture.
- **Recommendation:** Integrate `auditService.log()` into all state-changing routes (punch, correction, waiver, attestation, admin CRUD, settings changes). Consider implementing it as Express middleware that automatically logs POST/PUT/DELETE actions.
- **Effort:** Medium

---

#### C-05 | Test Coverage for Compliance Logic Is Zero
- **Severity:** Critical
- **Category:** 6 — Testing
- **Affected Files:** `server/src/services/compliance.service.ts`, `dailySummary.service.ts`, `waiver.service.ts`, `attestation.service.ts` — all have zero test files
- **Finding:** The entire compliance calculation engine — meal break detection, rest break tracking, waiver eligibility, violation flagging, premium pay calculation — has no unit tests. The server has only 7 test cases total (6 for auth routes, 1 for health check). Zero tests for the core business logic.
- **Impact:** Any refactor or bug fix to compliance logic risks introducing regressions that go undetected. Given this is the legal compliance core of the product, untested logic could produce incorrect violation determinations.
- **Recommendation:** Write comprehensive unit tests for: (1) meal break violation detection for all three meal periods, (2) waiver eligibility checks with edge cases, (3) rest break entitlement calculations, (4) premium pay triggering, (5) midnight-crossing and DST transitions. Target >90% branch coverage for compliance services.
- **Effort:** High

---

#### C-06 | 15+ Routes Have No Error Handling
- **Severity:** Critical
- **Category:** 5 — Error Handling & Resilience
- **Affected Files:** `server/src/routes/employee.ts`, `server/src/routes/certification.ts`, `server/src/routes/admin/compliance.ts`, `server/src/routes/admin/entries.ts`, `server/src/routes/v1/settings.ts`
- **Finding:** At least 15 route handlers call service methods or database queries without try/catch blocks. If a service throws (e.g., database timeout, invalid data), the error propagates to the global handler, which returns a generic 500. But in the meantime, the promise rejection may not be correctly caught depending on Express version.
- **Impact:** Unhandled rejections can crash the process in older Node versions. Even with the global handler, the lack of specific error handling means no contextual error responses (e.g., "employee not found" vs. "database unavailable").
- **Recommendation:** Create a `wrapAsync()` utility that wraps route handlers with try/catch. Apply it to all routes. Return appropriate HTTP status codes (404, 422, 503) based on error type.
- **Effort:** Medium

---

### MAJOR Findings

---

#### M-01 | Employee PIN Authentication Has Extremely Small Keyspace
- **Severity:** Major
- **Category:** 2 — Security
- **Affected File:** `server/src/services/auth.service.ts:88-100`
- **Finding:** Employee authentication uses 2-3 character initials + 4-digit PIN. The keyspace is at most 26³ × 10⁴ = 175,760,000 combinations. However, since initials are often known (displayed on badges, schedules), the effective keyspace for brute-force is just 10,000 PINs. The rate limiter allows 20 attempts per 15 minutes per IP.
- **Impact:** An attacker who knows an employee's initials can exhaust all 10,000 PINs in ~125 hours from a single IP, or faster with IP rotation.
- **Recommendation:** (1) Add per-account rate limiting (not just per-IP). (2) Implement progressive lockout: lock the account after 5 failed attempts for 15 minutes, escalating with each lockout. (3) Consider requiring employee_code (alphanumeric) instead of initials for stronger identification. (4) The current account lockout exists but is based on `company_settings.failed_login_lockout_count` which defaults to 5 — verify this is enforced and cannot be disabled.
- **Effort:** Medium

---

#### M-02 | Shared Package (@timekeep/shared) Is Never Imported
- **Severity:** Major
- **Category:** 1 — Architecture & Design
- **Affected File:** `packages/shared/src/` (entire package)
- **Finding:** The shared package exports types, compliance utilities, time utilities, validation helpers, and legal text constants (waiver/attestation text). However, a codebase-wide search finds zero imports of `@timekeep/shared` in either the server, web app, or mobile app. The legal text constants (attestation option A/B text, waiver language) are duplicated in the server services.
- **Impact:** The monorepo's shared package — the primary justification for the monorepo structure — is dead weight. Types, utilities, and legal constants are duplicated rather than shared, creating drift risk.
- **Recommendation:** Either: (1) Import `@timekeep/shared` in server and web for types, validation schemas, and legal text constants, or (2) Remove the package and simplify the monorepo if sharing is not needed.
- **Effort:** Medium

---

#### M-03 | No Security Headers (HSTS, CSP, X-Frame-Options)
- **Severity:** Major
- **Category:** 2 — Security
- **Affected File:** `server/src/app.ts`
- **Finding:** The Express application sets no security headers. Missing: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `X-XSS-Protection`.
- **Impact:** Vulnerable to clickjacking (no X-Frame-Options), MIME sniffing attacks, and lacks HSTS enforcement for HTTPS.
- **Recommendation:** Install `helmet` middleware and configure it with appropriate CSP directives. This is a single `app.use(helmet())` call.
- **Effort:** Low

---

#### M-04 | Password Reset Endpoint Has No Rate Limiting
- **Severity:** Major
- **Category:** 2 — Security
- **Affected File:** `server/src/routes/auth.ts:180-201`
- **Finding:** The `POST /admin/forgot-password`, `POST /admin/validate-reset-token`, and `POST /admin/reset-password` endpoints use no rate limiting beyond the global 100 req/15min limiter. The login-specific rate limiter (20 req/15min) is only applied to login routes.
- **Impact:** Attackers can enumerate valid admin emails via timing differences in the forgot-password response. The token validation endpoint can be brute-forced.
- **Recommendation:** Apply the login rate limiter to all password reset endpoints. Use constant-time responses for forgot-password (always return success regardless of email existence).
- **Effort:** Low

---

#### M-05 | No Password Complexity Requirements
- **Severity:** Major
- **Category:** 2 — Security
- **Affected Files:** `server/src/services/passwordReset.service.ts:112-116`, `server/src/routes/admin/admins.ts:10-14`
- **Finding:** Admin passwords require only 8 characters minimum. No requirements for uppercase, lowercase, digits, or special characters. The admin creation schema (`z.string().min(8)`) enforces only length.
- **Impact:** Weak passwords are permitted (e.g., "aaaaaaaa"). Admin accounts are high-value targets with access to all employee data, compliance settings, and time entries.
- **Recommendation:** Add password complexity validation: minimum 12 characters, at least one uppercase, one lowercase, one digit, one special character. Consider integrating a password strength library or checking against known-breach dictionaries.
- **Effort:** Low

---

#### M-06 | Waiver Revocation Query Missing is_invalid Check
- **Severity:** Major
- **Category:** 3 — California Labor Law Compliance
- **Affected File:** `server/src/services/waiver.service.ts:130-131`
- **Finding:** The `revoke()` method queries active waivers with `WHERE is_revoked = FALSE` but does not also check `AND is_invalid = FALSE`. This means already-invalidated waivers (those auto-invalidated when a shift exceeded 6/12 hours) could be selected for revocation, causing incorrect state.
- **Impact:** Could produce incorrect compliance determinations when a waiver was already invalidated by shift length exceeding the waiver threshold, then an admin also revokes it.
- **Recommendation:** Add `AND is_invalid = FALSE` to the WHERE clause in the revoke query.
- **Effort:** Low

---

#### M-07 | Database Migration Script Has Hardcoded Credentials
- **Severity:** Major
- **Category:** 11 — DevOps & Deployment
- **Affected File:** `server/src/db/run-migrations.ts:14-15`
- **Finding:** The migration runner uses hardcoded PostgreSQL credentials (`user: 'postgres', password: 'postgres'`) instead of the `DATABASE_URL` environment variable.
- **Impact:** Migrations will fail in any non-development environment. Could accidentally expose credentials if committed to version control.
- **Recommendation:** Use `config.databaseUrl` or `process.env.DATABASE_URL` for the migration connection, matching the main application's connection configuration.
- **Effort:** Low

---

#### M-08 | Premium Pay Calculation Is Oversimplified
- **Severity:** Major
- **Category:** 3 — California Labor Law Compliance
- **Affected File:** `server/src/services/dailySummary.service.ts:376-379`
- **Finding:** The `flagPremiumPay()` method calculates premium pay as `hourlyRate × violationCount` where `violationCount` defaults to 1. California law requires one additional hour of pay at the employee's regular rate for each workday a meal period violation occurs. The current logic always adds exactly 1 hour regardless of whether multiple distinct meal period violations occurred on the same day (e.g., both first and second meal violations).
- **Impact:** Could underpay premium wages if multiple meal violations occur in a single shift. For a 14-hour shift with both a missed first meal and a missed second meal, 2 hours of premium pay are owed, not 1.
- **Recommendation:** Count distinct violation types per day and pass the correct count. Verify the logic against California Labor Code §226.7.
- **Effort:** Medium

---

#### M-09 | No Client-Side Form Validation
- **Severity:** Major
- **Category:** 9 — Frontend/UX Concerns
- **Affected Files:** `apps/web/src/utils/validation.ts` (4 lines, only `normalizeInitials()`), all form components
- **Finding:** The server uses comprehensive Zod schemas for all endpoints, but the web frontend has no corresponding client-side validation. The frontend `validation.ts` contains only a single `normalizeInitials()` function. Forms submit to the server and display server-side error messages.
- **Impact:** Poor UX — users must wait for a server round-trip to discover validation errors. No instant feedback on form fields. Risk of validation drift between client expectations and server enforcement.
- **Recommendation:** Export Zod schemas from `@timekeep/shared` and use them with `react-hook-form`'s `zodResolver` on all forms. This ensures client/server parity.
- **Effort:** Medium

---

#### M-10 | Docker Setup Is Development-Only
- **Severity:** Major
- **Category:** 11 — DevOps & Deployment
- **Affected File:** `docker-compose.yml`
- **Finding:** Docker Compose defines only a PostgreSQL container with hardcoded credentials (`timekeep/timekeep`). Missing: Redis service, API server container, web server/Nginx, health checks, TLS termination, logging, backup configuration.
- **Impact:** No path to production deployment via containers. No Redis means rate limiting falls back to in-memory (broken in multi-instance deployments).
- **Recommendation:** Create `docker-compose.prod.yml` with: Redis, API server, Nginx reverse proxy with TLS, health checks, resource limits, and proper secret management.
- **Effort:** High

---

#### M-11 | Signature Storage in BYTEA Without Size Limits
- **Severity:** Major
- **Category:** 4 — Database Design
- **Affected Files:** `waivers` table (`signature_image BYTEA`), `attestations` table (`signature_image BYTEA`)
- **Finding:** Signature images are stored as BYTEA in PostgreSQL with no size constraints. There is no application-level size check on the uploaded signature data. No retention/cleanup policy.
- **Impact:** A malicious or buggy client could upload arbitrarily large binary data, bloating the database. Over time, signature data could become a significant portion of database size with no cleanup mechanism.
- **Recommendation:** (1) Add application-level size limit (e.g., 500KB per signature). (2) Consider moving signature storage to S3/object storage with a URL reference in the database. (3) Implement data retention policy with scheduled cleanup of old signatures.
- **Effort:** Medium

---

#### M-12 | No Database Connection Retry or Health Check at Startup
- **Severity:** Major
- **Category:** 5 — Error Handling & Resilience
- **Affected File:** `server/src/db/connection.ts`
- **Finding:** The database connection pool is created with a 2-second connection timeout but no retry logic. If the database is temporarily unavailable at startup (common in containerized deployments where services start simultaneously), the application will fail immediately.
- **Impact:** Container orchestration restarts may cause cascading failures if the database takes a few seconds to become ready.
- **Recommendation:** Add startup health check with retry: attempt connection up to 5 times with exponential backoff before declaring the app unhealthy. Also expose database health in the `/health` endpoint.
- **Effort:** Low

---

#### M-13 | X-Forwarded-For Header Trusted Without Proxy Configuration
- **Severity:** Major
- **Category:** 2 — Security
- **Affected File:** `server/src/middleware/rateLimiter.ts:120-126`
- **Finding:** The `getClientIp()` function reads `X-Forwarded-For` header directly and uses the first value. Express's `trust proxy` setting is not configured, meaning `req.ip` may also not be correct behind a load balancer.
- **Impact:** Attackers can spoof their IP address to bypass rate limiting by setting a fake `X-Forwarded-For` header.
- **Recommendation:** Configure `app.set('trust proxy', 1)` in Express if behind a single reverse proxy. Use `req.ip` instead of parsing headers manually after configuring trust proxy.
- **Effort:** Low

---

#### M-14 | Race Condition in Concurrent Punch Recording
- **Severity:** Major
- **Category:** 4 — Database Design
- **Affected File:** `server/src/services/timeEntry.service.ts:179-328`
- **Finding:** The punch recording logic validates state (e.g., "is the employee already clocked in?") by querying existing entries, then inserts a new entry. These two operations are not wrapped in a transaction with row-level locking (`SELECT ... FOR UPDATE`). If two devices submit punches simultaneously (e.g., kiosk and mobile), both queries could pass validation and both inserts could succeed.
- **Impact:** Duplicate clock-in entries, inconsistent daily summaries, and compliance calculation errors.
- **Recommendation:** Wrap the validate-and-insert flow in a database transaction with `SELECT ... FOR UPDATE` on the employee's current-day entries. The correction service already demonstrates this pattern correctly.
- **Effort:** Medium

---

### MINOR Findings

---

#### m-01 | Validation Middleware Is a No-Op Stub
- **Severity:** Minor
- **Category:** 8 — Code Quality & Maintainability
- **Affected File:** `server/src/middleware/validation.ts`
- **Finding:** The `validateRequest()` middleware does nothing — it immediately calls `next()`. It exists as dead code that could mislead developers into thinking validation is applied when it is not.
- **Impact:** Developers may assume routes using this middleware are validated. Low impact since actual Zod validation is done inline in routes.
- **Recommendation:** Delete the file or implement generic Zod-based request validation middleware.
- **Effort:** Low

---

#### m-02 | ReminderContext and SettingsContext Are Defined But Never Provided
- **Severity:** Minor
- **Category:** 9 — Frontend/UX Concerns
- **Affected Files:** `apps/web/src/context/ReminderContext.tsx`, `apps/web/src/context/SettingsContext.tsx`
- **Finding:** Both contexts are defined with `createContext()` and default values, but no `<Provider>` component wraps the app tree. `SettingsContext` hardcodes `'America/Los_Angeles'` as the timezone. `ReminderContext` provides an empty array. Neither loads data from the server.
- **Impact:** Settings and reminders are static. Timezone is hardcoded rather than fetched from company settings. If a company operates in a different timezone, all time calculations on the frontend will be incorrect.
- **Recommendation:** Implement providers that fetch settings from the API on mount. For `SettingsContext`, load the company timezone from `GET /api/settings`.
- **Effort:** Medium

---

#### m-03 | Error Messages Leak Account Status Information
- **Severity:** Minor
- **Category:** 2 — Security
- **Affected File:** `server/src/services/auth.service.ts:119-145`
- **Finding:** Authentication failure returns specific error codes: `EMPLOYEE_INACTIVE`, `ACCESS_PENDING`, `ACCESS_DENIED`, `ACCOUNT_LOCKED`, `INVALID_CREDENTIALS`. While helpful for UX, these codes reveal whether an employee ID exists and its account status.
- **Impact:** Enables account enumeration — an attacker can determine which employee initials are valid and which accounts are active, locked, or pending.
- **Recommendation:** Return a generic `INVALID_CREDENTIALS` for all authentication failures. Log the specific reason server-side for debugging. If business requirements demand specific messages, add CAPTCHA after initial failures.
- **Effort:** Low

---

#### m-04 | Console.error Logs Full Error Objects in Production
- **Severity:** Minor
- **Category:** 5 — Error Handling & Resilience
- **Affected Files:** `server/src/app.ts:55` (global handler), 13+ route files
- **Finding:** Error handlers use `console.error('...', error)` which dumps full stack traces and potentially sensitive error details to stdout. No structured logging, no log levels, no correlation IDs.
- **Impact:** In production, error details could appear in container logs or monitoring systems without redaction. No way to correlate client-facing errors with server-side logs.
- **Recommendation:** Adopt a structured logging library (e.g., `pino` or `winston`). Configure log levels, redact sensitive fields, and include request correlation IDs.
- **Effort:** Medium

---

#### m-05 | Cookie SameSite Set to 'lax' Instead of 'strict'
- **Severity:** Minor
- **Category:** 2 — Security
- **Affected File:** `server/src/routes/auth.ts:40-45`
- **Finding:** The auth cookie uses `sameSite: 'lax'` which allows the cookie to be sent on top-level navigations from external sites (e.g., clicking a link from an email). For an application that should never be accessed via external navigation with credentials, `'strict'` provides better CSRF protection.
- **Impact:** Marginal CSRF risk. The CSRF token middleware provides the primary defense, making this defense-in-depth.
- **Recommendation:** Change to `sameSite: 'strict'` since TimeKeep is a standalone application, not embedded in other sites.
- **Effort:** Low

---

#### m-06 | No Session Idle Timeout
- **Severity:** Minor
- **Category:** 2 — Security
- **Affected File:** `sessions` table has `last_activity_at` column but it is never updated
- **Finding:** Sessions have an absolute expiry (`expires_at`) but no idle timeout. The `last_activity_at` column exists in the schema but is never updated by any middleware or service. A session created for 24 hours remains valid for the full 24 hours even if unused.
- **Impact:** If an employee walks away from a shared kiosk, their session remains active for the full duration. Another employee could use the session to punch on their behalf.
- **Recommendation:** Update `last_activity_at` in the auth middleware on each request. Enforce idle timeout (e.g., 15 minutes for employees, 30 minutes for admins).
- **Effort:** Low

---

#### m-07 | Custom CSV Parser Is Incomplete
- **Severity:** Minor
- **Category:** 8 — Code Quality & Maintainability
- **Affected File:** `server/src/services/employeeImport.service.ts:29-49`
- **Finding:** A hand-rolled CSV parser handles basic comma-separated values and quoted fields, but does not handle escaped quotes (`""` inside quoted fields), newlines within quoted fields, or BOM characters. This deviates from RFC 4180.
- **Impact:** CSV files exported from Excel or Google Sheets with special characters could fail to parse or produce incorrect data.
- **Recommendation:** Replace with a proven CSV library such as `csv-parse` or `papaparse`.
- **Effort:** Low

---

#### m-08 | EmployeeForm Component Is a Placeholder
- **Severity:** Minor
- **Category:** 8 — Code Quality & Maintainability
- **Affected File:** `apps/web/src/components/admin/EmployeeForm.tsx` (3 lines)
- **Finding:** The component returns a placeholder `<div>` instead of an actual form. It is imported in the admin section but provides no functionality.
- **Impact:** The employee creation/editing workflow may rely on a different component or be incomplete.
- **Recommendation:** Either implement the form or remove the placeholder and update imports.
- **Effort:** Low

---

#### m-09 | Accessibility Gaps in Key Interactive Components
- **Severity:** Minor
- **Category:** 9 — Frontend/UX Concerns
- **Affected Files:** `apps/web/src/components/employee/PunchButton.tsx:52-64`, `apps/web/src/pages/employee/Dashboard.tsx:249-331`, `apps/web/src/pages/admin/Dashboard.tsx:103-144`
- **Finding:** The PunchButton — the most-used interactive element — has no `aria-label`. Dashboard status indicators lack `role="status"` or `aria-live` regions. Admin dashboard stat cards and alert cards have no semantic labels. No `role="alert"` on compliance alerts.
- **Impact:** Screen reader users cannot effectively use the core time-tracking interface. Fails WCAG 2.1 AA compliance for Level A criteria (4.1.2 Name, Role, Value).
- **Recommendation:** Add `aria-label` to PunchButton, `aria-live="polite"` to dynamic status regions, `role="alert"` to compliance alerts, and semantic heading hierarchy to dashboard sections.
- **Effort:** Medium

---

#### m-10 | Mobile App Is a Scaffold With No Core Functionality
- **Severity:** Minor
- **Category:** 10 — Mobile App Assessment
- **Affected Files:** `apps/mobile/src/` (all files)
- **Finding:** The React Native/Expo app has login, navigation, and basic screen scaffolding, but is missing: actual punch recording UI, lunch/break controls, signature capture, geofence/GPS integration, offline sync completion, push notification handling, and deep linking. The offline queue (`offlineQueue.ts`) has a `flushQueuedPunches()` method but it's unclear if it's connected to any UI flow.
- **Impact:** The mobile app is not functional for production use. Employees cannot track time from mobile devices.
- **Recommendation:** Define a mobile MVP feature set and implement in priority order: (1) punch recording with GPS, (2) offline-first with sync, (3) lunch/break flows, (4) push notifications for compliance reminders.
- **Effort:** High

---

#### m-11 | Environment Variables Not Validated at Startup
- **Severity:** Minor
- **Category:** 11 — DevOps & Deployment
- **Affected File:** `server/src/config/index.ts`
- **Finding:** Only `JWT_SECRET` and `CSRF_SECRET` are validated. `DATABASE_URL` can be empty (causing a confusing connection error later). `PORT` is parsed but not range-checked. `CORS_ORIGINS` defaults silently. `RATE_LIMIT_REDIS_URL` format is never validated.
- **Impact:** Misconfigured deployments fail with confusing errors deep in the stack rather than immediately at startup.
- **Recommendation:** Use a Zod schema to validate all environment variables at startup. Fail fast with clear error messages listing all missing/invalid variables.
- **Effort:** Low

---

#### m-12 | Compliance Dashboard Executes 9 Separate Queries
- **Severity:** Minor
- **Category:** 7 — Performance & Scalability
- **Affected File:** `server/src/services/compliance.service.ts:50-109`
- **Finding:** The `getDashboard()` method executes 9 independent database queries sequentially to gather metrics (active employees, clocked-in count, on-lunch count, violations, etc.). While none are N+1, they could be combined into fewer queries using CTEs or subqueries.
- **Impact:** Dashboard load time scales linearly with query count. For large datasets, this could mean noticeable latency.
- **Recommendation:** Combine related metrics into 1-2 queries using SQL `WITH` clauses (CTEs). Use `Promise.all()` for queries that must remain separate.
- **Effort:** Medium

---

#### m-13 | No Monitoring, Alerting, or Observability
- **Severity:** Minor
- **Category:** 11 — DevOps & Deployment
- **Affected Files:** Entire application
- **Finding:** There is no application performance monitoring (APM), no structured logging, no metrics collection, no alerting on error rates, no tracing. The only observability is `console.log`/`console.error` output.
- **Impact:** Production issues will be invisible until users report them. No way to detect performance degradation, error spikes, or security incidents.
- **Recommendation:** Integrate: (1) structured logging with `pino`, (2) APM with DataDog, New Relic, or open-source (Prometheus + Grafana), (3) error tracking with Sentry, (4) health check endpoint that verifies DB and Redis connectivity.
- **Effort:** Medium

---

#### m-14 | Rate Limiter Fails Open When Redis Is Unavailable
- **Severity:** Minor
- **Category:** 2 — Security
- **Affected File:** `server/src/middleware/rateLimiter.ts:166-169`
- **Finding:** When the rate limiting middleware itself throws an exception (not the Redis store, which has its own fallback), it calls `next()` without enforcing any limit. This means a fundamental error in the rate limiter allows all requests through.
- **Impact:** An attacker who can cause the rate limiter to error (e.g., by sending malformed headers) could bypass rate limiting entirely.
- **Recommendation:** The outer catch block should either use the in-memory fallback or return 503 (Service Unavailable). Fail closed, not open.
- **Effort:** Low

---

#### m-15 | Deprecated `rounding_minutes` Setting Still Writable
- **Severity:** Minor
- **Category:** 3 — California Labor Law Compliance
- **Affected File:** `company_settings` table, `server/src/services/settings.service.ts`
- **Finding:** Migration 003 documents that time rounding is illegal per *Donohue v. AMN Services* (2021) and marks `rounding_minutes` as DEPRECATED/UNUSED. However, the column still exists, the settings service doesn't prevent updates to it, and an admin could set it to a non-zero value through the API.
- **Impact:** Low risk since the value is not used in calculations, but could create confusion or the false impression that rounding is active.
- **Recommendation:** Either drop the column entirely or add a CHECK constraint `rounding_minutes = 0`. Add a comment or validation in the settings service rejecting non-zero values.
- **Effort:** Low

---

### NITPICK Findings

---

#### N-01 | TypeScript `any` Usage in Test Helpers
- **Severity:** Nitpick
- **Category:** 8 — Code Quality & Maintainability
- **Affected File:** `server/src/test/helpers.ts:12`
- **Finding:** `mockQueryResult(rows: any[], rowCount?: number)` uses `any` instead of `unknown` or a generic type parameter.
- **Recommendation:** Use `<T>(rows: T[], rowCount?: number): QueryResult<T>`.
- **Effort:** Low

---

#### N-02 | Admin Dashboard Components Defined Inline
- **Severity:** Nitpick
- **Category:** 7 — Performance & Scalability
- **Affected File:** `apps/web/src/pages/admin/Dashboard.tsx:101-189`
- **Finding:** `StatCard` and `AlertCard` components are defined inside the Dashboard component, causing them to be re-created on every render.
- **Recommendation:** Extract to separate files or define outside the component with `React.memo()`.
- **Effort:** Low

---

#### N-03 | Company Settings Single-Row Pattern Has No Change History
- **Severity:** Nitpick
- **Category:** 4 — Database Design
- **Affected File:** `company_settings` table
- **Finding:** Settings changes overwrite the single row with no version history. There is no audit trail of who changed what setting and when.
- **Recommendation:** Add a `company_settings_history` table that logs each change with timestamp, actor, old value, and new value.
- **Effort:** Low

---

#### N-04 | E2E Tests Only Cover Employee Login and Dashboard
- **Severity:** Nitpick
- **Category:** 6 — Testing
- **Affected Files:** `e2e/employee-login.spec.ts`, `e2e/employee-dashboard.spec.ts`
- **Finding:** End-to-end tests cover only the employee login flow and basic dashboard rendering. No E2E tests for: admin workflows, time entry correction, waiver signing, attestation, compliance dashboard, settings management, or any error scenarios.
- **Recommendation:** Expand E2E suite to cover critical admin workflows and compliance-sensitive flows (waiver, attestation, certification).
- **Effort:** High

---

#### N-05 | `parseInt` Without Validation in Employee Import History
- **Severity:** Nitpick
- **Category:** 2 — Security
- **Affected File:** `server/src/routes/admin/employees.ts:285`
- **Finding:** `const limit = parseInt(req.query.limit as string) || 20` has no maximum validation. A request with `?limit=1000000` would attempt to fetch a million records.
- **Recommendation:** Add `Math.min(limit, 100)` or validate with Zod.
- **Effort:** Low

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 6 |
| Major | 14 |
| Minor | 15 |
| Nitpick | 5 |
| **Total** | **40** |

### By Category

| Category | Critical | Major | Minor | Nitpick | Total |
|----------|----------|-------|-------|---------|-------|
| 1. Architecture & Design | 0 | 1 | 0 | 0 | 1 |
| 2. Security | 1 | 5 | 3 | 1 | 10 |
| 3. CA Labor Law Compliance | 2 | 2 | 1 | 0 | 5 |
| 4. Database Design | 0 | 2 | 0 | 1 | 3 |
| 5. Error Handling & Resilience | 1 | 1 | 1 | 0 | 3 |
| 6. Testing | 1 | 0 | 0 | 1 | 2 |
| 7. Performance & Scalability | 0 | 0 | 1 | 1 | 2 |
| 8. Code Quality | 0 | 0 | 3 | 1 | 4 |
| 9. Frontend/UX | 0 | 1 | 2 | 0 | 3 |
| 10. Mobile | 0 | 0 | 1 | 0 | 1 |
| 11. DevOps & Deployment | 0 | 2 | 2 | 0 | 4 |
| 12. Legal & Compliance Risk | 1 | 0 | 0 | 0 | 1 |

---

## Recommended Priority Order

### Phase 1 — Block Production Deployment
1. **C-01** Fix MFA TOTP stub (Low effort, Critical security)
2. **C-04** Integrate audit logging into all state-changing routes (Medium effort, Critical legal)
3. **C-06** Add try/catch to all unhandled routes (Medium effort, Critical stability)
4. **M-03** Add security headers via `helmet` (Low effort, Major security)
5. **M-04** Rate-limit password reset endpoints (Low effort, Major security)
6. **M-07** Fix hardcoded migration credentials (Low effort, Major DevOps)
7. **M-13** Configure Express trust proxy (Low effort, Major security)

### Phase 2 — Compliance Parity
8. **C-02** Implement overtime calculation (High effort, Critical compliance)
9. **C-03** Implement 7th-day rule (High effort, Critical compliance)
10. **M-06** Fix waiver revocation query (Low effort, Major compliance)
11. **M-08** Fix premium pay for multiple violations (Medium effort, Major compliance)
12. **C-05** Write compliance logic unit tests (High effort, Critical quality)

### Phase 3 — Hardening
13. **M-01** Strengthen employee auth (per-account rate limiting) (Medium effort)
14. **M-05** Add password complexity requirements (Low effort)
15. **M-14** Fix race condition in punch recording (Medium effort)
16. **M-11** Move signatures to object storage (Medium effort)
17. **M-12** Add startup health checks with retry (Low effort)
18. **M-09** Add client-side Zod validation (Medium effort)
19. **M-02** Integrate or remove shared package (Medium effort)
20. **M-10** Build production Docker configuration (High effort)

### Phase 4 — Polish
21. Remaining minor and nitpick findings (m-01 through m-15, N-01 through N-05)

---

## Strengths Worth Noting

Despite the findings above, the codebase demonstrates several strong engineering decisions:

1. **SQL Parameterization** — All database queries use parameterized prepared statements. No SQL injection risks found.
2. **Bcrypt Hashing** — Passwords hashed with bcrypt at 12 rounds. Tokens hashed with SHA-256 before storage.
3. **Meal Break Logic** — The three-tier meal break detection (5h/10h/15h) with waiver eligibility checks is correctly implemented and well-structured.
4. **DST Handling** — Time calculations use Unix timestamps via `date-fns-tz`, correctly handling daylight saving time transitions.
5. **Midnight Crossing** — Overnight shift handling correctly attributes all hours to the shift start date.
6. **Code Splitting** — All 19 page components use `React.lazy()` with proper `Suspense` boundaries.
7. **CSRF Protection** — Double-submit cookie pattern with dedicated CSRF secret, properly scoped.
8. **Correction Workflow** — Time entry corrections use proper database transactions with `SELECT FOR UPDATE` and dual-approval workflow.
9. **Monorepo Organization** — Clean separation between web, mobile, server, and shared packages with workspace-level scripts.
10. **API Client** — Frontend API service has sophisticated retry logic, AbortController integration, and automatic CSRF token management.
