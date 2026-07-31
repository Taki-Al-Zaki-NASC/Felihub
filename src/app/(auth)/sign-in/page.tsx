import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/server/auth';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to your Felicek account.',
};

export default async function SignIn() {
  if (await getSessionUser()) redirect('/dashboard');
  return <SignInForm />;
}
