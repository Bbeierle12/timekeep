import type { NextFunction, Request, Response } from 'express';

type AdminRole = 'owner' | 'admin' | 'read_only' | 'payroll' | 'compliance';

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

export function requireAdminRole(roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Missing auth context' });
      return;
    }

    if (req.user.type !== 'ADMIN') {
      res.status(403).json({ status: 'error', message: 'Admin access required' });
      return;
    }

    const role = req.user.role as AdminRole | undefined;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ status: 'error', message: 'Insufficient admin permissions' });
      return;
    }

    next();
  };
}
