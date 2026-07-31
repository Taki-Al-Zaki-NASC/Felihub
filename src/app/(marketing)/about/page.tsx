import Link from 'next/link';
import type { Metadata } from 'next';
import { Building2, Globe2, Scale, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Felicek',
  description:
    'Why Felicek verifies every account, charges 1%, and refuses to sell '
    + 'credits for the right to apply for work.',
};

export default function About() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            A marketplace that charges for the work, not for the chance to ask
            for it.
          </h1>
          <p className="mt-6 text-base text-ink-muted sm:text-lg">
            Felicek started from a specific irritation: on most freelance
            platforms, a freelancer pays to submit a proposal. Pay per
            application and the incentive inverts — the platform earns most when
            applications fail, because a failed application is a repeat
            purchase.
          </p>
          <p className="mt-4 text-base text-ink-muted sm:text-lg">
            So bidding here is free and stays free. Felicek earns 1% when money
            actually changes hands for delivered work, which means the platform
            only does well when a job does.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
        <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
          What we decided to build in, permanently
        </h2>
        <div className="mt-8 space-y-8">
          <Principle
            icon={Users}
            title="Everybody is verified — including the person paying"
            body="Verification is usually pointed one way: freelancers prove
                  themselves to clients. But the freelancer taking the job has
                  at least as much at risk. Identity and a deposit are required
                  from both sides before either can act, and neither can mark
                  their own payment as cleared."
          />
          <Principle
            icon={Scale}
            title="Fees are itemised, never blended"
            body="Felicek's 1% and the payment processor's charge always appear
                  as separate lines on the ledger. A platform that quotes one
                  low number and quietly folds card processing into it is
                  charging several times what it advertises, and counting on
                  nobody doing the arithmetic."
          />
          <Principle
            icon={Building2}
            title="Rules live in the database, not the interface"
            body="Hiding a button is not a rule. Every constraint that matters —
                  who may post, who may bid, who may read a challenge
                  submission, when a deliverable unlocks — is enforced on the
                  server against the data. The interface reflects those rules;
                  it does not decide them."
          />
          <Principle
            icon={Globe2}
            title="Built for where our users actually are"
            body="Felicek was built with Bangladesh and the wider region in
                  mind: national ID formats validated properly rather than by a
                  loose length check, local payment methods, and mobile-first
                  layouts sized for the phones people really use."
          />
        </div>
      </section>

      <section className="border-y border-border bg-surface py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            Where things stand
          </h2>
          <p className="mt-4 text-ink-muted">
            Felicek runs as a web platform and as an Android app sharing the
            same accounts and the same rules. We are early, we are building in
            the open, and the parts that are not finished are described as
            unfinished rather than dressed up.
          </p>
          <p className="mt-4 text-ink-muted">
            If something is broken or a fee is not clear, tell us — that is a
            faster route to a fix than anything else.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
          Join with a verified account
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-ink-muted">
          Browsing and bidding cost nothing. The deposit is yours — refundable
          for freelancers, spendable into escrow for hirers.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/sign-up">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/how-it-works">How it works</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function Principle({ icon: Icon, title, body }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; body: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-tint text-teal-deep">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
        <p className="mt-1.5 text-ink-muted">{body}</p>
      </div>
    </div>
  );
}
