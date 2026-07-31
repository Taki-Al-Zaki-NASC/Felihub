import { cache } from 'react';
import { db } from '@/server/db';
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
 * The session lookup itself is deliberately left as the one seam to fill when
 * we settle the auth provider (Step 2): swap the `userId` resolution, and
 * nothing downstream changes.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await resolveUserId();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, username: true, displayName: true, role: true,
      image: true, idSubmitted: true, depositPaid: true, kycStage: true,
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
    image: user.image,
    isVerified: isVerified(user),
    onboarded: Boolean(user.profile),
    unreadNotifications: user._count.notifications,
  };
});

/** Resolves the current user id from the auth cookie. Filled in at Step 2. */
async function resolveUserId(): Promise<string | null> {
  throw new Error(
    'Auth provider not wired yet — this is the Step 2 seam. '
    + 'Implement resolveUserId() in src/server/auth.ts.',
  );
}
