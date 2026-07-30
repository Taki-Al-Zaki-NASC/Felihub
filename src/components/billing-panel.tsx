'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCollection, byNewest } from '@/lib/queries';
import type { AppUser, WalletTransaction } from '@/lib/types';
import { Card, ErrorState, Pill, SectionLabel, money } from './ui';

/**
 * Money, for whichever side of the marketplace is looking.
 *
 * The ledger is the point. A single "balance" number invites the question
 * "made of what?", and for a freelancer the honest answer includes the fees
 * that were taken off — escrow.ts writes the credit and the fee as separate
 * rows precisely so a statement reconciles. Showing only the total would hide
 * the deduction this product advertises as itemised.
 */
export function BillingPanel({ user, escrowHeldCents }: {
  user: AppUser;
  /** Client only: total currently locked across their open jobs. */
  escrowHeldCents?: number;
}) {
  const ledger = useCollection<WalletTransaction>(
    `users/${user.uid}/transactions`, [], [user.uid]);
  const rows = byNewest(ledger.data).slice(0, 8);
  const freelancer = user.role === 'freelancer';

  return (
    <section>
      <div className="flex items-center justify-between">
        <SectionLabel>Billing</SectionLabel>
        <Link href={'/verify' as Route} className="text-xs font-bold text-teal-deep">
          Deposit status →
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {freelancer ? (
          <>
            <Money label="Available" value={user.walletBalanceCents ?? 0} tone="teal"
              note="Released to you, not yet withdrawn" />
            <Money label="Earned, lifetime" value={user.totalEarnedCents ?? 0} tone="blue"
              note="Gross, before fees" />
            <Money label="Trust bond" value={user.kyc.depositAmountCents ?? 0} tone="violet"
              note={user.kyc.depositReleased
                ? 'Unlocked — refundable'
                : 'Unlocks after your first completed job'} />
          </>
        ) : (
          <>
            <Money label="Posting balance" value={user.postingBalanceCents ?? 0} tone="teal"
              note="Spendable into escrow when you hire" />
            <Money label="Held in escrow" value={escrowHeldCents ?? 0} tone="violet"
              note="Committed to work in progress" />
            <Money label="Jobs completed" value={null} raw={String(user.jobsDone ?? 0)}
              tone="blue" note="Engagements closed out" />
          </>
        )}
      </div>

      <div className="mt-4">
        {ledger.loading ? null
          : ledger.error ? <ErrorState message={ledger.error} />
          : rows.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-muted">
                No transactions yet. {freelancer
                  ? 'Milestone releases and their fees appear here, as separate lines.'
                  : 'Escrow funding and releases appear here.'}
              </p>
            </Card>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {rows.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.label}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {t.createdAt?.seconds
                        ? new Date(t.createdAt.seconds * 1000).toLocaleDateString()
                        : 'Pending'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${
                    t.amountCents < 0 ? 'text-ink-muted' : 'text-teal-deep'
                  }`}>
                    {t.amountCents < 0 ? '−' : '+'}{money(Math.abs(t.amountCents))}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
    </section>
  );
}

function Money({ label, value, raw, tone, note }: {
  label: string; value: number | null; raw?: string;
  tone: 'teal' | 'blue' | 'violet'; note: string;
}) {
  const colour = { teal: 'text-teal-deep', blue: 'text-blue', violet: 'text-violet' }[tone];
  return (
    <Card>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-semibold ${colour}`}>
        {raw ?? money(value ?? 0)}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{note}</p>
    </Card>
  );
}
