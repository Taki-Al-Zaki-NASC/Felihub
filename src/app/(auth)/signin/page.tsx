'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RedirectWhenSignedIn } from '@/components/auth-redirect';
import { describeAuthError, rememberedEmail, signIn } from '@/lib/auth-actions';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill from the last remembered sign-in. Read in an effect rather than in
  // useState's initialiser: localStorage does not exist during the server
  // render, and reading it inline would make the first client render disagree
  // with the server's and trip a hydration error.
  useEffect(() => {
    const saved = rememberedEmail();
    if (saved) setEmail(saved);
    else setRemember(false);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await signIn(email, password, remember);
      // Deliberately not clearing `busy` on success. The redirect happens when
      // the session resolves, a moment later; releasing the button first makes
      // the form look idle and finished while it is neither, which reads as a
      // dead button. The failure path below re-enables it.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <RedirectWhenSignedIn />
      <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-muted">Sign in to your Felicek account.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />

        <label className="flex items-start gap-2.5 py-1">
          <input type="checkbox" checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-teal" />
          <span>
            <span className="block text-sm font-medium">Keep me signed in</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {remember
                ? 'Stays signed in after you close the browser.'
                : 'Signs out when you close this tab — use this on a shared computer.'}
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-field bg-danger-tint px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full rounded-button bg-ink-strong px-5 py-3.5 text-sm font-bold text-canvas disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-teal-deep">Create an account</Link>
      </p>
    </main>
  );
}

function Field({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-field border border-border bg-surface px-3.5 py-3 text-base outline-none focus:border-teal sm:text-sm"
      />
    </label>
  );
}
