'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useSession } from '@/lib/session';
import { signOut } from '@/lib/auth-actions';
import { isDemoAccount, FREE_VERIFICATION } from '@/lib/demo';
import { DEPOSIT_CENTS, meetsMandatoryRequirements } from '@/lib/types';
import { Card, Loading, Pill, SectionLabel, money } from '@/components/ui';
import { RoleSwitcher } from '@/components/role-switcher';

/**
 * Account settings.
 *
 * Deliberately a status page rather than a control panel: almost everything
 * about an account is decided by the security rules, so offering a switch that
 * the server would refuse would be theatre. What is genuinely changeable links
 * to the page that changes it; what is not is stated with the reason.
 */
export default function Settings() {
  const { user } = useSession();
  if (!user) return <Loading />;

  const cleared = meetsMandatoryRequirements(user);
  const roleLabel = user.role === 'freelancer' ? 'Freelancer'
    : user.role === 'agency' ? 'Agency'
      : user.role === 'startup' ? 'Startup' : 'Client';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Your account, and what it is currently allowed to do.
      </p>

      <section className="mt-8">
        <SectionLabel>Account</SectionLabel>
        <Card className="mt-3 divide-y divide-border">
          <Row label="Email" value={user.email} note="Cannot be changed — the rules pin it to your sign-in." />
          <Row label="Name" value={user.displayName}
            action={{ href: '/profile/setup' as Route, label: 'Edit' }} />
        </Card>
      </section>

      <RoleSwitcher />

      <section className="mt-8">
        <SectionLabel>Verification</SectionLabel>
        <Card className="mt-3 divide-y divide-border">
          <Row label="Status"
            pill={cleared
              ? <Pill tone="teal">✓ Verified</Pill>
              : <Pill tone="amber">Incomplete</Pill>}
            action={{ href: '/verify' as Route, label: cleared ? 'View' : 'Finish' }} />
          <Row label="Identity" value={user.kyc.idSubmitted ? 'On file' : 'Not submitted'} />
          <Row label="Deposit"
            value={user.kyc.depositPaid
              ? `Cleared — ${money(user.kyc.depositAmountCents ?? DEPOSIT_CENTS[user.role])}`
              : `Outstanding — ${money(DEPOSIT_CENTS[user.role])}`}
            note={FREE_VERIFICATION
              ? 'Free while the beta payment gate is off.'
              : undefined} />
          {user.role === 'freelancer' && (
            <Row label="Trust bond"
              value={user.kyc.depositReleased ? 'Unlocked' : 'Locked until your first completed job'} />
          )}
        </Card>
      </section>

      <section className="mt-8">
        <SectionLabel>Notifications</SectionLabel>
        <Card className="mt-3">
          <p className="text-sm">
            Notifications appear in the app while it is open, and in the bell
            in the header.
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            There are no email or push notifications yet. Waking a closed
            browser needs a push service holding credentials on a server, which
            this project does not run — so rather than a switch that quietly
            does nothing, there is no switch.
          </p>
          <Link href={'/notifications' as Route}
            className="mt-3 inline-block text-sm font-bold text-teal-deep">
            Open notifications →
          </Link>
        </Card>
      </section>

      {isDemoAccount(user.email) && (
        <section className="mt-8">
          <SectionLabel>Demo account</SectionLabel>
          <Card className="mt-3 border-amber/40 bg-amber-tint">
            <p className="text-sm">
              This address is on the demo allowlist in the security rules, so
              it can clear its own deposit without paying.
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Remove it from <code className="rounded bg-canvas px-1 py-0.5">isDemoAccount()</code>{' '}
              before taking real money.
            </p>
          </Card>
        </section>
      )}

      <section className="mt-8">
        <SectionLabel>Session</SectionLabel>
        <Card className="mt-3">
          <button onClick={() => void signOut()}
            className="min-h-[44px] w-full rounded-button border border-danger/40 bg-surface px-5 text-sm font-bold text-danger transition hover:bg-danger-tint">
            Sign out
          </button>
          <p className="mt-3 text-xs text-ink-muted">
            Account deletion is not available here. The rules refuse it —
            <code className="mx-1 rounded bg-backdrop px-1 py-0.5">allow delete: if false</code>
            — because a deleted account would orphan the jobs, proposals and
            escrow records other people depend on.
          </p>
        </Card>
      </section>
    </div>
  );
}

function Row({ label, value, note, pill, action }: {
  label: string;
  value?: string;
  note?: string;
  pill?: React.ReactNode;
  action?: { href: Route; label: string };
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
        {pill ? <div className="mt-1">{pill}</div>
          : <p className="mt-0.5 break-words text-sm">{value}</p>}
        {note && <p className="mt-1 text-xs text-ink-muted">{note}</p>}
      </div>
      {action && (
        <Link href={action.href}
          className="shrink-0 text-xs font-bold text-teal-deep hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}
