import { createHash } from 'node:crypto';

/**
 * How a device token is stored.
 *
 * Its own module because a `'use server'` file may only export async
 * functions, and both the pairing action and the ingest route need this exact
 * function — two copies of a hashing rule is how a token stops matching itself
 * after somebody "tidies" one of them.
 *
 * SHA-256 rather than bcrypt on purpose: this is a 24-byte random value, not a
 * password, so there is nothing to brute-force and the ingest endpoint has to
 * do this on every request.
 */
export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
