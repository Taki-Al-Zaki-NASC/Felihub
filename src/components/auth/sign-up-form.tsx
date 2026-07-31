'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Briefcase, Building2, Eye, EyeOff, Rocket, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { signUpAction, type AuthResult } from '@/server/actions/auth';

const ROLES = [
  { value: 'FREELANCER', label: 'Freelancer', blurb: 'I do the work', icon: User },
  { value: 'CLIENT', label: 'Client', blurb: 'I hire people', icon: Briefcase },
  { value: 'AGENCY', label: 'Agency', blurb: 'We hire as a team', icon: Building2 },
  { value: 'STARTUP', label: 'Startup', blurb: 'We are building', icon: Rocket },
] as const;

type RoleValue = (typeof ROLES)[number]['value'];

export function SignUpForm({ initialRole }: { initialRole: RoleValue }) {
  const [state, action] = useActionState<AuthResult | null, FormData>(
    signUpAction, null,
  );
  const [role, setRole] = React.useState<RoleValue>(initialRole);
  const [showPassword, setShowPassword] = React.useState(false);
  const fieldError = (k: string) => state?.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <h1 className="font-serif text-2xl font-semibold">Create your account</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Free to join. Verification and the deposit come next — you can look
          around before either.
        </p>
      </div>

      <FormError>{state?.error}</FormError>

      <fieldset>
        <legend className="text-sm font-semibold">How will you use Felicek?</legend>
        {/* A radiogroup rather than a select: it is the one choice that changes
            the whole product, and it should not be hidden behind a tap. */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ROLES.map(({ value, label, blurb, icon: Icon }) => {
            const active = role === value;
            return (
              <label key={value}
                className={`flex min-h-[56px] cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition
                  ${active
                    ? 'border-teal bg-teal-tint ring-1 ring-teal'
                    : 'border-border-strong bg-surface hover:bg-backdrop'}`}>
                <input type="radio" name="role" value={value} checked={active}
                  onChange={() => setRole(value)} className="sr-only" />
                <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-teal-deep' : 'text-ink-faint'}`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <span className="block truncate text-xs text-ink-muted">{blurb}</span>
                </span>
              </label>
            );
          })}
        </div>
        {fieldError('role') && (
          <p className="mt-1.5 text-sm text-danger">{fieldError('role')}</p>
        )}
      </fieldset>

      <Field label="Name" name="displayName" autoComplete="name"
        placeholder="Your name, or your company's"
        error={fieldError('displayName')} />

      <Field label="Email" name="email" type="email" autoComplete="email"
        placeholder="you@example.com" error={fieldError('email')} />

      <div className="relative">
        <Field label="Password" name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password" className="[&_input]:pr-11"
          hint="At least 10 characters."
          error={fieldError('password')} />
        <button type="button" onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-[26px] flex h-11 w-10 items-center justify-center rounded text-ink-faint hover:text-ink">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <Submit />

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-teal-deep hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}
      className="w-full">
      {pending ? 'Creating your account…' : 'Create account'}
    </Button>
  );
}
