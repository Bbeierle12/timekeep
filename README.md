# Timekeep

Full-stack timekeeping and compliance platform for California meal and rest break rules.

## Workspace layout
- apps/web: Employee + admin web UI (React + Vite)
- apps/mobile: React Native mobile app (placeholder scaffold)
- packages/shared: Shared types and utilities
- server: API server (Node.js + Express + TypeScript)
- database: SQL schema
- docs: Product and technical documentation

## Quick start
1. Install dependencies at the workspace root:
   - npm install
2. Copy env files:
   - `server/.env.example` -> `server/.env`
   - `apps/web/.env.example` -> `apps/web/.env`
3. Start the API:
   - npm run dev:server
4. Start the web app:
   - npm run dev:web

Optional: Seed an initial admin (requires DB running and server env vars):
   - npm --workspace server run seed:admin

