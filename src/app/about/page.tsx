import Link from 'next/link';
import type { Route } from 'next';
import { MarketingHeader, MarketingFooter } from '@/components/marketing-chrome';

export const metadata = {
  title: 'About — Felicek',
  description: 'Why Felicek exists: verified accounts, escrow that actually holds, and a fee that stays flat.',
};

export default function About() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <span className="inline-block rounded-[9px] bg-teal-tint px-3 py-1.5 text-xs font-semibold text-teal-deep">
          About Felicek
        </span>
        <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          A marketplace where the guarantees are rules, not promises.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">
          Most freelance platforms take a large cut and leave trust to reviews
          and hope. Felicek starts from a different premise: an account
          shouldn&apos;t be able to bid or hire until it has cleared identity
          screening and put down a deposit, work shouldn&apos;t start until
          money is already sitting in escrow, and none of that should depend
          on anyone remembering to enforce it by hand.
        </p>

        <div className="mt-12 space-y-10">
          <Principle
            title="Enforced at the database, not the UI"
            body="Every guarantee this product makes — no unverified account can post or bid, an account can never mark its own payment as paid, a client can never read a freelancer's full challenge submission — is written as a Firestore security rule, not app logic. A client can be modified or bypassed. A database rule can't be, by the same account it's constraining."
          />
          <Principle
            title="A flat fee, shown separately from processing"
            body="Felicek's own fee is 1%, full stop. Payment processing (card networks, bank transfers) charges its own rate on top, and the two are always itemised separately — never blended into one bigger number that's harder to compare."
          />
          <Principle
            title="Honest about what verification actually checks"
            body="Identity photos are screened on-device — sharpness, exposure, resolution — which catches a photo a reviewer couldn't use. It does not, and cannot, confirm a document is genuine; no check running on the claimant's own phone ever could. See the FAQ for the specifics."
          />
        </div>

        <div className="mt-14 rounded-card-lg border border-border bg-neutral-tint p-6 sm:p-8">
          <h2 className="font-serif text-xl font-semibold">Built in the open, still early</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Felicek is a young product. Escrow, messaging, KYC screening and
            live skill challenges are built and working; a few pieces —
            payment webhooks, push notifications — are still ahead. What's
            live is real, not a demo.
          </p>
          <Link href={'/features' as Route}
            className="mt-4 inline-block text-sm font-bold text-teal-deep">
            See what&apos;s built →
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-ink-muted">{body}</p>
    </div>
  );
}
