import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Pool configuration for production readiness
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000 // Return error if can't connect within 2 seconds
});

// Handle pool errors to prevent unhandled promise rejections
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});
