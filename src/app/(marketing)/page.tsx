import Link from 'next/link';
import type { Metadata, Route } from 'next';
import {
  BadgeCheck, EyeOff, FileLock2, Landmark, Percent, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORIES, CATEGORY_BLURBS } from '@/lib/categories';

export const metadata: Metadata = {
  title: 'Hire, work, or back a startup — all verified',
  description:
    'Every account is identity-verified and deposit-backed before it can post, '
    + 'bid or pledge. Escrow on both the milestones and the raises, and a flat '
    + '1% fee shown separately from payment processing.',
};

const CLIENT_STEPS = [
  ['Post what you need', 'Scope, budget and milestones. A few minutes.'],
  ['Compare verified bids', 'Every bidder has identity on file and a deposit behind them.'],
  ['Fund a milestone', 'Money sits in escrow, not with the freelancer.'],
  ['Release when satisfied', 'Approve and the funds move. Not before.'],
] as const;

const FREELANCER_STEPS = [
  ['Verify once', 'A document and a selfie, screened on your own device.'],
  ['Bid for free', 'No credits to buy. Your deposit is the spam control, and it comes back.'],
  ['Prove your skill', 'Optional challenges — your full submission stays private to you.'],
  ['Get paid per milestone', 'Escrow-funded before you start, released as you deliver.'],
] as const;

