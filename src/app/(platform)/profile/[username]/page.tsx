import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BadgeCheck, MapPin, MessageSquare, Pencil, Star } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago, money } from '@/lib/money';
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { parseExperience } from '@/lib/experience';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await db.user.findUnique({
    where: { username },
    select: { displayName: true, profile: { select: { headline: true } } },
  });
  if (!user) return { title: 'Profile' };
  return {
    title: user.displayName,
    description: user.profile?.headline ?? undefined,
  };
}

/**
 * The profile a client reads before deciding to message someone.
 *
 * Everything here is public to signed-in accounts, which is the point — the
 * directory only works if profiles are readable. What is *not* here: the
 * document number, the ledger, and anyone's challenge submissions.
 */
export default async function Profile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await requireUser();

  const person = await db.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, displayName: true, role: true, image: true,
      idSubmitted: true, depositPaid: true, kycStage: true, createdAt: true,
      totalEarnedCents: true,
      profile: {
        select: {
          headline: true, bio: true, location: true, skills: true,
          languages: true, hourlyRateCents: true, portfolioUrl: true,
          verified: true, ratingAvg: true, ratingCount: true, experience: true,
        },
      },
      reviewsAbout: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, rating: true, comment: true, createdAt: true,
          author: { select: { displayName: true, username: true } },
        },
      },
      _count: { select: { proposals: { where: { status: 'COMPLETED' } } } },
    },
  });
  if (!person) notFound();

  const isSelf = person.id === viewer.id;
  const isFreelancer = person.role === 'FREELANCER';
  const experience = parseExperience(person.profile?.experience);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={person.displayName}
        description={person.profile?.headline ?? undefined}
        action={
          isSelf ? (
            <Button asChild variant="outline">
              <Link href="/settings"><Pencil className="h-3.5 w-3.5" /> Edit profile</Link>
            </Button>
          ) : (
            <Button asChild variant="primary">
              <Link href={`/messages/new?to=${person.username}`}>
                <MessageSquare className="h-4 w-4" /> Message
              </Link>
            </Button>
          )
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar src={person.image} name={person.displayName} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-lg font-semibold">{person.displayName}</h2>
              {person.profile?.verified && (
                <Badge tone="teal">
                  <BadgeCheck className="mr-1 h-3 w-3" /> verified
                </Badge>
              )}
              <Badge>{person.role.toLowerCase()}</Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              {person.profile?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {person.profile.location}
                </span>
              )}
              <span>Joined {ago(person.createdAt)}</span>
              {person.profile?.ratingCount ? (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber text-amber" />
                  {person.profile.ratingAvg?.toFixed(1)} ({person.profile.ratingCount})
                </span>
              ) : (
                <span>No reviews yet</span>
              )}
            </p>
          </div>
          {isFreelancer && person.profile?.hourlyRateCents && (
            <div className="text-right">
              <p className="font-serif text-xl font-semibold">
                {money(person.profile.hourlyRateCents)}
              </p>
              <p className="text-xs text-ink-faint">per hour</p>
            </div>
          )}
        </div>

        {person.profile?.bio && (
          <p className="mt-5 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-relaxed">
            {person.profile.bio}
          </p>
        )}

        {person.profile?.portfolioUrl && (
          <a href={person.profile.portfolioUrl} target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-3 inline-block text-sm font-semibold text-teal-deep hover:underline">
            {person.profile.portfolioUrl}
          </a>
        )}
      </Card>

      {(person.profile?.skills.length ?? 0) > 0 && (
        <Card className="mt-5">
          <CardHeader title={isFreelancer ? 'Skills' : 'Hires for'} />
          <div className="flex flex-wrap gap-1.5 p-5">
            {person.profile?.skills.map((s) => <Badge key={s}>{s}</Badge>)}
          </div>
        </Card>
      )}

      {experience.length > 0 && (
        <Card className="mt-5">
          <CardHeader title="Experience" />
          <ul className="divide-y divide-border">
            {experience.map((e, i) => (
              <li key={`${e.title}-${i}`} className="px-5 py-4">
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-ink-muted">
                  {e.organisation}{e.period ? ` · ${e.period}` : ''}
                </p>
                {e.summary && (
                  <p className="mt-1.5 text-sm text-ink-muted">{e.summary}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader title="What clients said"
          description={person.reviewsAbout.length === 0
            ? undefined
            : 'Left after a completed, escrow-released contract.'} />
        {person.reviewsAbout.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">
            No reviews yet. Reviews here can only be written by someone who
            finished and paid for a contract, so there is nothing to pad this
            out with.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {person.reviewsAbout.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-amber" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber' : 'text-border-strong'}`} />
                    ))}
                  </span>
                  <Link href={`/profile/${r.author.username}`}
                    className="text-sm font-semibold hover:underline">
                    {r.author.displayName}
                  </Link>
                  <span className="text-xs text-ink-faint">{ago(r.createdAt)}</span>
                </div>
                {r.comment && (
                  <p className="mt-1.5 text-sm text-ink-muted">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
