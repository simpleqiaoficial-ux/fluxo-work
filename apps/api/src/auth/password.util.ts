import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

// scrypt é uma KDF lenta de propósito — diferente do sha256 usado pro hash do
// refresh token (auth.service.ts), que é um segredo de alta entropia, não uma
// senha escolhida por humano. Sem dependência nova: node:crypto já tem scrypt.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedHash = Buffer.from(hashHex, 'hex');

  return (
    storedHash.length === derivedKey.length &&
    timingSafeEqual(derivedKey, storedHash)
  );
}
