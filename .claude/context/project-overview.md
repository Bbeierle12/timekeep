---
created: 2026-02-05T22:03:45Z
last_updated: 2026-02-05T22:03:45Z
version: 1.0
author: Claude Code PM System
---

# Project Overview

## Architecture

Timekeep is a monorepo with three main applications:

| Component | Tech Stack | Purpose |
|-----------|------------|---------|
| Web App | React + Vite + TypeScript | Admin dashboard & employee portal |
| Mobile App | React Native + Expo | Employee clock-in/out (placeholder) |
| Server | Express + TypeScript + PostgreSQL | REST API backend |

## Current Feature Status

### Implemented
- Employee authentication (PIN, password, initials+PIN)
- Admin authentication with MFA support
- Clock in/out functionality
- Meal break tracking
- Rest break tracking
- Time entry certification with signature capture
- Employee management (CRUD, import via CSV)
- Compliance dashboard
- Violation logging
- Audit trail
- Report builder
- Geofence settings
- Notification settings
- CSRF protection
- Rate limiting (Redis-based)

### In Progress
- Mobile app (scaffold exists, not fully implemented)
- Push notifications
- Offline queue for mobile

### Planned
- Payroll export
- Advanced reporting
- Multi-location support

## Integration Points

- **Database**: PostgreSQL with comprehensive schema
- **Session Management**: JWT tokens with secure cookies
- **Rate Limiting**: Redis (optional, falls back to memory)
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway (planned)

## Key URLs

- Web App (local): http://localhost:5173
- API Server (local): http://localhost:4000
- Production Frontend: Vercel (configured)
- Production Backend: Railway (to be deployed)
