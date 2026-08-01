import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Briefcase, Search, SlidersHorizontal } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago, money } from '@/lib/money';
import {
  DEFAULT_MATCH_FLOOR, MATCH_FLOORS, floorLabel, matchScore,
} from '@/lib/match';
import { Badge, Card, Empty, PageHeader } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Find work' };

/**
 * The freelancer's board, filtered to work they could actually win.
 *
 * Scoring happens here rather than in SQL: it weighs category, skills and free
 * text together, and Postgres cannot express that without either a materialised
 * score that goes stale or a query nobody can read. At this scale fetching the
 * open jobs and ranking them in memory is both faster and honest — and it
 * means the reasons shown on each card are the same numbers that did the
 * filtering, not a story told afterwards.
 */
export default async function Jobs({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; match?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== 'FREELANCER') redirect('/talent');

  const { q, match } = await searchParams;
  const term = q?.trim();
  const floor = MATCH_FLOORS.includes(Number(match) as never)
    ? Number(match)
    : DEFAULT_MATCH_FLOOR;

  const [profile, rows, mine] = await Promise.all([
    db.profile.findUnique({
      where: { userId: user.id },
      select: { category: true, skills: true, bio: true, headline: true },
    }),
    db.job.findMany({
      where: {
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
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, title: true, description: true, category: true,
        skills: true, budgetCents: true, proposalsCount: true, createdAt: true,
        owner: { select: { displayName: true, username: true } },
        challenge: { select: { mode: true } },
        _count: { select: { milestones: true } },
      },
    }),
    db.proposal.findMany({
      where: { freelancerId: user.id },
      select: { jobId: true },
    }),
  ]);

  const bidOn = new Set(mine.map((p) => p.jobId));
  const profileForMatch = {
    category: profile?.category,
    skills: profile?.skills ?? [],
    bio: profile?.bio,
    headline: profile?.headline,
  };

  const scored = rows
    .map((job) => ({ job, match: matchScore(profileForMatch, job) }))
    .sort((a, b) => b.match.score - a.match.score);

  const shown = scored.filter((s) => s.match.score >= floor);
  const hidden = scored.length - shown.length;

  return (
    <>
      <PageHeader title="Find work"
        description={profile?.category
          ? `Matched against your category, skills and profile. Bidding is free.`
          : 'Pick a category in Settings and this board will match work to it.'} />

      <form className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={term ?? ''}
            placeholder="Search by title, description or skill"
            aria-label="Search jobs"
            className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="match" className="sr-only">Minimum match</label>
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <select id="match" name="match" defaultValue={String(floor)}
              className="min-h-[44px] rounded-md border border-border-strong bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
              {MATCH_FLOORS.map((f) => (
                <option key={f} value={f}>{floorLabel(f)}</option>
              ))}
            </select>
          </div>
          <button type="submit"
            className="min-h-[44px] rounded-md bg-ink-strong px-5 text-sm font-semibold text-canvas hover:opacity-90">
            Apply
          </button>
        </div>
      </form>

      {shown.length === 0 ? (
        <Empty icon={Briefcase}
          title={hidden > 0
            ? `Nothing at ${floorLabel(floor).toLowerCase()} right now`
            : term ? `Nothing open matches “${term}”` : 'No open jobs right now'}
          body={hidden > 0
            ? `${hidden} open ${hidden === 1 ? 'job is' : 'jobs are'} below your match threshold. `
              + 'Widen it above, or add skills to your profile so more work qualifies.'
            : 'New postings appear here the moment a verified client publishes one.'}
          cta={hidden > 0 ? { href: '/jobs?match=0', label: 'Show everything' } : undefined} />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-muted">
            {shown.length} {shown.length === 1 ? 'job' : 'jobs'} at {floorLabel(floor).toLowerCase()}
            {hidden > 0 && ` · ${hidden} below your threshold`}
          </p>
          <ul className="space-y-3">
            {shown.map(({ job, match: m }) => (
              <li key={job.id}>
                <Card className="transition hover:border-border-strong">
                  <Link href={`/jobs/${job.id}`} className="block p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-serif text-base font-semibold">{job.title}</h2>
                      <div className="flex items-center gap-2">
                        <MatchBadge score={m.score} />
                        <span className="font-semibold">{money(job.budgetCents)}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {job.category} · posted {ago(job.createdAt)} by {job.owner.displayName}
                      {' · '}{job.proposalsCount} {job.proposalsCount === 1 ? 'bid' : 'bids'}
                      {job._count.milestones > 0
                        && ` · ${job._count.milestones} milestones`}
                    </p>
                    <p className="mt-2.5 line-clamp-2 text-sm text-ink-muted">
                      {job.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {job.skills.slice(0, 6).map((s) => (
                        <Badge key={s} tone={m.shared.includes(s) ? 'teal' : 'neutral'}>
                          {s}
                        </Badge>
                      ))}
                      {job.challenge && <Badge tone="violet">challenge</Badge>}
                      {bidOn.has(job.id) && <Badge tone="teal">you have bid</Badge>}
                    </div>
                    <p className="mt-2 text-xs text-ink-faint">{m.reasons.join(' · ')}</p>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function MatchBadge({ score }: { score: number }) {
  const tone = score >= 95 ? 'teal' : score >= 75 ? 'violet' : 'neutral';
  return <Badge tone={tone}>{score}% match</Badge>;
}
