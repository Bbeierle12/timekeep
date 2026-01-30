import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors';

type AdminRole = 'owner' | 'admin' | 'read_only' | 'payroll' | 'compliance';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    next(ApiError.unauthorized('MISSING_AUTH_CONTEXT', 'Missing auth context'));
    return;
  }

  if (req.user.type !== 'ADMIN') {
    next(ApiError.forbidden('ADMIN_REQUIRED', 'Admin access required'));
    return;
  }

  next();
}

export function requireAdminRole(roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized('MISSING_AUTH_CONTEXT', 'Missing auth context'));
      return;
    }

    if (req.user.type !== 'ADMIN') {
      next(ApiError.forbidden('ADMIN_REQUIRED', 'Admin access required'));
      return;
    }

    const role = req.user.role as AdminRole | undefined;
    if (!role || !roles.includes(role)) {
      next(ApiError.forbidden('INSUFFICIENT_PERMISSIONS', 'Insufficient admin permissions'));
      return;
    }

    next();
  };
}
