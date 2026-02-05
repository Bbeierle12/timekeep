---
created: 2026-02-05T22:03:45Z
last_updated: 2026-02-05T22:03:45Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory

```
timekeep/
├── apps/                    # Application packages
│   ├── web/                 # React web application
│   └── mobile/              # React Native mobile app
├── packages/
│   └── shared/              # Shared types and utilities
├── server/                  # Express API server
├── database/                # SQL schema files
├── docs/                    # Documentation
├── e2e/                     # End-to-end tests (Playwright)
├── .claude/                 # Claude Code configuration
├── .vercel/                 # Vercel project config
├── docker-compose.yml       # Local PostgreSQL setup
├── vercel.json              # Vercel deployment config
└── package.json             # Workspace root
```

## Web Application (`apps/web/`)

```
apps/web/src/
├── components/
│   ├── admin/               # Admin-specific components
│   │   ├── AdminLayout.tsx
│   │   ├── ComplianceDashboard.tsx
│   │   ├── EmployeeList.tsx
│   │   ├── EmployeeForm.tsx
│   │   ├── EmployeeImport.tsx
│   │   ├── TimeEntryTable.tsx
│   │   ├── ReportBuilder.tsx
│   │   └── ...
│   ├── employee/            # Employee-specific components
│   └── ui/                  # Reusable UI components (shadcn/ui)
├── context/                 # React context providers
├── hooks/                   # Custom React hooks
├── lib/                     # Utility libraries
├── pages/
│   ├── admin/               # Admin pages
│   └── employee/            # Employee pages
├── services/                # API client services
├── styles/                  # CSS/Tailwind styles
├── test/                    # Test utilities and mocks
├── types/                   # TypeScript type definitions
└── utils/                   # Helper functions
```

## Server (`server/`)

```
server/src/
├── config/                  # Configuration (env, constants)
├── db/
│   ├── connection.ts        # PostgreSQL pool setup
│   ├── queries/             # Database queries
│   └── seeds/               # Seed scripts
├── errors/                  # Custom error classes
├── middleware/              # Express middleware
│   ├── auth.ts              # Authentication
│   ├── csrf.ts              # CSRF protection
│   └── rateLimit.ts         # Rate limiting
├── models/                  # Data models
├── routes/
│   ├── admin/               # Admin API routes
│   ├── auth/                # Authentication routes
│   ├── employee/            # Employee API routes
│   └── index.ts             # Route aggregation
├── services/                # Business logic
├── test/                    # Test files
├── types/                   # TypeScript types
├── utils/                   # Helpers
├── app.ts                   # Express app setup
└── index.ts                 # Server entry point
```

## Database Schema (`database/`)

Single `schema.sql` file containing:
- `company_settings` - Global configuration
- `locations` - Sites/locations
- `admins` - Admin accounts
- `employees` - Employee records
- `time_entries` - Clock records
- `certifications` - Daily sign-offs
- `consent_records` - Employee consents
- `audit_log` - Change history
- Various supporting tables

## Documentation (`docs/`)

- `API.md` - API endpoint documentation
- `COMPLIANCE.md` - California labor law rules
- `DEPLOYMENT.md` - Deployment instructions
- `USER_GUIDE.md` - End-user documentation
