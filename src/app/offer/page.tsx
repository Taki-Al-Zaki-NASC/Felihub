import type { Route } from 'next';
import Link from 'next/link';
import { MarketingHeader, MarketingFooter } from '@/components/marketing-chrome';
import { CARD, LOCAL, PLATFORM_RATE, rateLabel } from '@/lib/fees';
import { DEPOSIT_CENTS } from '@/lib/types';
import { money } from '@/components/ui';

export const metadata = {
  title: 'Pricing — Felicek',
  description: 'A flat 1% platform fee, itemised separately from payment processing. No blended percentage, no surprise cut.',
};

export default function Offer() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Pricing</h1>
        <p className="mt-3 max-w-xl text-ink-muted">
          Two numbers, always shown apart: what the payment processor charges,
          and Felicek&apos;s own {(PLATFORM_RATE * 100).toFixed(0)}%. Blending
          them into one bigger figure is how a platform quietly charges more
          than it advertises — this one doesn&apos;t.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card-lg border border-teal/30 bg-teal-tint p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-deep">Felicek fee</p>
            <p className="mt-2 font-serif text-4xl font-semibold text-teal-deep">
              {(PLATFORM_RATE * 100).toFixed(0)}%
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Flat, on every milestone released. Same rate whether you&apos;re
              hiring or freelancing, whatever the amount.
            </p>
          </div>
          <div className="rounded-card-lg border border-border bg-neutral-tint p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Payment processing</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{CARD.label}</span>
                <span className="font-serif text-lg font-semibold">{rateLabel(CARD)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{LOCAL.label}</span>
                <span className="font-serif text-lg font-semibold">{rateLabel(LOCAL)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Set by the payment gateway, not Felicek. Local transfer is
              cheaper because there&apos;s no card network to pay.
            </p>
          </div>
        </div>

        <h2 className="mt-14 font-serif text-2xl font-semibold">Joining deposit</h2>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          A one-time refundable deposit is required to unlock posting or
          bidding — this isn&apos;t a fee, it&apos;s what makes an account cost
          something to abandon.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <DepositRow label="Freelancer trust bond" cents={DEPOSIT_CENTS.freelancer} note="Refundable" />
          <DepositRow label="Client / agency / startup posting balance" cents={DEPOSIT_CENTS.client} note="Spent into escrow" />
        </div>

        <div className="mt-14 flex flex-col items-start gap-3 rounded-card-lg border border-border-strong bg-ink-strong p-8 text-canvas sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold">See the exact number for your budget</h2>
            <p className="mt-1 text-sm text-white/70">The calculator uses this same math.</p>
          </div>
          <Link href={'/calculator' as Route}
            className="rounded-button bg-teal px-5 py-3 text-sm font-bold text-white hover:bg-teal-deep">
            Open calculator →
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

function DepositRow({ label, cents, note }: { label: string; cents: number; note: string }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-border bg-surface p-5">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-ink-muted">{note}</p>
      </div>
      <p className="font-serif text-2xl font-semibold text-teal-deep">{money(cents)}</p>
    </div>
  );
}
