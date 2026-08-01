import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getSessionUser } from '@/server/auth';
import { enabledApps } from '@/server/services/apps';
import { APP_KEYS } from '@/lib/apps';

/**
 * The authenticated shell.
 *
 * A server component on purpose: the session resolves before any HTML ships,
 * so there is no authenticated-looking flash and no client-side redirect race.
 *
 * The gate is checked here *and* in every Server Action. This copy exists only
 * so a blocked account is told why, instead of filling in a form whose write
 * the database will refuse.
 */
/**
 * Never prerendered.
 *
 * Every page under here is one account's data. Without this, a build that runs
 * before DATABASE_URL is set resolves "no session", statically bakes the
 * redirect to /sign-in, and then serves that stale HTML to signed-in users
 * once the database *is* connected.
 */
export const dynamic = 'force-dynamic';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');
  if (!user.onboarded) redirect('/onboarding');
  if (!user.isVerified) redirect('/verify');

  // Resolved here rather than in the shell: the shell is a client component,
  // and the list has to be in the first HTML or the sidebar rearranges itself
  // after paint.
  const on = await enabledApps(user.id);
  const apps = APP_KEYS.filter((k) => on.has(k));

  return <AppShell user={user} apps={apps}>{children}</AppShell>;
}
