import Link from 'next/link';
import type { Metadata } from 'next';
import { Briefcase, Search } from 'lucide-react';
import { db, databaseConfigured } from '@/server/db';
import { describeDbError } from '@/server/db-errors';
import { CATEGORIES } from '@/lib/categories';
import { ago, money } from '@/lib/money';
import { Badge, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Browse open work',
  description:
    'Open projects on Felicek — AI and machine learning, data engineering, '
    + 'analytics and more. Every job is posted by an identity-verified client '
    + 'with milestones and a budget.',
};

/**
 * Open work, readable without an account.
 *
 * Everything in this product used to be behind the sign-in wall, which meant a
 * visitor had to create an account and verify their identity before they could
 * find out whether there was any work worth verifying for. That is a strange
 * bargain to offer, and it is not how any marketplace people already trust
 * behaves — you can read jobs on Upwork before you have an account.
 *
 * It is also the only way these pages are ever indexed. A marketplace whose
 * listings are invisible to search does not get found.
 *
 * What is safe to show here is exactly what the client wrote to attract
 * applicants: title, description, category, skills, their own budget and
 * timeline. The Proposal table is never read on this path — the count comes
 * from the denormalised `Job.proposalsCount` — so there is nothing on this
 * page that could leak a bid.
 */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const term = q?.trim();
  // Only a category from the taxonomy. An arbitrary string would match nothing
  // and read as an empty marketplace rather than a bad filter.
  const chosen = CATEGORIES.includes(category as never) ? category : undefined;

  const result = await openJobs(term, chosen);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
        Open work
      </h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        Every project here was posted by a client whose identity is on file and
        whose posting balance is funded. Read anything you like without an
        account — you need one to bid, and bidding is free.
      </p>

      <form className="mt-8 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={term ?? ''}
            placeholder="Search by title, description or skill"
            aria-label="Search open work"
            className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
        </div>
        <label htmlFor="category" className="sr-only">Category</label>
        <select id="category" name="category" defaultValue={chosen ?? ''}
          className="min-h-[44px] rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
          <option value="">Every category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit"
          className="min-h-[44px] rounded-md bg-ink-strong px-5 text-sm font-semibold text-canvas hover:opacity-90">
          Search
        </button>
      </form>

      {result.problem ? (
        <Notice title="The job board is not available right now"
          body={result.problem} />
      ) : result.jobs.length === 0 ? (
        <Notice
          title={term || chosen ? 'Nothing open matches that' : 'No open work right now'}
          body={term || chosen
            ? 'Try a broader search, or clear the category filter.'
            : 'New postings appear here as soon as a verified client publishes one.'}
          cta={term || chosen ? { href: '/browse', label: 'Show everything' } : undefined} />
      ) : (
        <>
          <p className="mb-3 mt-8 text-sm text-ink-muted">
            {result.jobs.length === PAGE_SIZE
              ? `Showing the ${PAGE_SIZE} most recent`
              : `${result.jobs.length} open ${result.jobs.length === 1 ? 'project' : 'projects'}`}
            {chosen && ` in ${chosen}`}
          </p>
          <ul className="space-y-3">
            {result.jobs.map((job) => (
              <li key={job.id}>
                <Card className="transition hover:border-border-strong">
                  <Link href={`/browse/${job.id}`} className="block p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-serif text-base font-semibold">{job.title}</h2>
                      <span className="font-semibold">{money(job.budgetCents)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {job.category} · posted {ago(job.createdAt)} by {job.owner.displayName}
                      {' · '}{job.proposalsCount} {job.proposalsCount === 1 ? 'proposal' : 'proposals'}
                      {job.durationDays && ` · about ${job.durationDays} days`}
                    </p>
                    <p className="mt-2.5 line-clamp-2 text-sm text-ink-muted">
                      {job.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {job.skills.slice(0, 6).map((s) => <Badge key={s}>{s}</Badge>)}
                    </div>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-xl border border-border-strong bg-neutral-tint px-6 py-10 text-center">
            <h2 className="font-serif text-xl font-semibold">
              Bidding is free once you are verified.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              No credits to buy and no per-bid charge. The $20 trust bond is
              refunded after your first completed job.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/sign-up?role=freelancer">Create a freelancer account</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The query, with the database's own failures translated.
 *
 * This page is the first thing a stranger sees. "Something broke" on it, from
 * a database that has not been configured yet, costs a visitor who was never
 * coming back — so a missing DATABASE_URL says so and the page still renders.
 */
async function openJobs(term: string | undefined, category: string | undefined) {
  if (!databaseConfigured) {
    return {
      jobs: [],
      problem: 'This deployment has no database connected yet, so there is '
        + 'nothing to list. Everything else on the site works.',
    };
  }
  try {
    const jobs = await db.job.findMany({
      where: {
        status: 'OPEN',
        ...(category ? { category } : {}),
        ...(term
          ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } },
              { skills: { has: term } },
            ],
          }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      // Job columns and the client's public name. The Proposal table is not
      // touched on this path at all.
      select: {
        id: true, title: true, description: true, category: true, skills: true,
        budgetCents: true, durationDays: true, proposalsCount: true,
        createdAt: true,
        owner: { select: { displayName: true } },
      },
    });
    return { jobs, problem: null as string | null };
  } catch (error) {
    const problem = describeDbError(error);
    if (problem) return { jobs: [], problem };
    throw error;
  }
}

function Notice({ title, body, cta }: {
  title: string;
  body: string;
  cta?: { href: '/browse'; label: string };
}) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-tint text-ink-faint">
        <Briefcase className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-ink-muted">{body}</p>
      {cta && (
        <Button asChild className="mt-6" variant="outline">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
