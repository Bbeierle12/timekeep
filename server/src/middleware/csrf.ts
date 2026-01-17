import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';

const {
  doubleCsrfProtection,
  generateToken,
  invalidCsrfTokenError
} = doubleCsrf({
  getSecret: () => config.csrfSecret,
  cookieName: '__Host-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    path: '/'
  },
  getTokenFromRequest: (req) => {
    // Token can come from header or body
    return (
      req.headers['x-csrf-token'] as string ??
      req.body?._csrf ??
      ''
    );
  }
});

export { generateToken, invalidCsrfTokenError };

/**
 * CSRF protection middleware
 * Only applies in production or when explicitly enabled
 * Safe methods (GET, HEAD, OPTIONS) are allowed through without token
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for safe methods (read-only)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF in development unless explicitly enabled
  if (!config.csrfEnabled && config.nodeEnv !== 'production') {
    return next();
  }

  return doubleCsrfProtection(req, res, next);
}

/**
 * Endpoint to get a CSRF token
 * Should be called before making state-changing requests
 */
export function getCsrfToken(req: Request, res: Response) {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
}
