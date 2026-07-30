'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useSession } from '@/lib/session';
import { isDemoAccount } from '@/lib/demo';
import { useCollection, myJobs, myProposals, openJobs, byNewest } from '@/lib/queries';
import type { Job, Proposal } from '@/lib/schema';
import type { AppUser } from '@/lib/types';
import { Card, EmptyState, ErrorState, Loading, Pill, SectionLabel, money } from '@/components/ui';
import { JobRow } from '@/components/job-row';
import { BillingPanel } from '@/components/billing-panel';

/**
 * Role-aware home.
 *
 * A client sees what they have posted, what it is costing and what needs a
 * decision; a freelancer sees where their bids stand and what is worth bidding
 * on. Same split as the app's home screen, which is itself the Upwork
 * structure the brief asked for.
 *
 * Every number here is derived from documents the account can actually read,
 * and a failed read renders as an error rather than a zero — "0 jobs, $0 in
 * escrow" is a confident wrong answer about someone's money.
 */
export default function Dashboard() {
  const { user } = useSession();
  if (!user) return <Loading />;
  const posts = user.role !== 'freelancer';
  return (
    <>
      {isDemoAccount(user.email) && (
        <div className="mb-5 rounded-card border border-amber/40 bg-amber-tint px-4 py-2.5">
          <p className="text-xs">
            <strong>Demo account.</strong> This address can clear its deposit
            without paying. Remove it from the rules before taking real money.
          </p>
        </div>
      )}
      {posts ? <ClientHome user={user} /> : <FreelancerHome user={user} />}
    </>
  );
}

/* ── Client ──────────────────────────────────────────────────────────────── */

