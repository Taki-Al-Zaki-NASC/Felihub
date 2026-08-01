import type { Role } from '@prisma/client';

/**
 * What the shell needs to know about who is signed in.
 *
 * `isVerified` is computed on the server (see server/services/verification.ts)
 * and passed down. It is never re-derived in a component: v1 shipped two
 * different definitions of "verified" — one in the client, one in the security
 * rules — and the UI unlocked actions the database then refused. One
 * definition, computed once, is the fix.
 */
export interface SessionUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  isVerified: boolean;
  onboarded: boolean;
  unreadNotifications: number;
  /**
   * Optional tools this account has switched on, from `AppInstall`.
   *
   * Carried on the session because the shell needs it to build the sidebar,
   * and a second query for it made every signed-in page wait two round trips
   * before rendering rather than one.
   */
  apps: string[];
}
