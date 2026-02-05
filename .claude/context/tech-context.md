---
created: 2026-02-05T22:03:45Z
last_updated: 2026-02-05T22:03:45Z
version: 1.0
author: Claude Code PM System
---

# Tech Context

## Language & Runtime

- **Language**: TypeScript 5.5+
- **Runtime**: Node.js (server), Browser (web), React Native (mobile)

## Frontend Stack (Web)

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 18.3.1 |
| Build Tool | Vite | 7.3.1 |
| Styling | Tailwind CSS | 3.4.10 |
| UI Components | Radix UI + shadcn/ui | Latest |
| Forms | React Hook Form + Zod | 7.71.1 / 4.3.5 |
| State/Cache | TanStack Query | 5.90.17 |
| Routing | React Router | 7.12.0 |
| Icons | Lucide React | 0.563.0 |
| Signatures | signature_pad | 5.1.3 |
| Testing | Vitest + Testing Library | 4.0.17 |
| Mocking | MSW | 2.12.7 |

## Backend Stack (Server)

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Express | 4.19.2 |
| Database | PostgreSQL | 16 |
| DB Client | pg | 8.12.0 |
| Auth | JWT (jsonwebtoken) | 9.0.2 |
| Password | bcryptjs | 2.4.3 |
| MFA | otplib | 13.2.1 |
| Rate Limiting | express-rate-limit + Redis | 7.4.0 / 4.7.0 |
| Security | Helmet, CSRF (csrf-csrf) | 8.1.0 / 3.0.3 |
| Validation | Zod | 3.23.8 |
| Date Handling | date-fns + date-fns-tz | 3.6.0 / 3.1.3 |
| Testing | Vitest + Supertest | 4.0.17 / 7.2.2 |
| Dev Runner | tsx | 4.19.1 |

## Mobile Stack (Placeholder)

| Category | Technology |
|----------|------------|
| Framework | React Native |
| Platform | Expo |
| Navigation | React Navigation (planned) |

## DevOps & Infrastructure

| Category | Technology |
|----------|------------|
| Package Manager | npm workspaces |
| Local DB | Docker Compose (PostgreSQL 16) |
| E2E Testing | Playwright |
| Web Hosting | Vercel |
| API Hosting | Railway (planned) |
| Database Hosting | Railway PostgreSQL (planned) |

## Key Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Workspace root, scripts |
| `tsconfig.base.json` | Shared TypeScript config |
| `vercel.json` | Vercel deployment |
| `docker-compose.yml` | Local PostgreSQL |
| `server/.env` | Server environment |
| `apps/web/.env` | Web app environment |
| `playwright.config.ts` | E2E test config |

## Environment Variables

### Server (`server/.env`)
```
PORT=4000
DATABASE_URL=postgres://...
JWT_SECRET=<secret>
CSRF_SECRET=<secret>
CORS_ORIGINS=http://localhost:5173
RATE_LIMIT_REDIS_URL=redis://... (optional)
```

### Web (`apps/web/.env`)
```
VITE_API_URL=http://localhost:4000
```