function ClientHome({ user }: { user: AppUser }) {
  const jobs = useCollection<Job>('jobs', myJobs(user.uid), [user.uid]);

  if (jobs.loading) return <Loading />;
  if (jobs.error) return <ErrorState message={jobs.error} />;

  const rows = byNewest(jobs.data);
  const open = rows.filter((j) => (j.status ?? 'open') === 'open');
  const active = rows.filter((j) => j.status === 'filled');
  const escrow = rows.reduce((sum, j) => sum + (j.escrowHeldCents ?? 0), 0);
  const proposals = rows.reduce((sum, j) => sum + (j.proposalsCount ?? 0), 0);
  // Listings carrying bids nobody has looked at are the thing most worth
  // surfacing: a proposal sitting unread is the freelancer's time being wasted.
  const awaiting = open.filter((j) => (j.proposalsCount ?? 0) > 0);

  return (
    <>
      <Header
        title={`Welcome back, ${user.displayName}`}
        subtitle="Your postings, your engagements, and what needs a decision."
        action={{ href: '/jobs/new' as Route, label: 'Post a job' }}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Open listings" value={String(open.length)} tone="teal" />
        <Metric label="In progress" value={String(active.length)} tone="blue" />
        <Metric label="Proposals received" value={String(proposals)} tone="violet" />
        <Metric label="Held in escrow" value={money(escrow)} tone="teal" />
      </div>

      {awaiting.length > 0 && (
        <section className="mt-8">
          <SectionLabel>Needs your review</SectionLabel>
          <div className="mt-3 space-y-2">
            {awaiting.slice(0, 3).map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}` as Route} className="block">
                <Card className="flex items-center justify-between gap-3 transition hover:border-border-strong">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{j.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {j.proposalsCount} proposal{j.proposalsCount === 1 ? '' : 's'} waiting
                    </p>
                  </div>
                  <Pill tone="blue">Review</Pill>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8">
        <BillingPanel user={user} escrowHeldCents={escrow} />
      </div>

      <section className="mt-9">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Your listings</SectionLabel>
          <span className="flex gap-4">
            <Link href={'/talent' as Route} className="text-xs font-bold text-teal-deep">
              Browse talent
            </Link>
            <Link href={'/jobs/new' as Route} className="text-xs font-bold text-teal-deep">
              Post a job
            </Link>
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {rows.length === 0 ? (
            <EmptyState
              title="No listings yet"
              message="Post a job and verified freelancers can start bidding."
            />
          ) : rows.map((j) => <JobRow key={j.id} job={j} owner />)}
        </div>
      </section>
    </>
  );
}

/* ── Freelancer ──────────────────────────────────────────────────────────── */

function FreelancerHome({ user }: { user: AppUser }) {
  const mine = useCollection<Proposal>('proposals', myProposals(user.uid), [user.uid]);
  const feed = useCollection<Job>('jobs', openJobs(), []);

  if (mine.loading || feed.loading) return <Loading />;

  const bids = byNewest(mine.data);
  const active = bids.filter(
    (p) => p.status === 'submitted' || p.status === 'shortlisted');
  const shortlisted = bids.filter((p) => p.status === 'shortlisted');
  const won = bids.filter((p) => p.status === 'accepted');
  const openFeed = byNewest(feed.data.filter((j) => (j.status ?? 'open') === 'open'));
  // Already-bid jobs are noise in a "what should I bid on" feed.
  const bidJobIds = new Set(bids.map((p) => p.jobId));
  const suggestions = openFeed.filter((j) => !bidJobIds.has(j.id));

  return (
    <>
      <Header
        title={`Welcome back, ${user.displayName}`}
        subtitle="Where your bids stand, and work worth bidding on."
        action={{ href: '/jobs' as Route, label: 'Find work' }}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Active bids" value={mine.error ? '—' : String(active.length)} tone="blue" />
        <Metric label="Shortlisted" value={mine.error ? '—' : String(shortlisted.length)} tone="violet" />
        <Metric label="Won" value={mine.error ? '—' : String(won.length)} tone="teal" />
        <Metric label="Jobs done" value={String(user.jobsDone ?? 0)} tone="teal" />
      </div>

      {mine.error && <div className="mt-4"><ErrorState message={mine.error} /></div>}

      {shortlisted.length > 0 && (
        <section className="mt-8">
          <SectionLabel>You have been shortlisted</SectionLabel>
          <div className="mt-3 space-y-2">
            {shortlisted.slice(0, 3).map((p) => (
              <Link key={p.id} href={`/jobs/${p.jobId}` as Route} className="block">
                <Card className="flex items-center justify-between gap-3 transition hover:border-border-strong">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.jobTitle ?? 'Listing'}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Your bid: {money(p.bidAmountCents ?? 0)}
                    </p>
                  </div>
                  <Pill tone="violet">Shortlisted</Pill>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8">
        <BillingPanel user={user} />
      </div>

      {active.length > 0 && (
        <section className="mt-9">
          <SectionLabel>Your open bids</SectionLabel>
          <div className="mt-3 space-y-2">
            {active.slice(0, 5).map((p) => (
              <Link key={p.id} href={`/jobs/${p.jobId}` as Route} className="block">
                <Card className="flex items-center justify-between gap-3 transition hover:border-border-strong">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.jobTitle ?? 'Listing'}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {money(p.bidAmountCents ?? 0)}
                    </p>
                  </div>
                  <Pill tone={p.status === 'shortlisted' ? 'violet' : 'neutral'}>
                    {p.status}
                  </Pill>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-9">
        <div className="flex items-center justify-between">
          <SectionLabel>Work you have not bid on</SectionLabel>
          <Link href={'/jobs' as Route} className="text-xs font-bold text-teal-deep">
            Browse all
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {feed.error ? <ErrorState message={feed.error} />
            : suggestions.length === 0 ? (
              <EmptyState
                title={openFeed.length === 0 ? 'Nothing open right now' : 'You have bid on everything open'}
                message={openFeed.length === 0
                  ? 'New listings appear here as clients post them.'
                  : 'New listings will show up here as they are posted.'} />
            ) : suggestions.slice(0, 8).map((j) => <JobRow key={j.id} job={j} />)}
        </div>
      </section>
    </>
  );
}

/* ── Shared ──────────────────────────────────────────────────────────────── */

function Header({ title, subtitle, action }: {
  title: string; subtitle: string; action?: { href: Route; label: string };
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
      </div>
      {action && (
        <Link href={action.href}
          className="rounded-button bg-ink-strong px-4 py-2.5 text-sm font-bold text-canvas hover:opacity-90">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: {
  label: string; value: string; tone: 'teal' | 'violet' | 'blue';
}) {
  const colour = { teal: 'text-teal-deep', violet: 'text-violet', blue: 'text-blue' }[tone];
  return (
    <Card>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-semibold ${colour}`}>{value}</p>
    </Card>
  );
}
