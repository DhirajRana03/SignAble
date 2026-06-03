/**
 * Lightweight client-only id generator. Used for ephemeral keys
 * (e.g. unsaved field placements). NOT cryptographically secure.
 */
const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function nanoid(size = 10): string {
  let out = '';
  for (let i = 0; i < size; i++) {
    out += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  }
  return out;
}
