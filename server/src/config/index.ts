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
  csrfEnabled: process.env.CSRF_ENABLED === 'true' || (nodeEnv === 'production' && process.env.CSRF_ENABLED !== 'false'),

  // Supabase configuration
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};

/**
 * Validate that all required environment variables are set.
 * Call this before starting the server to fail fast on misconfiguration.
 */
export function validateEnvironment(): void {
  const errors: string[] = [];

  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  if (config.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace_me') {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }
    if (!process.env.CSRF_SECRET) {
      errors.push('CSRF_SECRET must be set in production');
    }
    if (!config.supabaseUrl) {
      errors.push('SUPABASE_URL is required in production');
    }
    if (!config.supabaseServiceRoleKey) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required in production');
    }
  }

  if (errors.length > 0) {
    console.error('Environment validation failed:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}
