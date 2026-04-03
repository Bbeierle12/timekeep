import { Pool, PoolClient } from 'pg';
import { config } from '../config';

/**
 * A queryable database connection - either the pool or a transactional client.
 * Use this type when functions need to accept either for transaction support.
 */
export type Queryable = Pool | PoolClient;

/**
 * Parse the DATABASE_URL to detect Supabase connection pooler (pgBouncer)
 * and adjust pool settings accordingly.
 *
 * Supabase provides two connection types:
 *   - Direct: postgres://...:5432/postgres  (supports prepared statements)
 *   - Pooler: postgres://...:6543/postgres  (pgBouncer, no prepared statements)
 *
 * When using the pooler, we must disable prepared statements by setting
 * `prepareThreshold: 0` (node-pg doesn't support this directly, but we can
 * pass it via the connection string or use simple query mode).
 */
function isSupabasePooler(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Supabase pooler typically uses port 6543 or has 'pooler' in hostname
    return parsed.port === '6543' || parsed.hostname.includes('pooler');
  } catch {
    return false;
  }
}

const usePooler = isSupabasePooler(config.databaseUrl);

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Pool configuration for production readiness
  max: usePooler ? 20 : 30, // Sized for 100+ concurrent users during shift changes
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: usePooler ? 5000 : 2000, // Supabase may need slightly more time
  // Supabase SSL requirement for production
  ssl: config.databaseUrl.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : undefined,
});

// Set statement timeout on each new connection to prevent runaway queries
pool.on('connect', (client) => {
  client.query('SET statement_timeout = $1', [String(config.dbStatementTimeoutMs)]);
});

// Handle pool errors to prevent unhandled promise rejections
pool.on('error', (err) => {
  // Use console.error here since logger may depend on config which imports early
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'Unexpected error on idle database client',
    error: err.message
  }));
});
