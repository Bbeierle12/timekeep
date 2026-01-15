import type { NextFunction, Request, Response } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  if (req.user.type !== 'ADMIN') {
    res.status(403).json({ status: 'error', message: 'Admin access required' });
    return;
  }

  next();
}
