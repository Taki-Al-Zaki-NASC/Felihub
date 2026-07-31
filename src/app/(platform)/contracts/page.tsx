import Link from 'next/link';
import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago, money } from '@/lib/money';
import { Badge, Card, CardHeader, Empty, PageHeader } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Contracts' };

/**
 * Every engagement, both sides, in one list.
 *
 * A hirer's contract is a job with someone hired on it; a freelancer's is an
 * accepted proposal. They are the same relationship read from two ends, so
 * this page queries whichever end the account is on rather than showing an
 * empty section for the other.
 */
export default async function Contracts() {
  const user = await requireUser();
  return user.role === 'FREELANCER'
    ? <FreelancerContracts userId={user.id} />
    : <HirerContracts userId={user.id} />;
}

async function HirerContracts({ userId }: { userId: string }) {
  const jobs = await db.job.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, status: true, budgetCents: true,
      escrowHeldCents: true, proposalsCount: true, createdAt: true,
      hiredProposalId: true,
      proposals: {
        where: { status: 'ACCEPTED' },
        take: 1,
        select: {
          bidCents: true,
          freelancer: { select: { displayName: true, username: true } },
        },
      },
      milestones: {
        orderBy: { position: 'asc' },
        select: { id: true, label: true, amountCents: true, released: true },
      },
    },
  });

  const active = jobs.filter((j) => j.status === 'FILLED');
  const open = jobs.filter((j) => j.status === 'OPEN');
  const done = jobs.filter((j) => j.status === 'CLOSED');

  if (jobs.length === 0) {
    return (
      <>
        <PageHeader title="Contracts" />
        <Empty icon={FileText} title="No contracts yet"
          body="A contract begins when you hire someone and escrow is funded."
          cta={{ href: '/jobs/new', label: 'Post a job' }} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Contracts"
        description="Your postings and the work running against them." />

      <div className="space-y-6">
        <Section title="Active" empty="Nothing in progress.">
          {active.map((job) => (
            <Row key={job.id} href={`/jobs/${job.id}`} title={job.title}
              subtitle={job.proposals[0]
                ? `${job.proposals[0].freelancer.displayName} · ${money(job.proposals[0].bidCents)}`
                : 'Hired'}
              amount={money(job.escrowHeldCents)} amountLabel="in escrow"
              badge={<Badge tone="teal">active</Badge>}
              detail={job.milestones.length
                ? `${job.milestones.filter((m) => m.released).length}/${job.milestones.length} milestones released`
                : undefined} />
          ))}
        </Section>

        <Section title="Open for bids" empty="No open postings.">
          {open.map((job) => (
            <Row key={job.id} href={`/jobs/${job.id}`} title={job.title}
              subtitle={`Posted ${ago(job.createdAt)}`}
              amount={money(job.budgetCents)} amountLabel="budget"
              badge={<Badge>{job.proposalsCount} {job.proposalsCount === 1 ? 'bid' : 'bids'}</Badge>} />
          ))}
        </Section>

        {done.length > 0 && (
          <Section title="Completed" empty="">
            {done.map((job) => (
              <Row key={job.id} href={`/jobs/${job.id}`} title={job.title}
                subtitle={`Closed ${ago(job.createdAt)}`}
                amount={money(job.budgetCents)} amountLabel="budget"
                badge={<Badge>closed</Badge>} />
            ))}
          </Section>
        )}
      </div>
    </>
  );
}

async function FreelancerContracts({ userId }: { userId: string }) {
  const proposals = await db.proposal.findMany({
    where: { freelancerId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, bidCents: true, status: true, createdAt: true,
      job: {
        select: {
          id: true, title: true, status: true, escrowHeldCents: true,
          owner: { select: { displayName: true } },
          milestones: {
            orderBy: { position: 'asc' },
            select: { id: true, released: true },
          },
        },
      },
    },
  });

  if (proposals.length === 0) {
    return (
      <>
        <PageHeader title="Contracts" />
        <Empty icon={FileText} title="No contracts yet"
          body="Bid on work you can do — it costs nothing, and a contract starts the moment a client accepts."
          cta={{ href: '/jobs', label: 'Find work' }} />
      </>
    );
  }

  const active = proposals.filter((p) => p.status === 'ACCEPTED');
  const pending = proposals.filter((p) => p.status === 'SUBMITTED' || p.status === 'SHORTLISTED');
  const closed = proposals.filter((p) => p.status === 'DECLINED' || p.status === 'COMPLETED' || p.status === 'WITHDRAWN');

  return (
    <>
      <PageHeader title="Contracts"
        description="Work you have won, and the bids still out there." />

      <div className="space-y-6">
        <Section title="Active" empty="Nothing in progress.">
          {active.map((p) => (
            <Row key={p.id} href={`/jobs/${p.job.id}`} title={p.job.title}
              subtitle={p.job.owner.displayName}
              amount={money(p.bidCents)} amountLabel="agreed"
              badge={<Badge tone="teal">active</Badge>}
              detail={p.job.escrowHeldCents > 0
                ? `${money(p.job.escrowHeldCents)} funded in escrow`
                : 'Escrow not funded yet'} />
          ))}
        </Section>

        <Section title="Bids out" empty="No bids waiting.">
          {pending.map((p) => (
            <Row key={p.id} href={`/jobs/${p.job.id}`} title={p.job.title}
              subtitle={`${p.job.owner.displayName} · bid ${ago(p.createdAt)}`}
              amount={money(p.bidCents)} amountLabel="your bid"
              badge={<Badge tone={p.status === 'SHORTLISTED' ? 'violet' : 'neutral'}>
                {p.status.toLowerCase()}
              </Badge>} />
          ))}
        </Section>

        {closed.length > 0 && (
          <Section title="Closed" empty="">
            {closed.map((p) => (
              <Row key={p.id} href={`/jobs/${p.job.id}`} title={p.job.title}
                subtitle={p.job.owner.displayName}
                amount={money(p.bidCents)} amountLabel="your bid"
                badge={<Badge tone={p.status === 'COMPLETED' ? 'teal' : 'neutral'}>
                  {p.status.toLowerCase()}
                </Badge>} />
            ))}
          </Section>
        )}
      </div>
    </>
  );
}

function Section({ title, empty, children }: {
  title: string; empty: string; children: React.ReactNode[];
}) {
  const items = children.filter(Boolean);
  if (items.length === 0 && !empty) return null;
  return (
    <Card>
      <CardHeader title={title} />
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">{items}</ul>
      )}
    </Card>
  );
}

function Row({ href, title, subtitle, amount, amountLabel, badge, detail }: {
  href: string;
  title: string;
  subtitle: string;
  amount: string;
  amountLabel: string;
  badge: React.ReactNode;
  detail?: string;
}) {
  return (
    <li>
      <Link href={href as `/jobs/${string}`}
        className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-neutral-tint">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
          {detail && <p className="mt-0.5 text-xs text-ink-faint">{detail}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold">{amount}</p>
          <p className="text-xs text-ink-faint">{amountLabel}</p>
        </div>
        {badge}
      </Link>
    </li>
  );
}
