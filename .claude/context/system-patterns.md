---
created: 2026-02-05T22:03:45Z
last_updated: 2026-02-05T22:03:45Z
version: 1.0
author: Claude Code PM System
---

# System Patterns

## Architecture Pattern

**Monorepo with Workspace Structure**
- Root `package.json` manages all workspaces
- Each app/package has its own `package.json`
- Shared code in `packages/shared`

## API Design

**RESTful API with versioning**
- Base path: `/api/v1/`
- Authentication routes: `/api/v1/auth/`
- Admin routes: `/api/v1/admin/`
- Employee routes: `/api/v1/employee/`

**Standard Response Format**
```typescript
{
  status: 'success' | 'error',
  data?: T,
  message?: string,
  code?: string
}
```

## Authentication Pattern

**Dual Authentication System**
- Admin: Email + password + optional MFA (TOTP)
- Employee: Flexible (PIN, password, initials+PIN)

**Session Management**
- JWT tokens stored in HTTP-only cookies
- CSRF protection via double-submit cookie pattern
- Separate session durations for admin vs employee

## Database Patterns

**UUID Primary Keys**
- All tables use UUID (via `gen_random_uuid()`)
- Exception: `company_settings` uses integer ID (single-row table)

**Timestamps**
- All tables include `created_at` and `updated_at`
- Timestamps in UTC

**Soft Deletes**
- Employees have `is_active` flag
- Time entries have `deleted_at` for soft delete

## Frontend Patterns

**Component Organization**
- `components/ui/` - Reusable UI primitives (shadcn/ui)
- `components/admin/` - Admin-specific components
- `components/employee/` - Employee-specific components

**State Management**
- Server state: TanStack Query
- Form state: React Hook Form
- Auth state: React Context

**Form Validation**
- Zod schemas for validation
- `@hookform/resolvers` for integration

## Error Handling

**Backend**
- Custom `ApiError` class with status codes
- Centralized error middleware
- Structured error responses

**Frontend**
- `ApiError` class mirrors backend
- Try/catch with user-friendly messages
- Toast notifications for errors

## Security Patterns

**Rate Limiting**
- Redis-based (production) or memory (development)
- Different limits for auth vs general endpoints

**CSRF Protection**
- Enabled in production by default
- X-CSRF-Token header required for mutations
- Token fetched from `/api/v1/csrf-token`

**Input Validation**
- Zod schemas on both frontend and backend
- Sanitization before database queries

## Testing Patterns

**Unit Tests**
- Vitest for both frontend and backend
- MSW for API mocking in frontend tests
- Supertest for API endpoint testing

**E2E Tests**
- Playwright for browser automation
- Axe-core for accessibility testing
