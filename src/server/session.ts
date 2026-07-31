import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

/**
 * The session cookie.
 *
 * A signed JWT holding nothing but the user id. Every other fact about the
 * account — role, verification, balances — is read from the database on each
 * request, because a claim baked into a cookie is a claim that keeps being
 * true after it stops being true. v1's most expensive class of bug was two
 * sources of truth for "is this account allowed to act"; a cookie carrying
 * role or verification would reintroduce exactly that.
 */
const COOKIE = 'felicek_session';
const DAYS = 30;

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Set it to a random string of at '
      + 'least 32 characters (`openssl rand -base64 32`).',
    );
  }
  return new TextEncoder().encode(raw);
}

/** True when sessions can be issued at all. Lets the UI say why, not crash. */
export const authConfigured = () => {
  const raw = process.env.AUTH_SECRET;
  return Boolean(raw && raw.length >= 32);
};

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user id, or null. Never throws — an unreadable or expired
 *  cookie is simply not a session. */
export async function readSession(): Promise<string | null> {
  if (!authConfigured()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
