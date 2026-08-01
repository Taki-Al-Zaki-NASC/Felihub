import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, BadgeCheck, MapPin, ShieldCheck } from 'lucide-react';
import { db, databaseConfigured } from '@/server/db';
import { isDbError } from '@/server/db-errors';
import { ago, money } from '@/lib/money';
import { Badge, Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * One open job, readable without an account.
 *
 * The whole posting is public: it is an advertisement, written to attract
 * applicants. What is *not* public — and is not fetched anywhere on this page
 * — is anything from the Proposal table. Who applied, what they asked for and
 * what they wrote are all readable only inside the signed-in product, through
 * `server/services/proposals.ts`, and only by the bidder and the job's owner.
 *
 * The applicant count comes from `Job.proposalsCount`, a denormalised column,
 * so this page can say "6 proposals" without the query that would let it say
 * anything more.
 */
export const dynamic = 'force-dynamic';

async function openJob(id: string) {
  if (!databaseConfigured) return null;
  try {
    return await db.job.findFirst({
      where: { id, status: 'OPEN' },
      select: {
        id: true, title: true, description: true, category: true, skills: true,
        budgetCents: true, durationDays: true, proposalsCount: true,
        createdAt: true,
        owner: {
          select: {
            displayName: true, createdAt: true,
            profile: { select: { headline: true, location: true, verified: true } },
          },
        },
        milestones: {
          orderBy: { position: 'asc' },
          select: { id: true, label: true, amountCents: true },
        },
        challenge: { select: { mode: true } },
      },
    });
  } catch (error) {
    // A database that is down should not turn every job URL into a 404 that
    // search engines then forget about.
    if (isDbError(error)) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await openJob(id);
  if (!job) return { title: 'Open work' };
  return {
    title: job.title,
    description: job.description.slice(0, 155),
    // A job that closes should stop being indexed as available work.
    alternates: { canonical: `/browse/${job.id}` },
  };
}

export default async function PublicJob({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await openJob(id);
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link href="/browse"
        className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All open work
      </Link>

      <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">
        {job.title}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {job.category} · posted {ago(job.createdAt)}
        {job.durationDays && ` · about ${job.durationDays} days`}
        {' · '}{job.proposalsCount} {job.proposalsCount === 1 ? 'proposal' : 'proposals'} so far
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal">open</Badge>
              {job.challenge && <Badge tone="violet">skill challenge</Badge>}
              <span className="ml-auto font-serif text-xl font-semibold">
                {money(job.budgetCents)}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-relaxed">
              {job.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-4">
              {job.skills.map((s) => <Badge key={s}>{s}</Badge>)}
            </div>
          </Card>

          {job.milestones.length > 0 && (
            <Card className="mt-5">
              <CardHeader title="Milestones"
                description="Each one is funded into escrow before the work on it starts, and released when the client approves it." />
              <ul className="divide-y divide-border">
                {job.milestones.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-bold text-ink-muted">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm">{m.label}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {money(m.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-serif text-base font-semibold">Bid on this</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Bidding is free. You need a verified freelancer account — a
              document check and a $20 trust bond that comes back after your
              first completed job.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link href="/sign-up?role=freelancer">Create an account to bid</Link>
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/sign-in">I already have one</Link>
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              About the client
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-2 font-semibold">
              {job.owner.displayName}
              {job.owner.profile?.verified && (
                <Badge tone="teal">
                  <BadgeCheck className="mr-1 h-3 w-3" /> verified
                </Badge>
              )}
            </p>
            {job.owner.profile?.headline && (
              <p className="mt-1 text-sm text-ink-muted">{job.owner.profile.headline}</p>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
              {job.owner.profile?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {job.owner.profile.location}
                </span>
              )}
              <span>On Felicek {ago(job.owner.createdAt)}</span>
            </p>
          </Card>

          <Card className="p-5">
            <ShieldCheck className="h-5 w-5 text-teal-deep" />
            <h2 className="mt-2 font-serif text-base font-semibold">
              What you cannot see here
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Not the other bids. Amounts, cover letters and delivery estimates
              are readable only by the person who wrote them and the client who
              posted the job — including for signed-in competitors. That is why
              the number above is a count and nothing more.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
