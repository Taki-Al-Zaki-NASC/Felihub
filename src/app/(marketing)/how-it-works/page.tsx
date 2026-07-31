import Link from 'next/link';
import type { Metadata } from 'next';
import {
  BadgeCheck, Banknote, EyeOff, FileLock2, HandCoins, Lock,
  MessageSquare, ScrollText, ShieldCheck, Undo2, Video, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'How Felicek works',
  description:
    'Identity verification and a refundable deposit on both sides, escrow '
    + 'funded per milestone, and owner-blind skill challenges. Here is each '
    + 'step, in order.',
};

/**
 * The page a sceptical visitor reads before creating an account. It answers
 * one question — "what actually stops the usual marketplace problems?" — so
 * every step names the mechanism rather than the intention.
 */
export default function HowItWorks() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-tint px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-deep">
            <BadgeCheck className="h-3.5 w-3.5" />
            How it works
          </span>
          <h1 className="mt-5 max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Trust you can check, rather than a badge you have to believe.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-ink-muted sm:text-lg">
            Most marketplaces ask you to trust a rating. Felicek puts identity
            and money on the line first — for the person hiring and the person
            working — and holds the payment in escrow until the work is
            accepted.
          </p>
        </div>
      </section>

      {/* Everyone, before anything else */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
        <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
          First, for everybody
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          The same two gates apply to every account, whichever side you are on.
          Until both are cleared you can look around, but you cannot post, bid
          or message.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <Gate
            icon={ScrollText}
            step="1"
            title="Prove who you are"
            body="A government ID and a selfie. Document numbers are checked
                  against their own check digits before anything is uploaded,
                  so a mistyped or invented number is caught on your device."
          />
          <Gate
            icon={Wallet}
            step="2"
            title="Place your deposit"
            body="$20 from freelancers, $50 from hirers. It is not a fee — a
                  freelancer's bond is refunded after their first completed
                  job, and a hirer's balance is spent into escrow on real work."
          />
          <Gate
            icon={ShieldCheck}
            step="3"
            title="Then the account opens"
            body="Posting, bidding and messaging unlock together. An account
                  cannot mark its own payment as received; only the payment
                  provider's confirmation can clear a deposit."
          />
        </div>
      </section>

      {/* Hiring */}
      <section id="hiring" className="scroll-mt-20 border-y border-border bg-surface py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            If you&rsquo;re hiring
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            For clients, agencies and startups.
          </p>

          <div className="mt-8 grid gap-x-10 gap-y-8 lg:grid-cols-2">
            <Flow
              tone="teal"
              steps={[
                ['Post the job, or go straight to someone',
                  'Write the scope, budget and milestones — or browse verified '
                  + 'freelancers in the talent directory and message one '
                  + 'directly. You do not have to post publicly to hire.'],
                ['Read bids that cost nothing to send',
                  'Nobody paid for the privilege of applying, so a bid means '
                  + 'the person wants the work — not that they had credits '
                  + 'left over this month.'],
                ['Interview in the app',
                  'Chat, a voice call or a video call, all inside Felicek. '
                  + 'Nothing moves to a personal number where the record '
                  + 'disappears.'],
                ['Fund the first milestone',
                  'The money leaves your posting balance into escrow. The '
                  + 'freelancer can see it is funded; they cannot touch it.'],
                ['Review, then release',
                  'Deliverables arrive watermarked. Approve the milestone and '
                  + 'the clean originals unlock at the same moment the payment '
                  + 'moves. Neither happens without the other.'],
              ]}
            />

            <div className="space-y-4">
              <Aside
                icon={HandCoins}
                title="What the $50 balance actually is"
                body="It is your money held on the platform, not a charge. Every
                      dollar of it can be spent into escrow on real work, and
                      the unspent remainder is withdrawable. It exists so that
                      posting a job costs something to someone who is not
                      serious."
              />
              <Aside
                icon={FileLock2}
                title="Why files are watermarked first"
                body="It removes the standoff. You get to inspect the real work
                      before paying, and the freelancer knows an unreleased
                      milestone cannot leave with a usable file."
              />
              <Aside
                icon={Video}
                title="Calls are peer to peer"
                body="Voice and video run directly between the two browsers over
                      WebRTC. Felicek passes the connection details and nothing
                      else — the media never lands on our servers."
              />
            </div>
          </div>

          <Button asChild size="lg" className="mt-10">
            <Link href="/sign-up">Create a hiring account</Link>
          </Button>
        </div>
      </section>

      {/* Freelancing */}
      <section id="freelancing" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
          If you&rsquo;re freelancing
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          The short version: bidding is free, and it stays free.
        </p>

        <div className="mt-8 grid gap-x-10 gap-y-8 lg:grid-cols-2">
          <Flow
            tone="violet"
            steps={[
              ['Verify once, then build the profile',
                'Identity, a photo, your skills, rate, work history and the '
                + 'testimonials clients leave you. The profile is what a hirer '
                + 'finds in the talent directory.'],
              ['Bid on anything you can do',
                'No credits, no monthly allowance, no paying to be seen. Your '
                + '$20 bond is the spam control, and you get it back after '
                + 'your first completed job.'],
              ['Take the skill challenge if you want the edge',
                'Some jobs attach a timed challenge. Your submission is '
                + 'readable only by you — the client sees a score and a short '
                + 'preview, never your full answer.'],
              ['Start once escrow is funded',
                'A milestone shows as funded before you write a line. If it is '
                + 'not funded, the job has not started.'],
              ['Deliver, get released, get paid',
                'Upload the work, the client approves, the clean files unlock '
                + 'and the payout is queued. Felicek takes 1%.'],
            ]}
          />

          <div className="space-y-4">
            <Aside
              icon={Undo2}
              title="The bond comes back"
              body="$20, refunded after your first completed job. It is on the
                    ledger as a deposit, not revenue — you can see it there the
                    whole time it is held."
            />
            <Aside
              icon={EyeOff}
              title="Owner-blind challenges"
              body="The answer key, your submission and the client's summary
                    live in three separate places. Showing a client somebody
                    else's full answer is not a permission we forgot to remove;
                    it is a query no part of the product performs."
            />
            <Aside
              icon={Banknote}
              title="1%, and the card fee shown separately"
              body="On $1,000 released, Felicek's fee is $10. The payment
                    processor's charge is its own line — blending the two is
                    how a platform advertises 1% and collects four."
            />
          </div>
        </div>

        <Button asChild size="lg" className="mt-10">
          <Link href="/sign-up">Create a freelancer account</Link>
        </Button>
      </section>

      {/* Disputes — the question everyone eventually asks */}
      <section className="border-y border-border bg-surface py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            When it goes wrong
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <Aside
              icon={Lock}
              title="Escrow does not auto-release"
              body="A funded milestone sits until the hirer approves it or a
                    dispute is resolved. It never drains back to either party on
                    a timer."
            />
            <Aside
              icon={MessageSquare}
              title="The record is in the app"
              body="Scope, messages, calls, deliverable uploads and every
                    approval are timestamped in one thread, so a dispute is read
                    from evidence rather than recollection."
            />
            <Aside
              icon={ShieldCheck}
              title="Both sides are identified"
              body="Nobody in the dispute is anonymous. That alone removes most
                    of the behaviour other marketplaces spend their moderation
                    budget on."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-center">
        <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
          Still deciding?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-ink-muted">
          The fee page has the exact numbers, including a worked example of what
          lands in a freelancer&rsquo;s account on a $1,000 milestone.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-7">
          <Link href="/pricing">See the fees</Link>
        </Button>
      </section>
    </>
  );
}

