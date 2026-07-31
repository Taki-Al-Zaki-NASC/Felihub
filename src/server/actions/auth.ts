'use server';

import { redirect } from 'next/navigation';
import { Prisma, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { databaseConfigured, db } from '@/server/db';
import { authConfigured, createSession, destroySession } from '@/server/session';

/**
 * Account creation and sign-in.
 *
 * Both actions return `{ error }` rather than throwing, because a wrong
 * password is an ordinary outcome and an error boundary is the wrong place to
 * explain it. Only genuinely exceptional failures throw.
 */

export interface AuthResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const ROLES = ['FREELANCER', 'CLIENT', 'AGENCY', 'STARTUP'] as const;

const signUpSchema = z.object({
  displayName: z.string().trim().min(2, 'Tell us your name.').max(80),
  email: z.string().trim().toLowerCase().email('That is not an email address.'),
  password: z.string()
    .min(10, 'Use at least 10 characters — length beats punctuation.')
    .max(200),
  role: z.enum(ROLES, { message: 'Choose how you will use Felicek.' }),
});

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('That is not an email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

/** Not a security control — it stops the common case of two people picking
 *  the same handle, and the unique index is what actually enforces it. */
function handleFrom(displayName: string, email: string): string {
  const base = (displayName || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'user';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

function unconfigured(): AuthResult | null {
  if (!databaseConfigured) {
    return {
      error: 'Accounts are not available yet: this deployment has no database '
        + 'connected. Set DATABASE_URL and DIRECT_URL, then run `prisma db push`.',
    };
  }
  if (!authConfigured()) {
    return {
      error: 'Accounts are not available yet: AUTH_SECRET is not set on this '
        + 'deployment, so sessions cannot be signed.',
    };
  }
  return null;
}

function flatten(error: z.ZodError): AuthResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] ??= issue.message;
  }
  return { fieldErrors };
}

export async function signUpAction(
  _prev: AuthResult | null,
  form: FormData,
): Promise<AuthResult> {
  const blocked = unconfigured();
  if (blocked) return blocked;

  const parsed = signUpSchema.safeParse({
    displayName: form.get('displayName'),
    email: form.get('email'),
    password: form.get('password'),
    role: form.get('role'),
  });
  if (!parsed.success) return flatten(parsed.error);

  const { displayName, email, password, role } = parsed.data;

  try {
    const user = await db.user.create({
      data: {
        email,
        displayName,
        username: handleFrom(displayName, email),
        role: role as Role,
        passwordHash: await bcrypt.hash(password, 12),
        // Everything below stays at its default: no account starts verified,
        // and nothing here can set depositPaid. Only a paid PaymentIntent can.
      },
      select: { id: true },
    });
    await createSession(user.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { email: 'That email already has an account.' } };
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      return { error: 'Could not reach the database. Check DATABASE_URL.' };
    }
    throw e;
  }

  // Outside the try: redirect() signals by throwing, and catching it here
  // would turn a successful sign-up into an error message.
  redirect('/onboarding');
}

export async function signInAction(
  _prev: AuthResult | null,
  form: FormData,
): Promise<AuthResult> {
  const blocked = unconfigured();
  if (blocked) return blocked;

  const parsed = signInSchema.safeParse({
    email: form.get('email'),
    password: form.get('password'),
  });
  if (!parsed.success) return flatten(parsed.error);

  const { email, password } = parsed.data;
  const wrong = { error: 'That email and password do not match an account.' };

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    // Same message either way, so the form cannot be used to discover which
    // email addresses are registered.
    if (!user?.passwordHash) return wrong;
    if (!(await bcrypt.compare(password, user.passwordHash))) return wrong;
    await createSession(user.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      return { error: 'Could not reach the database. Check DATABASE_URL.' };
    }
    throw e;
  }

  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}
