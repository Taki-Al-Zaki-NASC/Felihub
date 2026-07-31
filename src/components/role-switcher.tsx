'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session';
import { describeError, updateRole } from '@/lib/mutations';
import { isVerified, type UserRoleKey } from '@/lib/types';
import { useToast } from './toast';
import { Card, ErrorState, SectionLabel } from './ui';

/**
 * Change what side of the marketplace this account is on.
 *
 * Standalone, and saving on the click. It used to live inside the profile
 * form, which refuses to submit without a name and a bio of at least ten
 * characters — so anyone whose bio was short pressed a disabled button and the
 * role never moved. Nothing about switching sides should depend on having
 * written an "about" paragraph.
 */
const CHOICES: { key: UserRoleKey; label: string; blurb: string }[] = [
  { key: 'client', label: 'Client', blurb: 'Post jobs, browse talent, hire.' },
  { key: 'freelancer', label: 'Freelancer', blurb: 'Find work and bid on it.' },
  { key: 'agency', label: 'Agency', blurb: 'Hire as a team.' },
  { key: 'startup', label: 'Startup', blurb: 'Build a team.' },
];

export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const { user } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState<UserRoleKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function pick(role: UserRoleKey) {
    if (!user || busy || role === user.role) return;
    setBusy(role); setError(null);
    try {
      await updateRole(user.uid, role, isVerified(user));
      // No navigation: the session listens to users/{uid}, so the nav and the
      // dashboard re-render themselves the moment the write lands.
      toast.success(
        role === 'freelancer'
          ? 'Switched to Freelancer. You will now see Jobs and can bid.'
          : `Switched to ${CHOICES.find((c) => c.key === role)?.label}. You can now post jobs and browse talent.`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={compact ? '' : 'mt-8'}>
      <SectionLabel>Account type</SectionLabel>
      <p className="mt-1 text-xs text-ink-muted">
        Decides what you see: a freelancer gets Jobs and bids on them;
        everyone else gets Talent and posts work. Saves immediately.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {CHOICES.map((c) => {
          const active = user.role === c.key;
          return (
            <button key={c.key} type="button" onClick={() => void pick(c.key)}
              disabled={Boolean(busy)} aria-pressed={active}
              className={`rounded-card border px-4 py-3 text-left transition disabled:opacity-60 ${
                active
                  ? 'border-teal bg-teal-tint'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{c.label}</span>
                {active && <span className="text-xs font-bold text-teal-deep">Current</span>}
                {busy === c.key && <span className="text-xs text-ink-faint">Saving…</span>}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">{c.blurb}</span>
            </button>
          );
        })}
      </div>
      {error && <div className="mt-3"><ErrorState message={error} /></div>}
    </section>
  );
}

/**
 * Shown on the dashboard when the account is on the freelancing side.
 *
 * A client whose stored role says freelancer sees the wrong half of the
 * product with no clue why, and "my role will not change" is not something
 * anyone should have to diagnose. This names the state and fixes it in place.
 */
export function RoleMismatchHint() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  if (!user || user.role !== 'freelancer') return null;

  return (
    <Card className="mb-5 border-blue/30 bg-blue-tint">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs">
          <strong>This account is set to Freelancer</strong> — so it sees Jobs
          and bids on them. If you meant to hire, switch it to Client.
        </p>
        <button onClick={() => setOpen((v) => !v)}
          className="min-h-[36px] shrink-0 rounded-[9px] border border-border-strong bg-surface px-3.5 text-xs font-bold hover:bg-backdrop">
          {open ? 'Close' : 'Change'}
        </button>
      </div>
      {open && <div className="mt-4"><RoleSwitcher compact /></div>}
    </Card>
  );
}
