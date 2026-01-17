import bcrypt from 'bcryptjs';

// Increased from 10 to 12 for improved security
const BCRYPT_ROUNDS = 12;

export async function hashPassword(value: string) {
  return bcrypt.hash(value, BCRYPT_ROUNDS);
}

export async function verifyPassword(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}
