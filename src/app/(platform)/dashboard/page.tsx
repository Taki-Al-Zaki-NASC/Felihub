import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Briefcase, FileText, Inbox, PlusCircle, Search, Users, Wallet,
} from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { money, ago } from '@/lib/money';
import { Badge, Card, CardHeader, Empty, PageHeader, Stat } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Two different dashboards behind one route.
 *
 * v1 rendered the freelancer's "Find work" view to clients because the role
 * check lived in a component that ran before the session had loaded. Here the
 * role is resolved on the server before any HTML exists, so the wrong view is
 * not something that can flash and then correct itself — it is a branch that
 * happens once, in one place.
 */
export default async function Dashboard() {
  const user = await requireUser();
  return user.role === 'FREELANCER'
    ? <FreelancerDashboard userId={user.id} name={user.displayName} />
    : <HirerDashboard userId={user.id} name={user.displayName} />;
}

async function HirerDashboard({ userId, name }: { userId: string; name: string }) {
  const [account, jobs, proposalCount] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { postingBalanceCents: true, walletBalanceCents: true },
    }),
    db.job.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, title: true, status: true, budgetCents: true,
        proposalsCount: true, escrowHeldCents: true, createdAt: true,
      },
    }),
    db.proposal.count({
      where: { job: { ownerId: userId }, status: 'SUBMITTED' },
    }),
  ]);

  const escrow = jobs.reduce((sum, j) => sum + j.escrowHeldCents, 0);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${name.split(' ')[0]}`}
        description="Your postings, the bids waiting on you, and where your money is."
        action={
          <Button asChild>
            <Link href="/jobs/new">
              <PlusCircle className="h-4 w-4" /> Post a job
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Posting balance" value={money(account.postingBalanceCents)}
          hint="Yours — spendable into escrow" />
        <Stat label="Held in escrow" value={money(escrow)}
          hint="Funded, not yet released" />
        <Stat label="Bids to review" value={String(proposalCount)}
          hint={proposalCount ? 'Waiting on you' : 'Nothing waiting'} />
        <Stat label="Open postings"
          value={String(jobs.filter((j) => j.status === 'OPEN').length)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="Your postings" action={
            <Button asChild variant="outline" size="sm">
              <Link href="/contracts">All contracts</Link>
            </Button>
          } />
          {jobs.length === 0 ? (
            <div className="p-5">
              <Empty icon={Briefcase} title="No postings yet"
                body="Describe what you need and verified freelancers can bid on it. It takes a few minutes."
                cta={{ href: '/jobs/new', label: 'Post your first job' }} />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-neutral-tint">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{job.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Posted {ago(job.createdAt)} · {job.proposalsCount}{' '}
                        {job.proposalsCount === 1 ? 'bid' : 'bids'}
                        {job.escrowHeldCents > 0 && ` · ${money(job.escrowHeldCents)} in escrow`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{money(job.budgetCents)}</span>
                    <Badge tone={job.status === 'OPEN' ? 'teal' : 'neutral'}>
                      {job.status.toLowerCase()}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Next steps" />
          <ul className="divide-y divide-border">
            <Next href="/talent" icon={Users} label="Browse verified talent"
              detail="Message someone directly — you do not have to post publicly." />
            <Next href="/wallet" icon={Wallet} label="Top up your balance"
              detail="Escrow can only be funded from your posting balance." />
            <Next href="/messages" icon={Inbox} label="Open your messages"
              detail="Interviews, calls and files all live in the thread." />
          </ul>
        </Card>
      </div>
    </>
  );
}

async function FreelancerDashboard({ userId, name }: { userId: string; name: string }) {
  const [account, proposals, openJobs] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        walletBalanceCents: true, totalEarnedCents: true,
        depositCents: true, depositReleased: true,
      },
    }),
    db.proposal.findMany({
      where: { freelancerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, bidCents: true, status: true, createdAt: true,
        job: { select: { id: true, title: true, status: true } },
      },
    }),
    db.job.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, title: true, budgetCents: true, skills: true,
        proposalsCount: true, createdAt: true,
      },
    }),
  ]);

  const active = proposals.filter((p) => p.status === 'ACCEPTED').length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${name.split(' ')[0]}`}
        description="Your bids, your earnings, and work that just opened."
        action={
          <Button asChild>
            <Link href="/jobs"><Search className="h-4 w-4" /> Find work</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Available" value={money(account.walletBalanceCents)}
          hint="Withdrawable now" />
        <Stat label="Earned all time" value={money(account.totalEarnedCents)} />
        <Stat label="Active contracts" value={String(active)} />
        <Stat label="Trust bond"
          value={account.depositReleased ? 'Refunded' : money(account.depositCents)}
          hint={account.depositReleased
            ? 'Returned after your first job'
            : 'Returns after your first completed job'} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="Your bids" action={
            <Button asChild variant="outline" size="sm">
              <Link href="/contracts">All contracts</Link>
            </Button>
          } />
          {proposals.length === 0 ? (
            <div className="p-5">
              <Empty icon={FileText} title="You have not bid on anything yet"
                body="Bidding is free and always will be — there are no credits to buy here."
                cta={{ href: '/jobs', label: 'Find work to bid on' }} />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {proposals.map((p) => (
                <li key={p.id}>
                  <Link href={`/jobs/${p.job.id}`}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-neutral-tint">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.job.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Bid {ago(p.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{money(p.bidCents)}</span>
                    <Badge tone={
                      p.status === 'ACCEPTED' ? 'teal'
                        : p.status === 'DECLINED' ? 'danger'
                          : p.status === 'SHORTLISTED' ? 'violet' : 'neutral'
                    }>
                      {p.status.toLowerCase()}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Just posted" />
          {openJobs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted">
              Nothing open right now. New postings appear here as they arrive.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {openJobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`}
                    className="block px-5 py-4 hover:bg-neutral-tint">
                    <p className="truncate font-semibold">{job.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {money(job.budgetCents)} · {job.proposalsCount}{' '}
                      {job.proposalsCount === 1 ? 'bid' : 'bids'} · {ago(job.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Next({ href, icon: Icon, label, detail }: {
  href: '/talent' | '/wallet' | '/messages';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
}) {
  return (
    <li>
      <Link href={href} className="flex gap-3 px-5 py-4 hover:bg-neutral-tint">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" />
        <span>
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block text-xs text-ink-muted">{detail}</span>
        </span>
      </Link>
    </li>
  );
}
