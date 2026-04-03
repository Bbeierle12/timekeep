import { pool } from '../db/connection';
import { logger } from '../utils/logger';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Run every hour

let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function cleanExpiredSessions(): Promise<void> {
  try {
    const sessionsResult = await pool.query(
      `DELETE FROM sessions WHERE expires_at < NOW() RETURNING id`
    );
    const challengesResult = await pool.query(
      `DELETE FROM mfa_challenges WHERE expires_at < NOW() RETURNING id`
    );

    const sessionsDeleted = sessionsResult.rowCount ?? 0;
    const challengesDeleted = challengesResult.rowCount ?? 0;

    if (sessionsDeleted > 0 || challengesDeleted > 0) {
      logger.info('Session cleanup completed', { sessionsDeleted, challengesDeleted });
    }
  } catch (error) {
    logger.error('Session cleanup failed', { error: (error as Error).message });
  }
}

export function startSessionCleanup(): void {
  // Run immediately on startup
  void cleanExpiredSessions();

  // Then run on interval
  intervalHandle = setInterval(() => {
    void cleanExpiredSessions();
  }, CLEANUP_INTERVAL_MS);
}

export function stopSessionCleanup(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
