import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';
import type { LedgerKind } from '@prisma/client';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago, money } from '@/lib/money';
import { Badge, Card, CardHeader, Empty, PageHeader, Stat } from '@/components/ui/card';
import { TopUp } from '@/components/wallet/top-up';

export const metadata: Metadata = { title: 'Wallet' };

/**
 * The ledger, shown as the ledger.
 *
 * Every row is a real `LedgerEntry`; nothing here is computed for display. The
 * platform fee and the gateway fee are separate rows because they are separate
 * charges — blending them is how a marketplace advertises 1% and collects
 * four, and a wallet page that adds them together makes that invisible.
 */
export default async function WalletPage() {
  const user = await requireUser();

  const [account, entries] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        walletBalanceCents: true, postingBalanceCents: true,
        totalEarnedCents: true, depositCents: true, depositReleased: true,
        depositKind: true,
      },
    }),
    db.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, kind: true, amountCents: true, label: true, createdAt: true,
      },
    }),
  ]);

  const hires = user.role !== 'FREELANCER';

  return (
    <>
      <PageHeader title="Wallet"
        description="Where your money is, and every movement that put it there." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hires ? (
          <Stat label="Posting balance" value={money(account.postingBalanceCents)}
            hint="Spendable into escrow" />
        ) : (
          <Stat label="Available" value={money(account.walletBalanceCents)}
            hint="Withdrawable now" />
        )}
        <Stat label={hires ? 'Withdrawable' : 'Earned all time'}
          value={money(hires ? account.walletBalanceCents : account.totalEarnedCents)} />
        <Stat label={account.depositKind === 'TRUST_BOND' ? 'Trust bond' : 'Deposit'}
          value={account.depositReleased ? 'Refunded' : money(account.depositCents)}
          hint={account.depositReleased ? 'Returned to you' : 'Held'} />
        <Stat label="Platform fee" value="1%"
          hint="Charged on release, shown separately" />
      </div>

      {hires && (
        <Card className="mt-6">
          <CardHeader title="Add to your posting balance"
            description="Escrow is funded from this balance, so it needs to cover what you plan to hire for." />
          <div className="p-5">
            <TopUp />
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Ledger"
          description="Newest first. Fees are itemised, never blended." />
        {entries.length === 0 ? (
          <div className="p-5">
            <Empty icon={Receipt} title="No movements yet"
              body="Deposits, escrow holds, releases, fees and payouts all appear here as separate lines." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3.5">
                <Badge tone={toneFor(e.kind)}>{label(e.kind)}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{e.label}</p>
                  <p className="text-xs text-ink-faint">{ago(e.createdAt)}</p>
                </div>
                <span className={`shrink-0 font-semibold ${e.amountCents < 0 ? 'text-danger' : 'text-teal-deep'}`}>
                  {e.amountCents < 0 ? '−' : '+'}{money(Math.abs(e.amountCents))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function label(kind: LedgerKind): string {
  return {
    DEPOSIT: 'deposit', ESCROW_HOLD: 'escrow', ESCROW_RELEASE: 'release',
    PLATFORM_FEE: 'felicek fee', GATEWAY_FEE: 'card fee',
    PAYOUT: 'payout', REFUND: 'refund',
  }[kind];
}

function toneFor(kind: LedgerKind) {
  if (kind === 'PLATFORM_FEE' || kind === 'GATEWAY_FEE') return 'amber' as const;
  if (kind === 'ESCROW_HOLD') return 'violet' as const;
  if (kind === 'ESCROW_RELEASE' || kind === 'PAYOUT') return 'teal' as const;
  return 'neutral' as const;
}
