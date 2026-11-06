import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
export const hashPassword = (pw) => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`; };
export const verifyPassword = (pw, stored) => {
  if (!stored || !stored.includes(':')) return false; const [salt, h] = stored.split(':');
  const a = Buffer.from(h, 'hex'); const b = scryptSync(pw, salt, 32); return a.length === b.length && timingSafeEqual(a, b);
};
export const randomToken = () => randomBytes(24).toString('hex');
export const crypto = { hashPassword, verifyPassword, randomToken };
