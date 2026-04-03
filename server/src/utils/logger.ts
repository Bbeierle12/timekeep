import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const minLevel: LogLevel = config.nodeEnv === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) console.log(formatLog('debug', message, context));
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) console.log(formatLog('info', message, context));
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) console.warn(formatLog('warn', message, context));
  },
  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog('error')) console.error(formatLog('error', message, context));
  }
};
