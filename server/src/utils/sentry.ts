import * as Sentry from '@sentry/node';
import { config } from '../config';

const dsn = process.env.SENTRY_DSN;

export function initSentry(): void {
  if (!dsn) {
    if (config.nodeEnv === 'production') {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'SENTRY_DSN not set — error tracking disabled'
      }));
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: config.nodeEnv,
    // Only send errors, not performance data
    tracesSampleRate: 0,
    // Don't send PII by default
    sendDefaultPii: false,
  });
}

export { Sentry };
