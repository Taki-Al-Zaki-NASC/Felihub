import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/server/auth';
import { SignUpForm } from '@/components/auth/sign-up-form';

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
  if (await getSessionUser()) redirect('/dashboard');
  const { role } = await searchParams;
  return <SignUpForm initialRole={roleFrom(role)} />;
}
