import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that adds deprecation headers to legacy API endpoints.
 * This signals to clients that they should migrate to the versioned API (/api/v1).
 *
 * Headers added:
 * - Deprecation: true
 * - Sunset: <date when endpoint will be removed>
 * - Link: <link to new versioned endpoint>
 */
export function deprecateEndpoint(sunsetDate?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add deprecation header (RFC 8594)
    res.setHeader('Deprecation', 'true');

    // Add sunset date if provided (RFC 8594)
    if (sunsetDate) {
      res.setHeader('Sunset', sunsetDate);
    }

    // Add link to versioned API
    const versionedPath = `/api/v1${req.path}`;
    res.setHeader('Link', `<${versionedPath}>; rel="successor-version"`);

    next();
  };
}
