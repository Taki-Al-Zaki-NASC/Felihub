import type { Metadata } from 'next';
import { getSessionUser } from '@/server/auth';
import { SignInForm } from '@/components/auth/sign-in-form';
import { AlreadyDone } from '@/components/ui/already-done';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to your Felicek account.',
};

export default async function SignIn() {
  const user = await getSessionUser();
  // Rendered, not redirected — see AlreadyDone for why the bounce broke the
  // browser's back button.
  if (user) {
    return (
      <AlreadyDone
        title={`Signed in as ${user.displayName}`}
        body="You already have a session on this device. There is nothing to log into."
        href="/dashboard" cta="Go to your dashboard" />
    );
  }
  return <SignInForm />;
}
