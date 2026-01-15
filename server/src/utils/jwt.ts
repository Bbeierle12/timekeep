import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export function signToken(payload: object, expiresIn: SignOptions['expiresIn'] = '8h') {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret);
}
