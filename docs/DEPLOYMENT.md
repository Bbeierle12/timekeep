# Deployment

## Architecture

- **Frontend + Backend**: Railway - Express.js serves both the API and the React SPA
- **Database**: Supabase PostgreSQL (recommended) or Railway PostgreSQL

The server builds the web frontend and serves it as static files from the same origin, eliminating the need for a separate hosting provider (e.g., Vercel).

---

## Supabase Setup (Database)

TimeKeep uses Supabase as its PostgreSQL database host. The Express API server connects via the standard PostgreSQL connection string, and optionally uses the `@supabase/supabase-js` client for storage and real-time features.

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. **New Project** → choose a name, password, and region
3. Wait for the project to provision

### 2. Get Connection Details

From **Project Settings → Database**:

| Setting | Where to find it |
|---------|-----------------|
| `DATABASE_URL` | Connection string → URI (use the **Transaction pooler** on port `6543` for production) |
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key (keep secret!) |

### 3. Run Schema Migration

**Option A** — Supabase CLI (recommended):
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

**Option B** — SQL Editor:
1. Go to Supabase Dashboard → **SQL Editor**
2. Paste and run `supabase/migrations/20250304000001_initial_schema.sql`
3. Then run `supabase/migrations/20250304000002_rls_policies.sql`

### 4. Seed Initial Data

Run in the SQL Editor or via CLI:
```sql
-- From supabase/seed.sql
INSERT INTO company_settings (id, company_name, timezone)
VALUES (1, 'Your Company', 'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;
```

Then seed the admin account:
```bash
pnpm seed:admin
```

---

## Railway (API Server)

### Quick Deploy

1. Go to [railway.app](https://railway.app) and create account
2. **New Project** → **Deploy from GitHub repo**
3. Select this repository
4. Set **Root Directory**: `server`
5. Railway will use `railway.json` to build both the frontend and backend

### Environment Variables (Railway Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | Supabase connection string (transaction pooler, port 6543) |
| `SUPABASE_URL` | **Yes** | `https://[ref].supabase.co` |
| `SUPABASE_ANON_KEY` | **Yes** | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service role key (keep secret) |
| `PORT` | No | Defaults to Railway's assigned port |
| `JWT_SECRET` | **Yes** | Generate: `openssl rand -base64 32` |
| `CSRF_SECRET` | **Yes** | Generate: `openssl rand -base64 32` |
| `NODE_ENV` | **Yes** | Set to `production` |

> **Note**: `CORS_ORIGINS` and `VITE_API_URL` are no longer required since the frontend and API are served from the same origin.

### Get Your URL

Railway provides URL like: `https://timekeep-production.up.railway.app`

Both the web app and API are served from this single URL.

---

## Post-Deployment Checklist

- [ ] Supabase project created and schema migrated
- [ ] RLS policies applied (`20250304000002_rls_policies.sql`)
- [ ] Railway service deployed and healthy
- [ ] `DATABASE_URL` points to Supabase (transaction pooler)
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] Admin seeded with `pnpm seed:admin`
- [ ] `JWT_SECRET` and `CSRF_SECRET` set
- [ ] `NODE_ENV` set to `production`
- [ ] Test login works on production

---

## Local Development

### Option A: Supabase CLI (recommended)

```bash
# Start local Supabase (includes PostgreSQL, Studio, etc.)
supabase start

# Supabase will print local credentials — set DATABASE_URL accordingly
# Example: DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Start server (from project root)
npm run dev:server

# Start web (separate terminal)
cd apps/web && pnpm dev
```

### Option B: Docker Compose (offline PostgreSQL)

```bash
# Start local PostgreSQL only
docker compose up -d

# DATABASE_URL=postgres://timekeep:timekeep@localhost:5432/timekeep
npm run dev:server
```

In local dev, the web app runs on port 5173 and proxies API calls to port 4000. Set `VITE_API_URL=http://localhost:4000` in `apps/web/.env`.

---

## Troubleshooting

### "Unable to connect to server"
- Verify Railway server is running (check logs)
- Ensure the health check passes at `/health`

### CSRF errors
- `CSRF_SECRET` must be set in production
- Frontend and backend share the same origin automatically

### Database connection issues
- Check `DATABASE_URL` is set and uses the Supabase **transaction pooler** (port 6543)
- If using direct connection (port 5432), ensure your IP is allowlisted in Supabase dashboard
- Verify the database password is correct in the connection string
- For SSL issues, the connection module auto-detects `supabase.co` in the URL and enables SSL

### Supabase-specific issues
- **RLS blocking queries**: The Express server uses `service_role` key which bypasses RLS. If you're debugging via the Supabase dashboard SQL editor, queries run as `postgres` and are also unrestricted.
- **Connection pool exhaustion**: The pooler config uses `max: 10` connections when connecting through Supabase's pgBouncer. If you see connection errors, check active connections in Supabase dashboard.
- **Migration errors**: If a migration fails with "already exists", it's safe to ignore — migrations are idempotent.
