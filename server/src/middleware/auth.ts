import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { hashToken } from '../utils/token';
import { pool } from '../db/connection';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Missing auth token' });
    return;
  }

  try {
    const payload = verifyToken(token) as { sub: string; type: 'ADMIN' | 'EMPLOYEE'; role?: string };
    const tokenHash = hashToken(token);
    const sessionResult = await pool.query(
      'SELECT expires_at FROM sessions WHERE token_hash = $1 LIMIT 1',
      [tokenHash]
    );

    if (sessionResult.rowCount === 0) {
      res.status(401).json({ status: 'error', message: 'Session not found' });
      return;
    }

    const expiresAt = sessionResult.rows[0].expires_at as Date;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      res.status(401).json({ status: 'error', message: 'Session expired' });
      return;
    }

    req.user = {
      id: payload.sub,
      type: payload.type,
      role: payload.role
    };
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Invalid auth token' });
  }
}
