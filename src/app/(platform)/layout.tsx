import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getSessionUser } from '@/server/auth';
import { APP_KEYS, type AppKey } from '@/lib/apps';

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

  // Already on the session — see the note in server/auth.ts about why this is
  // not a second query. Filtered through APP_KEYS so a row for a tool that has
  // since been removed cannot put a dead entry in the sidebar.
  const apps = APP_KEYS.filter((k) => user.apps.includes(k)) as AppKey[];

  return <AppShell user={user} apps={apps}>{children}</AppShell>;
}
