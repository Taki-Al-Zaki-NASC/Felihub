import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getSessionUser } from '@/server/auth';

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
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');
  if (!user.onboarded) redirect('/onboarding');
  if (!user.isVerified) redirect('/verify');

  return <AppShell user={user}>{children}</AppShell>;
}
