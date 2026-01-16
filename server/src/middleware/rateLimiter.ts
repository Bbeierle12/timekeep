import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Max requests per window for general endpoints
const AUTH_MAX_REQUESTS = 10; // Max login attempts per window

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

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `auth:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 1, resetTime: now + WINDOW_MS };
    rateLimitStore.set(key, entry);
    return next();
  }

  entry.count++;

  if (entry.count > AUTH_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.',
      retryAfter
    });
    return;
  }

  next();
}

export function createRateLimiter(maxRequests: number, windowMs: number = WINDOW_MS) {
  return function(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIp(req);
    const key = `general:${ip}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.',
        retryAfter
      });
      return;
    }

    next();
  };
}
