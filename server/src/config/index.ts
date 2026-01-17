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
      console.warn('WARNING: CSRF_SECRET not set in production. CSRF protection is disabled.');
    }
    return 'dev_csrf_secret_not_for_production';
  }
  return secret;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: getJwtSecret(),
  csrfSecret: getCsrfSecret(),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173', 'http://localhost:3000'],
  // CSRF disabled by default in development, enabled by default in production
  csrfEnabled: process.env.CSRF_ENABLED === 'true' || (process.env.NODE_ENV === 'production' && process.env.CSRF_ENABLED !== 'false')
};
