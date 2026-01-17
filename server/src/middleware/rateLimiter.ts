import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const API_MAX_REQUESTS = 100; // Max requests per window for general API endpoints
const LOGIN_MAX_REQUESTS = 20; // Max login attempts per window per IP

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

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

/**
 * Rate limiter for login endpoints - 20 requests per 15 minutes per IP
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `login:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 1, resetTime: now + WINDOW_MS };
    rateLimitStore.set(key, entry);
    setRateLimitHeaders(res, LOGIN_MAX_REQUESTS, LOGIN_MAX_REQUESTS - 1, entry.resetTime);
    return next();
  }

  entry.count++;
  const remaining = LOGIN_MAX_REQUESTS - entry.count;
  setRateLimitHeaders(res, LOGIN_MAX_REQUESTS, remaining, entry.resetTime);

  if (entry.count > LOGIN_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again later.',
      retryAfter
    });
    return;
  }

  next();
}

/**
 * Rate limiter for auth routes (non-login) - 100 requests per 15 minutes per IP
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `auth:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 1, resetTime: now + WINDOW_MS };
    rateLimitStore.set(key, entry);
    setRateLimitHeaders(res, API_MAX_REQUESTS, API_MAX_REQUESTS - 1, entry.resetTime);
    return next();
  }

  entry.count++;
  const remaining = API_MAX_REQUESTS - entry.count;
  setRateLimitHeaders(res, API_MAX_REQUESTS, remaining, entry.resetTime);

  if (entry.count > API_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retryAfter
    });
    return;
  }

  next();
}

/**
 * Global API rate limiter - 100 requests per 15 minutes per IP
 */
export function globalRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `api:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 1, resetTime: now + WINDOW_MS };
    rateLimitStore.set(key, entry);
    setRateLimitHeaders(res, API_MAX_REQUESTS, API_MAX_REQUESTS - 1, entry.resetTime);
    return next();
  }

  entry.count++;
  const remaining = API_MAX_REQUESTS - entry.count;
  setRateLimitHeaders(res, API_MAX_REQUESTS, remaining, entry.resetTime);

  if (entry.count > API_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retryAfter
    });
    return;
  }

  next();
}

/**
 * Factory function to create custom rate limiters
 */
export function createRateLimiter(maxRequests: number, windowMs: number = WINDOW_MS) {
  return function (req: Request, res: Response, next: NextFunction) {
    const ip = getClientIp(req);
    const key = `custom:${maxRequests}:${ip}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
      setRateLimitHeaders(res, maxRequests, maxRequests - 1, entry.resetTime);
      return next();
    }

    entry.count++;
    const remaining = maxRequests - entry.count;
    setRateLimitHeaders(res, maxRequests, remaining, entry.resetTime);

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        status: 'error',
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        retryAfter
      });
      return;
    }

    next();
  };
}
