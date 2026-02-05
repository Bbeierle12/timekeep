import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Middleware to enforce HTTPS in production
 * Redirects HTTP requests to HTTPS
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction) {
  // Skip in non-production environments
  if (config.nodeEnv !== 'production') {
    return next();
  }

  // Check X-Forwarded-Proto for proxied requests (common in cloud deployments like Railway, Render, etc.)
  const proto = req.headers['x-forwarded-proto'] || req.protocol;

  if (proto !== 'https') {
    // 301 permanent redirect to HTTPS
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    return res.redirect(301, httpsUrl);
  }

  next();
}
