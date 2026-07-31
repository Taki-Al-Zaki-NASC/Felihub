'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { signInAction, type AuthResult } from '@/server/actions/auth';

/** Where "remember my email" is kept. Only the address — never the password,
 *  and never anything that would let this browser act as the account. */
const REMEMBERED = 'felicek.remembered-email';

export function SignInForm() {
  const [state, action] = useActionState<AuthResult | null, FormData>(
    signInAction, null,
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [remember, setRemember] = React.useState(false);

  // Read after mount: localStorage does not exist while the server renders,
  // and reading it during render would desynchronise the hydrated markup.
  React.useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBERED);
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  const onSubmit = () => {
    if (remember && email) window.localStorage.setItem(REMEMBERED, email);
    else window.localStorage.removeItem(REMEMBERED);
  };

  const fieldError = (k: string) => state?.fieldErrors?.[k];

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="font-serif text-2xl font-semibold">Log in</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Welcome back.
        </p>
      </div>

      <FormError>{state?.error}</FormError>

      <Field label="Email" name="email" type="email" autoComplete="email"
        placeholder="you@example.com" value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldError('email')} />

      <div className="relative">
        <Field label="Password" name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password" className="[&_input]:pr-11"
          error={fieldError('password')} />
        <button type="button" onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-[26px] flex h-11 w-10 items-center justify-center rounded text-ink-faint hover:text-ink">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <label className="flex min-h-[40px] w-fit cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded border-border-strong accent-teal" />
        Remember my email on this device
      </label>

      <Submit />

      <p className="text-center text-sm text-ink-muted">
        New to Felicek?{' '}
        <Link href="/sign-up" className="font-semibold text-teal-deep hover:underline">
          Create an account
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
      {pending ? 'Logging in…' : 'Log in'}
    </Button>
  );
}
