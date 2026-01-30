import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors';

export function requireEmployee(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    next(ApiError.unauthorized('MISSING_AUTH_CONTEXT', 'Missing auth context'));
    return;
  }

  if (req.user.type !== 'EMPLOYEE') {
    next(ApiError.forbidden('EMPLOYEE_REQUIRED', 'Employee access required'));
    return;
  }

  next();
}