const FUNDING_STEPS = [
  ['Say what you are building', 'The pitch, what exists today, and what the money is for.'],
  ['Account for the whole goal', 'The breakdown has to add up to it. The form will not take a raise where it does not.'],
  ['Backers pledge into escrow', 'Their money is committed, not promised — and it is not yours yet.'],
  ['All or nothing at the deadline', 'Hit the goal and it is paid out less 1%. Miss it and every pledge is refunded in full.'],
] as const;

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-tint px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-deep">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified before it can post, bid or pledge
            </span>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Hire it. Build it.
              <br className="hidden sm:block" /> Or help fund it.
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-muted sm:text-lg">
              One verified account, three things to do with it: get work done,
              get paid for work, or put money behind somebody building
              something. Identity checks and a refundable deposit are required
              to join — on every side. Money moves through escrow, and the
              platform fee is a flat 1%.
            </p>

            {/* Three, because there are now three things to do here and the
                demand side is not the one to demote — a marketplace with no
                clients has no work to browse. They wrap on a phone. */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg">
                <Link href="/sign-up?role=client">Post a job</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/browse">Find work</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/startups">Back a startup</Link>
              </Button>
            </div>
            {/* Straight to the listings, no account. Asking someone to verify
                their identity before they can find out whether there is any
                work worth verifying for is a strange order to do it in. */}
            <p className="mt-4 text-sm text-ink-muted">
              The work and the raises are both readable without an account.
            </p>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 rounded-lg border border-border bg-neutral-tint p-5">
              {[
                ['1%', 'flat platform fee'],
                ['$0', 'to browse, bid or back'],
                ['100%', 'accounts verified'],
              ].map(([big, small]) => (
                <div key={small}>
                  <dt className="font-serif text-2xl font-semibold text-teal-deep">{big}</dt>
                  <dd className="mt-0.5 text-xs text-ink-muted">{small}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Three doors, not two. The startup side is the newest and it is
              the reason the headline changed: somebody arriving with money to
              put behind an idea had nowhere to go on this page. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <RoleCard
              tone="teal"
              title="I need work done"
              points={[
                'Bids only from verified freelancers',
                'A $50 posting balance — your money, spent into escrow',
                'Release milestone by milestone',
              ]}
              cta="Post a job"
              href="/sign-up?role=client"
            />
            <RoleCard
              tone="violet"
              title="I'm looking for work"
              points={[
                'No credits to buy — bidding is free',
                'A $20 trust bond, refunded after your first job',
                'Your challenge submissions stay private',
              ]}
              cta="Find work"
              href="/browse"
            />
            <RoleCard
              tone="amber"
              title="I'm building something"
              points={[
                'Raise from clients and freelancers already here',
                'All or nothing — pledges refund in full if you miss the goal',
                'No equity, no shares: support for a specific piece of work',
              ]}
              cta="Raise or back"
              href="/startups"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-border bg-surface py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            Browse by category
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Open projects, readable without an account. Heaviest right now in
            applied AI, data engineering and evaluation work.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((name) => (
              // These used to point at the sign-up form. A category tile that
              // asks for an email instead of showing the category is the
              // oldest dark pattern in this business.
              <Link key={name} href={`/browse?category=${encodeURIComponent(name)}`}
                className="rounded-lg border border-border p-5 transition hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal-tint">
                <p className="font-semibold">{name}</p>
                <p className="mt-1 text-sm text-ink-muted">{CATEGORY_BLURBS[name]}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-serif text-2xl font-semibold sm:text-3xl">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          <Steps title="If you're hiring" steps={CLIENT_STEPS} tone="teal" />
          <Steps title="If you're freelancing" steps={FREELANCER_STEPS} tone="violet" />
          <Steps title="If you're raising" steps={FUNDING_STEPS} tone="amber" />
        </div>
      </section>

      {/* The claims worth making, because each is enforced rather than promised */}
      <section className="border-y border-border bg-surface py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            Enforced, not promised
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Each of these is a constraint in the database, not a setting in an
            admin panel. The app cannot bypass them, and neither can we.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Claim icon={ShieldCheck} title="No unverified account acts"
              body="Posting and bidding need identity on file and a cleared deposit. An account can never mark its own payment as received." />
            <Claim icon={EyeOff} title="Your work stays yours"
              body="A challenge submission is readable only by its author. The client sees a score and a short preview — never the full code or design." />
            <Claim icon={FileLock2} title="Deliverables held until paid"
              body="Files arrive watermarked. The clean original stays unreadable to the client until that milestone is released." />
            <Claim icon={Percent} title="Fees shown apart"
              body="Felicek's 1% and the payment processor's charge are always separate lines. Blending them is how a 1% platform quietly charges four." />
          </div>
        </div>
      </section>

      {/* Close */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="rounded-xl border border-border-strong bg-ink-strong px-6 py-14 text-center text-canvas sm:px-12">
          <Landmark className="mx-auto h-8 w-8 text-teal" />
          <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
            Start with a verified account.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">
            Browsing, bidding and backing cost nothing. The deposit is yours —
            refundable for freelancers, spendable into escrow for everyone else.
          </p>
          <Button asChild size="lg" variant="primary" className="mt-8">
            <Link href="/sign-up">Create your account</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function RoleCard({ tone, title, points, cta, href }: {
  tone: 'teal' | 'violet' | 'amber';
  title: string;
  points: readonly string[];
  cta: string;
  href: Route;
}) {
  const shell = {
    teal: 'border-teal/30 bg-teal-tint',
    violet: 'border-violet/30 bg-violet-tint',
    amber: 'border-amber/30 bg-amber-tint',
  }[tone];
  const accent = {
    teal: 'text-teal-deep', violet: 'text-violet', amber: 'text-amber',
  }[tone];
  return (
    <div className={`rounded-xl border p-5 ${shell}`}>
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-sm">
            <span className={`mt-0.5 font-bold ${accent}`} aria-hidden>✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {/* A real 40px target. It was a bare text link, 20px tall — the primary
          action on the card and the hardest thing on the page to tap. */}
      <Link href={href}
        className={`mt-3 inline-flex min-h-[40px] items-center text-sm font-bold ${accent}`}>
        {cta} →
      </Link>
    </div>
  );
}

function Steps({ title, steps, tone }: {
  title: string;
  steps: readonly (readonly [string, string])[];
  tone: 'teal' | 'violet' | 'amber';
}) {
  const chip = { teal: 'bg-teal', violet: 'bg-violet', amber: 'bg-amber' }[tone];
  return (
    <div>
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <ol className="mt-4 space-y-4">
        {steps.map(([label, detail], i) => (
          <li key={label} className="flex gap-3.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${chip}`}>
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold">{label}</span>
              <span className="mt-0.5 block text-sm text-ink-muted">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Claim({ icon: Icon, title, body }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-neutral-tint p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-teal-deep">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
    </div>
  );
}
