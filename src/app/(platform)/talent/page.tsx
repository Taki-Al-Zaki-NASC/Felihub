import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MessageSquare, Search, Users } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { CATEGORIES } from '@/lib/categories';
import { money } from '@/lib/money';
import { Badge, Card, Empty, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

export const metadata: Metadata = { title: 'Find talent' };

/**
 * The hirer's directory of verified freelancers.
 *
 * The whole point of a verified marketplace is that you can approach someone
 * directly instead of waiting for bids, so every card carries a message button.
 * Only `Profile.verified` rows appear — that column is written by the server on
 * the verification path and by nothing else.
 */
export default async function Talent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const user = await requireUser();
  if (user.role === 'FREELANCER') redirect('/jobs');

  const { q, category } = await searchParams;
  const term = q?.trim();
  // Only a category from the taxonomy: an arbitrary string would match nothing
  // and read as an empty directory rather than a bad filter.
  const chosen = CATEGORIES.includes(category as never) ? category : undefined;

  const where: Prisma.UserWhereInput = {
    role: 'FREELANCER',
    profile: {
      is: {
        verified: true,
        ...(chosen ? { category: chosen } : {}),
        ...(term
          ? {
            OR: [
              { headline: { contains: term, mode: 'insensitive' } },
              { bio: { contains: term, mode: 'insensitive' } },
              { skills: { has: term } },
            ],
          }
          : {}),
      },
    },
  };

  const people = await db.user.findMany({
    where,
    take: 50,
    // Rated people first, then people who have been paid. Newest-first put the
    // account that signed up an hour ago above someone with nine finished
    // contracts, which is the opposite of what a hirer opened this page for.
    // `nulls: 'last'` matters: Postgres sorts NULL highest on DESC, so without
    // it every unrated profile would lead the page.
    orderBy: [
      { profile: { ratingAvg: { sort: 'desc', nulls: 'last' } } },
      { totalEarnedCents: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true, username: true, displayName: true, totalEarnedCents: true,
      profile: {
        select: {
          headline: true, bio: true, location: true, skills: true,
          hourlyRateCents: true, ratingAvg: true, ratingCount: true,
        },
      },
      _count: { select: { proposals: { where: { status: 'COMPLETED' } } } },
    },
  });

  return (
    <>
      <PageHeader title="Find talent"
        description="Identity-verified freelancers, each with a deposit behind them. Message anyone directly — you do not have to post a job first." />

      <form className="mb-5 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={term ?? ''}
            placeholder="Search by skill, headline or background"
            aria-label="Search talent"
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

      {people.length === 0 ? (
        <Empty icon={Users}
          title={term ? `No verified freelancer matches “${term}”` : 'No verified freelancers yet'}
          body={term
            ? 'Try a broader term — search covers skills, headline and background.'
            : 'Freelancers appear here as soon as they finish verification.'}
          cta={term ? { href: '/talent', label: 'Clear search' } : undefined} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => (
            // `min-w-0` is load-bearing. A grid item's default minimum is its
            // content's min-content width, and a card holding a long display
            // name and a headline refuses to go below about 395px — so on a
            // 390px phone every card was wider than the screen and the whole
            // page scrolled sideways. This was invisible until the directory
            // had anyone in it to render.
            <li key={p.id} className="min-w-0">
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start gap-3">
                  <Avatar username={p.username} name={p.displayName} size={44} />
                  <div className="min-w-0">
                    <Link href={`/profile/${p.username}`}
                      className="block truncate font-semibold hover:underline">
                      {p.displayName}
                    </Link>
                    {/* Two lines, not one. "Computer vision engineer —
                        PyTorch, edge deployment" truncated at the em dash in a
                        three-column grid, which cut off the half that says
                        what they do. */}
                    <p className="line-clamp-2 text-sm text-ink-muted">
                      {p.profile?.headline}
                    </p>
                  </div>
                </div>

                {/* This wrapper is what keeps the rate and rating on the same
                    line across a row. Without it a card whose skills wrapped
                    to two lines pushed its own footer down, and three cards
                    side by side each had their price at a different height. */}
                <div className="flex-1">
                  <p className="mt-3 line-clamp-3 text-sm text-ink-muted">
                    {p.profile?.bio}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.profile?.skills.slice(0, 4).map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="font-semibold">
                    {p.profile?.hourlyRateCents
                      ? `${money(p.profile.hourlyRateCents)}/hr`
                      : 'Rate on request'}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {p.profile?.ratingCount
                      ? `★ ${p.profile.ratingAvg?.toFixed(1)} (${p.profile.ratingCount})`
                      : 'No reviews yet'}
                  </span>
                </div>
                {/* Track record, from released escrow rather than a claim.
                    Omitted entirely for someone new, because "0 jobs, $0" is a
                    worse first impression than saying nothing. */}
                {p._count.proposals > 0 && (
                  <p className="mt-1.5 text-xs text-ink-muted">
                    {p._count.proposals} {p._count.proposals === 1 ? 'job' : 'jobs'} completed
                    {' · '}{money(p.totalEarnedCents)} earned here
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="primary" className="flex-1">
                    <Link href={`/messages/new?to=${p.username}`}>
                      <MessageSquare className="h-4 w-4" /> Message
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/profile/${p.username}`}>Profile</Link>
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
