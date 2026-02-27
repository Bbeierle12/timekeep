# Deployment

## Architecture

- **Frontend + Backend**: Railway - Express.js serves both the API and the React SPA
- **Database**: Railway PostgreSQL (or Neon)

The server builds the web frontend and serves it as static files from the same origin, eliminating the need for a separate hosting provider (e.g., Vercel).

## Railway (All-in-One)

### Quick Deploy

1. Go to [railway.app](https://railway.app) and create account
2. **New Project** → **Deploy from GitHub repo**
3. Select this repository
4. Set **Root Directory**: `server`
5. Railway will use `railway.json` to build both the frontend and backend

### Add PostgreSQL

1. In Railway project: **+ New** → **Database** → **PostgreSQL**
2. `DATABASE_URL` is automatically linked

### Environment Variables (Railway Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Auto | Provided by Railway PostgreSQL |
| `PORT` | No | Defaults to Railway's assigned port |
| `JWT_SECRET` | Yes | Generate: `openssl rand -base64 32` |
| `CSRF_SECRET` | Yes | Generate: `openssl rand -base64 32` |
| `NODE_ENV` | Yes | Set to `production` |

> **Note**: `CORS_ORIGINS` and `VITE_API_URL` are no longer required since the frontend and API are served from the same origin.

### Initialize Database

After first deploy, run in Railway console:
```bash
pnpm seed:admin
```

### Get Your URL

Railway provides URL like: `https://timekeep-production.up.railway.app`

Both the web app and API are served from this single URL.

## Post-Deployment Checklist

- [ ] Railway service deployed and healthy
- [ ] PostgreSQL database connected
- [ ] Admin seeded with `pnpm seed:admin`
- [ ] `JWT_SECRET` and `CSRF_SECRET` set
- [ ] `NODE_ENV` set to `production`
- [ ] Test login works on production

## Local Development

```bash
# Start database + server (from project root)
npm run dev:server

# Start web (separate terminal)
cd apps/web && pnpm dev
```

In local dev, the web app runs on port 5173 and proxies API calls to port 4000. Set `VITE_API_URL=http://localhost:4000` in `apps/web/.env` for local development.

## Troubleshooting

### "Unable to connect to server"
- Verify Railway server is running (check logs)
- Ensure the health check passes at `/health`

### CSRF errors
- `CSRF_SECRET` must be set in production
- Frontend and backend share the same origin automatically

### Database connection issues
- Check `DATABASE_URL` is set
- Verify PostgreSQL service is running in Railway
