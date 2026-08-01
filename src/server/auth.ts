import { cache } from 'react';
import { redirect } from 'next/navigation';
import { databaseConfigured, db } from '@/server/db';
import { readSession } from '@/server/session';
import { isVerified } from '@/server/services/verification';
import type { SessionUser } from '@/types/session';

/**
 * The signed-in account, or null.
 *
 * Wrapped in React's `cache` so the layout, the page and any Server Action in
 * the same request share one query rather than three.
 *
 * `isVerified` is computed here, once, from the single definition in
 * services/verification.ts — the interface never derives it independently.
 *
 * The session itself is a signed cookie carrying only a user id — see
 * server/session.ts for why nothing else is stored in it.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!databaseConfigured) return null;
  const userId = await readSession();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, username: true, displayName: true, role: true,
      idSubmitted: true, depositPaid: true, kycStage: true,
      _count: { select: { notifications: { where: { read: false } } } },
      profile: { select: { headline: true } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isVerified: isVerified(user),
    onboarded: Boolean(user.profile),
    unreadNotifications: user._count.notifications,
  };
});

/**
 * The session user, or a redirect. For Server Actions and pages that have no
 * meaning without an account — it removes the `if (!user) return` that is easy
 * to forget and impossible to notice when it is missing.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');
  return user;
}
