import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Request ID is declared in types/express.d.ts via module augmentation

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
