import { SignJWT } from 'jose';
import { db } from '@/server/db';
import { getSessionUser } from '@/server/auth';

/**
 * A short-lived token that lets one browser join one conversation's channel.
 *
 * Supabase Realtime authorises private channels against a JWT signed with the
 * project's JWT secret. This app does not use Supabase Auth — it has its own
 * session cookie — so the bridge is here: check the cookie, check that this
 * account is genuinely a member of the thread, and only then sign something
 * Realtime will accept.
 *
 * That check is the whole security of the feature. The anon key ships to every
 * browser, so without it anyone could subscribe to any channel name they could
 * guess and read other people's conversations as they were sent.
 *
 * Five minutes, because a token that outlives the tab is a credential nobody
 * is tracking. The client re-fetches when it reconnects.
 */
export const dynamic = 'force-dynamic';

const TTL_SECONDS = 300;

export async function GET(request: Request) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    // Realtime is optional. Saying so plainly beats a 500 on a deployment that
    // simply has not configured it.
    return Response.json(
      { ok: false, error: 'Realtime is not configured on this deployment.' },
      { status: 501 },
    );
  }

  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  const threadId = new URL(request.url).searchParams.get('thread') ?? '';
  if (!threadId) return Response.json({ ok: false }, { status: 400 });

  // Membership, from this app's own database. Everything else here is
  // plumbing; this line is the authorisation.
  const member = await db.threadMember.findUnique({
    where: { threadId_userId: { threadId, userId: user.id } },
    select: { threadId: true },
  }).catch(() => null);

  if (!member) {
    // Indistinguishable from a thread that does not exist — a different answer
    // here would confirm that a given thread id is real.
    return Response.json({ ok: false }, { status: 404 });
  }

  const token = await new SignJWT({
    // `sub` is what the channel policy reads back as the joining account.
    sub: user.id,
    role: 'authenticated',
    thread: threadId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(secret));

  return Response.json(
    { ok: true, token, expiresIn: TTL_SECONDS },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
