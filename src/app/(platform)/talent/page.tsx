import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MessageSquare, Search, Users } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
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
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  if (user.role === 'FREELANCER') redirect('/jobs');

  const { q } = await searchParams;
  const term = q?.trim();

  const where: Prisma.UserWhereInput = {
    role: 'FREELANCER',
    profile: {
      is: {
        verified: true,
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
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, username: true, displayName: true, image: true,
      profile: {
        select: {
          headline: true, bio: true, location: true, skills: true,
          hourlyRateCents: true, ratingAvg: true, ratingCount: true,
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Find talent"
        description="Identity-verified freelancers, each with a deposit behind them. Message anyone directly — you do not have to post a job first." />

      <form className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={term ?? ''}
            placeholder="Search by skill, headline or background"
            aria-label="Search talent"
            className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
        </div>
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
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start gap-3">
                  <Avatar src={p.image} name={p.displayName} size={44} />
                  <div className="min-w-0">
                    <Link href={`/profile/${p.username}`}
                      className="block truncate font-semibold hover:underline">
                      {p.displayName}
                    </Link>
                    <p className="truncate text-sm text-ink-muted">
                      {p.profile?.headline}
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-ink-muted">
                  {p.profile?.bio}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.profile?.skills.slice(0, 4).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
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
