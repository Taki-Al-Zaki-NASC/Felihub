'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useSession } from '@/lib/session';
import { isDemoAccount } from '@/lib/demo';
import { SAMPLE_JOBS, seedJobs, type SeedOutcome } from '@/lib/seed';
import { Button, Card, ErrorState, Pill, SectionLabel } from '@/components/ui';

/**
 * Sample data, for walking the product before it has real traffic.
 *
 * Restricted to the demo accounts — not because the seed is dangerous, but
 * because a "fill my account with fake listings" button has no business on a
 * real one. The restriction is cosmetic either way: the writes go through the
 * ordinary rules, so a non-verified account is refused by the server whatever
 * this page shows.
 */
export default function Seed() {
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outcome, setOutcome] = useState<SeedOutcome | null>(null);

  if (!user) return null;

  if (!isDemoAccount(user.email)) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-2xl font-semibold">Sample data</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This page is limited to the demo accounts listed in{' '}
          <code className="rounded bg-backdrop px-1.5 py-0.5 text-xs">src/lib/demo.ts</code>.
          Sign in as one of those to load sample listings.
        </p>
      </div>
    );
  }

  const verified = user.kyc.stage === 'verified' && user.kyc.depositPaid;

  async function run() {
    if (!user || busy) return;
    setBusy(true); setProgress(0); setOutcome(null);
    try {
      const result = await seedJobs(user.uid, user.displayName, (done) => setProgress(done));
      setOutcome(result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Sample data</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Posts {SAMPLE_JOBS.length} listings through the same function and the
        same security rules the real form uses. If this works, posting works.
      </p>

      {!verified && (
        <div className="mt-6">
          <ErrorState message={
            'This account is not verified yet, so the rules will refuse every '
            + 'listing. Clear identity and the deposit first.'
          } />
          <Link href={'/verify' as Route}
            className="mt-3 inline-block text-sm font-bold text-teal-deep">
            Go to verification →
          </Link>
        </div>
      )}

      <Card className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Load {SAMPLE_JOBS.length} sample listings</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Owned by this account — the rules do not allow posting on
              another&apos;s behalf.
            </p>
          </div>
          <Button busy={busy} disabled={!verified} onClick={run}>
            {busy ? `${progress}/${SAMPLE_JOBS.length}` : 'Load'}
          </Button>
        </div>

        {outcome && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm">
              <strong>{outcome.created}</strong> posted
              {outcome.failed > 0 && <>, <strong>{outcome.failed}</strong> refused</>}.
            </p>
            {outcome.firstError && (
              <p className="mt-1.5 text-xs text-danger">{outcome.firstError}</p>
            )}
            {outcome.created > 0 && (
              <Link href={'/jobs' as Route}
                className="mt-3 inline-block text-sm font-bold text-teal-deep">
                Browse them →
              </Link>
            )}
          </div>
        )}
      </Card>

      <section className="mt-10">
        <SectionLabel>Walking it end to end</SectionLabel>
        <ol className="mt-3 space-y-3">
          <Step n={1} title="Post as the client">
            Signed in as <code className="rounded bg-backdrop px-1 py-0.5 text-xs">demo@felicek.app</code>,
            load the listings above. They appear on your dashboard as your own.
          </Step>
          <Step n={2} title="Bid as the freelancer">
            Sign out, sign up as{' '}
            <code className="rounded bg-backdrop px-1 py-0.5 text-xs">demo.freelancer@felicek.app</code>{' '}
            with the freelancer role, verify, add a profile photo, then bid on
            those listings from <Link href={'/jobs' as Route} className="font-semibold text-teal-deep">Find work</Link>.
          </Step>
          <Step n={3} title="Hire and release">
            Back as the client, open the job, shortlist and hire. That funds
            escrow and opens the thread. Release a milestone and watch the fee
            split and the ledger line.
          </Step>
        </ol>
        <p className="mt-4 text-xs text-ink-faint">
          Both addresses are on the demo allowlist in the rules, so neither
          needs a real payment. Remove them before taking real money.
        </p>
      </section>

      <section className="mt-10">
        <SectionLabel>What gets posted</SectionLabel>
        <div className="mt-3 space-y-2">
          {SAMPLE_JOBS.map((j) => (
            <div key={j.title}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{j.title}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {j.milestones.length} milestone{j.milestones.length === 1 ? '' : 's'} ·{' '}
                  {j.skills.slice(0, 3).join(', ')}
                </p>
              </div>
              <Pill tone="teal">{j.budget}</Pill>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, children }: {
  n: number; title: string; children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-strong text-xs font-bold text-canvas">
        {n}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">{children}</span>
      </span>
    </li>
  );
}
