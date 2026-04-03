import type { Request, Response, NextFunction } from 'express';
import { createClient, type RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  constructor() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 60 * 1000);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    let entry = this.store.get(key);
    if (!entry || entry.resetTime < now) {
      entry = { count: 1, resetTime: now + windowMs };
      this.store.set(key, entry);
      return entry;
    }

    entry.count += 1;
    return entry;
  }
}

const redisScript = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

let redisClient: RedisClientType | null = null;
let redisReady: Promise<RedisClientType> | null = null;

async function getRedisClient() {
  if (!config.rateLimitRedisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ url: config.rateLimitRedisUrl });
    redisClient.on('error', (error) => {
      logger.warn('Redis rate limit error', { error: String(error) });
    });
  }

  if (redisClient.isReady) {
    return redisClient;
  }

  if (!redisReady) {
    redisReady = redisClient.connect().then(() => redisClient as RedisClientType).catch((error) => {
      redisReady = null;
      throw error;
    });
  }

  return redisReady;
}

class RedisRateLimitStore implements RateLimitStore {
  constructor(private fallback: RateLimitStore) {}

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    try {
      const client = await getRedisClient();
      if (!client) {
        return this.fallback.increment(key, windowMs);
      }

      const result = await client.eval(redisScript, {
        keys: [key],
        arguments: [String(windowMs)]
      });

      const [countRaw, ttlRaw] = Array.isArray(result) ? result : [0, -1];
      const count = typeof countRaw === 'number' ? countRaw : Number(countRaw);
      let ttlMs = typeof ttlRaw === 'number' ? ttlRaw : Number(ttlRaw);
      if (!Number.isFinite(ttlMs) || ttlMs < 0) {
        ttlMs = windowMs;
      }

      return { count, resetTime: Date.now() + ttlMs };
    } catch (error) {
      logger.warn('Rate limit redis fallback', { error: String(error) });
      return this.fallback.increment(key, windowMs);
    }
  }
}

const memoryStore = new MemoryRateLimitStore();
const rateLimitStore: RateLimitStore = config.rateLimitRedisUrl
  ? new RedisRateLimitStore(memoryStore)
  : memoryStore;

// Configuration
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const API_MAX_REQUESTS = 100; // Max requests per window for general API endpoints
const LOGIN_MAX_REQUESTS = 20; // Max login attempts per window per IP

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number
): void {
  res.set('RateLimit-Limit', String(limit));
  res.set('RateLimit-Remaining', String(Math.max(0, remaining)));
  res.set('RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
}

async function applyRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  options: { keyPrefix: string; maxRequests: number; windowMs: number; message: string }
) {
  try {
    const ip = getClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;
    const entry = await rateLimitStore.increment(key, options.windowMs);

    const remaining = options.maxRequests - entry.count;
    setRateLimitHeaders(res, options.maxRequests, remaining, entry.resetTime);

    if (entry.count > options.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        status: 'error',
        code: 'RATE_LIMITED',
        message: options.message,
        retryAfter
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Rate limiter failed', { error: String(error) });
    next();
  }
}

/**
 * Rate limiter for login endpoints - 20 requests per 15 minutes per IP
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  void applyRateLimit(req, res, next, {
    keyPrefix: 'login',
    maxRequests: LOGIN_MAX_REQUESTS,
    windowMs: WINDOW_MS,
    message: 'Too many login attempts. Please try again later.'
  });
}

/**
 * Rate limiter for auth routes (non-login) - 100 requests per 15 minutes per IP
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  void applyRateLimit(req, res, next, {
    keyPrefix: 'auth',
    maxRequests: API_MAX_REQUESTS,
    windowMs: WINDOW_MS,
    message: 'Too many requests. Please try again later.'
  });
}

/**
 * Global API rate limiter - 100 requests per 15 minutes per IP
 */
export function globalRateLimiter(req: Request, res: Response, next: NextFunction) {
  void applyRateLimit(req, res, next, {
    keyPrefix: 'api',
    maxRequests: API_MAX_REQUESTS,
    windowMs: WINDOW_MS,
    message: 'Too many requests. Please try again later.'
  });
}

/**
 * Factory function to create custom rate limiters
 */
export function createRateLimiter(maxRequests: number, windowMs: number = WINDOW_MS) {
  return function (req: Request, res: Response, next: NextFunction) {
    void applyRateLimit(req, res, next, {
      keyPrefix: `custom:${maxRequests}:${windowMs}`,
      maxRequests,
      windowMs,
      message: 'Too many requests. Please try again later.'
    });
  };
}
