# Deployment

## Architecture

- **Frontend (Web)**: Vercel - Static React app
- **Backend (API)**: Railway - Express.js server
- **Database**: Railway PostgreSQL (or Neon)

## Frontend - Vercel

Already configured via `vercel.json` in project root.

### Environment Variables (Vercel Dashboard)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-railway-url.up.railway.app` |

## Backend - Railway

### Quick Deploy

1. Go to [railway.app](https://railway.app) and create account
2. **New Project** → **Deploy from GitHub repo**
3. Select this repository
4. Set **Root Directory**: `server`

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
| `CORS_ORIGINS` | Yes | Your Vercel URL (e.g., `https://timekeep.vercel.app`) |
| `NODE_ENV` | Yes | Set to `production` |

### Initialize Database

After first deploy, run in Railway console:
```bash
pnpm seed:admin
```

### Get Your URL

Railway provides URL like: `https://timekeep-server-production.up.railway.app`

## Post-Deployment Checklist

- [ ] Railway backend deployed and healthy
- [ ] PostgreSQL database connected
- [ ] Admin seeded with `pnpm seed:admin`
- [ ] Vercel `VITE_API_URL` points to Railway URL
- [ ] Vercel redeployed after adding env var
- [ ] CORS_ORIGINS includes Vercel domain
- [ ] Test login works on production

## Local Development

```bash
# Start database
docker-compose up -d

# Start server
cd server && pnpm dev

# Start web
cd apps/web && pnpm dev
```

## Troubleshooting

### "Unable to connect to server"
- Check `VITE_API_URL` is set in Vercel
- Verify Railway server is running (check logs)
- Ensure CORS_ORIGINS includes your frontend domain

### CSRF errors
- `CSRF_SECRET` must be set in production
- Frontend and backend must share same domain scheme (both https)

### Database connection issues
- Check `DATABASE_URL` is set
- Verify PostgreSQL service is running in Railway
