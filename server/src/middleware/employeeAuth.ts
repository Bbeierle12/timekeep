import type { NextFunction, Request, Response } from 'express';

export function requireEmployee(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Missing auth context' });
    return;
  }

  if (req.user.type !== 'EMPLOYEE') {
    res.status(403).json({ status: 'error', message: 'Employee access required' });
    return;
  }

  next();
}
