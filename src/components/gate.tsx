'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/session';
import { Button, ErrorState, Loading, Wordmark } from './ui';
import { describeAuthError, repairAccountRecord, signOut } from '@/lib/auth-actions';
import type { UserRoleKey } from '@/lib/types';

/**
 * Routing gate. The web mirror of _SessionGate in app/lib/app/app.dart.
 *
 * An account cannot reach anything useful until identity and the deposit both
 * clear. Enforcing it here is convenience — firestore.rules is what actually
 * stops an unverified account posting or bidding.
 *
 * The pages that *resolve* a stage must not be gated by that stage. /verify
 * clears `verification` and /profile/setup clears `onboarding`; blocking either
 * behind its own stage makes a closed loop, where the screen offers a link and
 * the link renders the same screen. That shipped, and it left no way through
 * the app at all.
 */
const RESOLVES: Record<string, string> = {
  verification: '/verify',
  onboarding: '/profile/setup',
};

export function Gate({ children }: { children: React.ReactNode }) {
  const { stage, user, error } = useSession();
  const path = usePathname();

  if (stage === 'booting') return <Loading label="Signing you in…" />;

  if (stage === 'stalled') {
    return (
      <Shell>
        <ErrorState message={error ?? 'Your account could not be loaded.'} />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </Shell>
    );
  }

  if (stage === 'noAccountRecord') return <RepairAccount />;

  if (stage === 'signedOut') {
    return (
      <Shell>
        <p className="text-sm text-ink-muted">You need to be signed in to see this.</p>
        <Link href="/signin" className="mt-4 inline-block font-semibold text-teal-deep">
          Sign in
        </Link>
      </Shell>
    );
  }

  // Already on the page that clears this stage — let it render.
  if (RESOLVES[stage] === path) return <>{children}</>;

  if (stage === 'onboarding') {
    return (
      <Shell>
        <h1 className="font-serif text-2xl font-semibold">Finish your profile</h1>
        <p className="mt-2 text-sm text-ink-muted">
          A name and a short description of your work, so people know who they
          are dealing with.
        </p>
        <Link href="/profile/setup"
          className="mt-6 inline-block rounded-button bg-ink-strong px-5 py-3 text-sm font-bold text-canvas">
          Continue
        </Link>
        <SignOutLink />
      </Shell>
    );
  }

  if (stage === 'verification') {
    return (
      <Shell>
        <h1 className="font-serif text-2xl font-semibold">Verification required</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every Felicek account needs identity on file and a cleared deposit
          before it can post or bid. There is no skip.
        </p>
        <Link href="/verify"
          className="mt-6 inline-block rounded-button bg-ink-strong px-5 py-3 text-sm font-bold text-canvas">
          Verify {user?.displayName ? `as ${user.displayName}` : 'now'}
        </Link>
        <SignOutLink />
      </Shell>
    );
  }

  return <>{children}</>;
}

/**
 * Signed in with no account record behind it.
 *
 * Recoverable, and worth recovering in place: the email is already taken by
 * the Auth user, so "sign up again" is not available to the person this
 * happened to.
 */
function RepairAccount() {
  const [role, setRole] = useState<UserRoleKey>('freelancer');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function repair() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await repairAccountRecord(role, name);
      // No navigation needed: the users/{uid} listener fires on the new
      // document and the session moves to onboarding by itself.
    } catch (e) {
      setError(describeAuthError(e));
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 className="font-serif text-2xl font-semibold">Finish setting up</h1>
      <p className="mt-2 text-sm text-ink-muted">
        You are signed in, but this account has no profile behind it — sign-up
        was interrupted before it finished writing. Pick how you will use
        Felicek and it will be rebuilt. Nothing is lost; the account was never
        completed.
      </p>

      <label className="mt-6 block">
        <span className="text-xs font-semibold text-ink-muted">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Leave blank to use your email name"
          className="mt-1.5 w-full rounded-field border border-border bg-surface px-3.5 py-3 text-base outline-none focus:border-teal sm:text-sm" />
      </label>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-ink-muted">Account type</legend>
        <div className="mt-2 grid gap-2">
          {ROLE_CHOICES.map((r) => (
            <button type="button" key={r.key} onClick={() => setRole(r.key)}
              aria-pressed={role === r.key}
              className={`rounded-card border px-4 py-3 text-left transition ${
                role === r.key ? 'border-teal bg-teal-tint' : 'border-border bg-surface'
              }`}>
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="mt-0.5 block text-xs text-ink-muted">{r.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {error && <div className="mt-4"><ErrorState message={error} /></div>}

      <Button className="mt-5 w-full" busy={busy} onClick={repair}>
        Rebuild my account
      </Button>
      <SignOutLink />
    </Shell>
  );
}

const ROLE_CHOICES: { key: UserRoleKey; label: string; blurb: string }[] = [
  { key: 'freelancer', label: 'Freelancer', blurb: 'Bid on work. Refundable $20 trust bond.' },
  { key: 'client', label: 'Client', blurb: 'Post jobs. $50 posting balance.' },
  { key: 'agency', label: 'Agency', blurb: 'Hire as a team. $50 posting balance.' },
  { key: 'startup', label: 'Startup', blurb: 'Build a team. $50 posting balance.' },
];

/** Always offer a way out of a blocking screen, or it is a trap. */
function SignOutLink() {
  return (
    <button onClick={() => void signOut()}
      className="mt-5 block text-xs font-semibold text-ink-faint hover:text-danger">
      Sign out
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-5 py-16 sm:py-20">
      <Wordmark />
      <div className="mt-8 sm:mt-10">{children}</div>
    </main>
  );
}
