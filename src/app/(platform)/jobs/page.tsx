import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Briefcase, Search } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago, money } from '@/lib/money';
import { Badge, Card, Empty, PageHeader } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Find work' };

/**
 * The freelancer's job board. Hirers are sent to /talent instead — v1 showed
 * both sides the same feed, which put clients in a list of jobs they had
 * posted themselves.
 */
export default async function Jobs({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== 'FREELANCER') redirect('/talent');

  const { q } = await searchParams;
  const term = q?.trim();

  const where: Prisma.JobWhereInput = {
    status: 'OPEN',
    ...(term
      ? {
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { skills: { has: term } },
        ],
      }
      : {}),
  };

  const [jobs, mine] = await Promise.all([
    db.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, title: true, description: true, category: true,
        skills: true, budgetCents: true, proposalsCount: true, createdAt: true,
        owner: { select: { displayName: true, username: true } },
      },
    }),
    db.proposal.findMany({
      where: { freelancerId: user.id },
      select: { jobId: true },
    }),
  ]);

  const bidOn = new Set(mine.map((p) => p.jobId));

  return (
    <>
      <PageHeader title="Find work"
        description="Every posting here is from a verified, deposit-backed account. Bidding is free." />

      <form className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={term ?? ''}
            placeholder="Search by title, description or skill"
            aria-label="Search jobs"
            className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
        </div>
        <button type="submit"
          className="min-h-[44px] rounded-md bg-ink-strong px-5 text-sm font-semibold text-canvas hover:opacity-90">
          Search
        </button>
      </form>

      {jobs.length === 0 ? (
        <Empty icon={Briefcase}
          title={term ? `Nothing open matches “${term}”` : 'No open jobs right now'}
          body={term
            ? 'Try a broader term, or clear the search to see everything open.'
            : 'New postings appear here the moment a verified client publishes one.'}
          cta={term ? { href: '/jobs', label: 'Clear search' } : undefined} />
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Card className="transition hover:border-border-strong">
                <Link href={`/jobs/${job.id}`} className="block p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="font-serif text-base font-semibold">{job.title}</h2>
                    <span className="font-semibold">{money(job.budgetCents)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {job.category} · posted {ago(job.createdAt)} by {job.owner.displayName}
                    {' · '}{job.proposalsCount} {job.proposalsCount === 1 ? 'bid' : 'bids'}
                  </p>
                  <p className="mt-2.5 line-clamp-2 text-sm text-ink-muted">
                    {job.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {job.skills.slice(0, 6).map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                    {bidOn.has(job.id) && <Badge tone="teal">You have bid</Badge>}
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
