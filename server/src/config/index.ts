import { config as loadEnv } from 'dotenv';

loadEnv();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'replace_me') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    console.warn('WARNING: Using insecure default JWT_SECRET. Set JWT_SECRET env var for production.');
    return 'dev_secret_not_for_production';
  }
  return secret;
}

function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CSRF_SECRET must be set in production');
    }
    return 'dev_csrf_secret_not_for_production';
  }
  return secret;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const rateLimitRedisUrl = process.env.RATE_LIMIT_REDIS_URL ?? process.env.REDIS_URL ?? undefined;

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  // Statement timeout in milliseconds (default 30 seconds)
  dbStatementTimeoutMs: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 30000),
  jwtSecret: getJwtSecret(),
  csrfSecret: getCsrfSecret(),
  nodeEnv,
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173', 'http://localhost:3000'],
  authCookieName: nodeEnv === 'production' ? '__Host-timekeep-session' : 'timekeep_session',
  rateLimitRedisUrl,
  // CSRF disabled by default in development, enabled by default in production
  csrfEnabled: process.env.CSRF_ENABLED === 'true' || (nodeEnv === 'production' && process.env.CSRF_ENABLED !== 'false')
};
