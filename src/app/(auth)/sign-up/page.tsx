import type { Metadata } from 'next';
import { getSessionUser } from '@/server/auth';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { AlreadyDone } from '@/components/ui/already-done';

export const metadata: Metadata = {
  title: 'Create your account',
  description:
    'Join Felicek as a freelancer, client, agency or startup. Free to join, '
    + 'free to bid.',
};

const ROLES = ['FREELANCER', 'CLIENT', 'AGENCY', 'STARTUP'] as const;
type RoleValue = (typeof ROLES)[number];

/** `?role=client` from the landing page's two call-to-action buttons, so the
 *  choice someone already made is not asked again. */
function roleFrom(raw: string | string[] | undefined): RoleValue {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase();
  return ROLES.includes(value as RoleValue) ? (value as RoleValue) : 'FREELANCER';
}

export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (user) {
    return (
      <AlreadyDone
        title={`You already have an account`}
        body={`Signed in as ${user.displayName}. Sign out first if you want to create a second account.`}
        href="/dashboard" cta="Go to your dashboard" />
    );
  }
  const { role } = await searchParams;
  return <SignUpForm initialRole={roleFrom(role)} />;
}
