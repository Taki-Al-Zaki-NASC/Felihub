'use client';

import { useState } from 'react';
import { MarketingHeader, MarketingFooter } from '@/components/marketing-chrome';
import { CARD, LOCAL, breakdown, rateLabel, type GatewaySchedule } from '@/lib/fees';
import { money } from '@/components/ui';

/**
 * Real numbers from lib/fees.ts — the same function escrow.ts calls when a
 * milestone actually releases. Not a separate, prettier estimate.
 */
export default function Calculator() {
  const [cents, setCents] = useState(500_000); // $5,000
  const [schedule, setSchedule] = useState<GatewaySchedule>(CARD);

  const b = breakdown(cents, schedule);

  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Fee calculator</h1>
        <p className="mt-3 text-ink-muted">
          Move the slider. This runs the exact same {(0.01 * 100).toFixed(0)}%
          + processing math the app uses when a milestone is actually released
          — nothing here is a rounded-off estimate.
        </p>

        <div className="mt-10 rounded-card-lg border border-border bg-neutral-tint p-6 sm:p-8">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Milestone amount</span>
            <span className="font-serif text-2xl text-teal-deep">{money(cents)}</span>
          </div>
          <input
            type="range"
            min={1000}
            max={2_000_000}
            step={1000}
            value={cents}
            onChange={(e) => setCents(Number(e.target.value))}
            className="mt-4 w-full accent-teal"
            aria-label="Milestone amount in cents"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-faint">
            <span>$10</span>
            <span>$20,000</span>
          </div>

          <div className="mt-6 flex gap-2">
            {[CARD, LOCAL].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSchedule(s)}
                className={`rounded-[9px] px-3.5 py-2 text-sm font-semibold transition ${
                  schedule.key === s.key
                    ? 'bg-ink-strong text-canvas'
                    : 'border border-border-strong bg-surface text-ink-muted hover:bg-backdrop'
                }`}
              >
                {s.label} ({rateLabel(s)})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 divide-y divide-border rounded-card border border-border bg-surface">
          <Row label="Milestone amount" value={money(b.grossCents)} />
          <Row label={`Payment processing (${rateLabel(schedule)})`} value={`− ${money(b.gatewayCents)}`} muted />
          <Row label="Felicek platform fee (1%)" value={`− ${money(b.platformCents)}`} muted />
          <Row label={schedule === CARD ? 'Freelancer receives' : 'Freelancer receives'} value={money(b.netCents)} strong />
        </div>

        {b.feesExceedAmount && (
          <p className="mt-3 text-sm text-danger">
            At this amount, fixed processing fees exceed the milestone itself —
            fund a larger milestone, or use local transfer.
          </p>
        )}

        <p className="mt-8 text-xs text-ink-faint">
          Traditional marketplaces commonly charge 15–25% of the project total.
          On a {money(cents)} milestone via card, Felicek&apos;s total (processing
          + platform) is {money(b.totalFeeCents)} — {((b.totalFeeCents / Math.max(1, b.grossCents)) * 100).toFixed(1)}%.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Row({ label, value, muted, strong }: {
  label: string; value: string; muted?: boolean; strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className={`text-sm ${muted ? 'text-ink-muted' : 'font-medium'}`}>{label}</span>
      <span className={strong ? 'font-serif text-xl font-semibold text-teal-deep' : 'text-sm text-ink-muted'}>
        {value}
      </span>
    </div>
  );
}