function Gate({ icon: Icon, step, title, body }: {
  icon: React.ComponentType<{ className?: string }>;
  step: string; title: string; body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-neutral-tint p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-teal-deep">
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-serif text-2xl font-semibold text-ink-faint">
          {step}
        </span>
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
    </div>
  );
}

function Flow({ tone, steps }: {
  tone: 'teal' | 'violet';
  steps: readonly (readonly [string, string])[];
}) {
  const chip = tone === 'teal' ? 'bg-teal' : 'bg-violet';
  const rail = tone === 'teal' ? 'bg-teal/20' : 'bg-violet/20';
  return (
    <ol className="space-y-6">
      {steps.map(([label, detail], i) => (
        <li key={label} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${chip}`}>
              {i + 1}
            </span>
            {i < steps.length - 1 && (
              <span className={`mt-1 w-px flex-1 ${rail}`} aria-hidden />
            )}
          </div>
          <div className="pb-1">
            <h3 className="font-semibold">{label}</h3>
            <p className="mt-1 text-sm text-ink-muted">{detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Aside({ icon: Icon, title, body }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-neutral-tint p-5">
      <h3 className="flex items-center gap-2.5 font-semibold">
        <Icon className="h-4.5 w-4.5 shrink-0 text-teal-deep" />
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
    </div>
  );
}
