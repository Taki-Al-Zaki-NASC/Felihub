import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'A flat 1% platform fee, always itemised separately from payment '
    + 'processing. No credits to buy, no bidding fees.',
};

/** The fee model, in one place. Server-rendered so it is quotable and
 *  indexable — a pricing page behind a login is a pricing page nobody reads. */
const GATEWAYS = [
  ['Card', '2.9% + $0.30', 'Set by the card networks, not by Felicek.'],
  ['Local transfer', '2%', 'Cheaper because there is no card network to pay.'],
] as const;

const DEPOSITS = [
  ['Freelancer trust bond', '$20', 'Refunded after your first completed job.'],
  ['Client / agency / startup', '$50', 'A posting balance — spent into escrow when you hire, not consumed.'],
] as const;

export default function Pricing() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Pricing</h1>
      <p className="mt-3 max-w-xl text-ink-muted">
        Two numbers, always shown apart: what the payment processor charges,
        and Felicek&apos;s own 1%. Blending them into one figure is how a
        platform quietly charges more than it advertises.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-teal/30 bg-teal-tint p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-deep">
            Felicek fee
          </p>
          <p className="mt-2 font-serif text-5xl font-semibold text-teal-deep">1%</p>
          <p className="mt-2 text-sm text-ink-muted">
            Flat, on each milestone released. The same rate whether you hire or
            freelance, whatever the amount.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-neutral-tint p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Payment processing
          </p>
          <dl className="mt-3 space-y-3">
            {GATEWAYS.map(([name, rate, note]) => (
              <div key={name}>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm font-medium">{name}</dt>
                  <dd className="font-serif text-lg font-semibold">{rate}</dd>
                </div>
                <p className="text-xs text-ink-muted">{note}</p>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <h2 className="mt-14 font-serif text-2xl font-semibold">
        What you never pay
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-ink-muted">
        <li>— No credits or connects. Bidding is free and unlimited.</li>
        <li>— No subscription, on either side.</li>
        <li>— No fee to browse, message, or be messaged.</li>
      </ul>

      <h2 className="mt-14 font-serif text-2xl font-semibold">Joining deposit</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        A one-time deposit unlocks posting and bidding. It is not a fee — it is
        what makes an account cost something to abandon, which is what keeps the
        marketplace free of throwaway accounts without charging per bid.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {DEPOSITS.map(([label, amount, note]) => (
          <div key={label}
            className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{label}</p>
              <p className="font-serif text-2xl font-semibold text-teal-deep">{amount}</p>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-xl border border-border bg-neutral-tint p-6">
        <h2 className="font-serif text-xl font-semibold">A worked example</h2>
        <p className="mt-1 text-sm text-ink-muted">
          A $1,000 milestone, released over local transfer.
        </p>
        <dl className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
          <Row label="Milestone" value="$1,000.00" />
          <Row label="Payment processing (2%)" value="− $20.00" muted />
          <Row label="Felicek platform fee (1%)" value="− $10.00" muted />
          <Row label="Freelancer receives" value="$970.00" strong />
        </dl>
      </div>

      <p className="mt-8 text-sm text-ink-muted">
        <Link href="/how-it-works" className="font-semibold text-teal-deep hover:underline">
          How escrow and milestones work →
        </Link>
      </p>
    </div>
  );
}

function Row({ label, value, muted, strong }: {
  label: string; value: string; muted?: boolean; strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <dt className={`text-sm ${muted ? 'text-ink-muted' : 'font-medium'}`}>{label}</dt>
      <dd className={strong
        ? 'font-serif text-xl font-semibold text-teal-deep'
        : 'text-sm text-ink-muted'}>
        {value}
      </dd>
    </div>
  );
}
