import { initSentry } from './utils/sentry';
// Initialize Sentry before anything else so it can capture startup errors
initSentry();

import app from './app';
import { config, validateEnvironment } from './config';
import { pool } from './db/connection';
import { startSessionCleanup, stopSessionCleanup } from './jobs/sessionCleanup';
import { logger } from './utils/logger';

validateEnvironment();

const server = app.listen(config.port, () => {
  logger.info('Timekeep API started', { port: config.port, env: config.nodeEnv });
  startSessionCleanup();
});

// Graceful shutdown: drain in-flight requests, then close DB pool
function shutdown(signal: string) {
  logger.info('Shutdown initiated', { signal });
  stopSessionCleanup();

  // Stop accepting new connections; let in-flight requests finish
  server.close(async () => {
    logger.info('HTTP server closed, draining database pool');
    try {
      await pool.end();
      logger.info('Database pool closed, exiting');
    } catch (err) {
      logger.error('Error closing database pool', { error: (err as Error).message });
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
