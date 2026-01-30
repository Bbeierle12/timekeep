import { Pool, PoolClient } from 'pg';
import { config } from '../config';

/**
 * A queryable database connection - either the pool or a transactional client.
 * Use this type when functions need to accept either for transaction support.
 */
export type Queryable = Pool | PoolClient;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Pool configuration for production readiness
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000 // Return error if can't connect within 2 seconds
});

// Set statement timeout on each new connection to prevent runaway queries
pool.on('connect', (client) => {
  client.query(`SET statement_timeout = ${config.dbStatementTimeoutMs}`);
});

// Handle pool errors to prevent unhandled promise rejections
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});
