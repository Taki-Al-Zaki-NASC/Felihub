import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ArrowLeft, BadgeCheck, Globe, ShieldCheck, Users,
} from 'lucide-react';
import { db, databaseConfigured } from '@/server/db';
import { isDbError } from '@/server/db-errors';
import { getSessionUser } from '@/server/auth';
import { ago, money } from '@/lib/money';
import { Badge, Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { AuthorshipNote } from '@/components/ui/authorship-note';
import { signalFor } from '@/server/services/authorship';
import { PledgeForm } from '@/components/startups/pledge-form';
import { CancelRaise } from '@/components/startups/cancel-raise';
import { Progress } from '../page';
import {
  STAGE_LABELS, backersFor, parseUseOfFunds, progressOf, settleRaise,
  type Stage,
} from '@/server/services/raises';

export const dynamic = 'force-dynamic';

/** Selected once, so the settle-then-reread path below cannot drift from the
 *  first read. */
const RAISE_SELECT = {
  id: true, title: true, summary: true, category: true, stage: true,
  traction: true, websiteUrl: true, useOfFunds: true,
  goalCents: true, raisedCents: true, backersCount: true,
  minPledgeCents: true, deadline: true, status: true, createdAt: true,
  founderId: true,
  founder: {
    select: {
      username: true, displayName: true, createdAt: true,
      profile: { select: { headline: true, location: true, verified: true } },
    },
  },
} as const;

async function getRaise(id: string) {
  if (!databaseConfigured) return null;
  try {
    const raise = await db.raise.findUnique({
      where: { id },
      select: RAISE_SELECT,
    });
    if (!raise) return null;

    // Settle on read: the deadline may have passed since anyone last looked,
    // and a page showing "2 days left" on an expired raise is lying. Read once
    // more rather than recursing — one settle can only move it out of OPEN.
    if (raise.status === 'OPEN' && raise.deadline.getTime() <= Date.now()) {
      await settleRaise(raise.id).catch(() => {});
      return db.raise.findUnique({ where: { id }, select: RAISE_SELECT });
    }
    return raise;
  } catch (error) {
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
  const raise = await getRaise(id);
  if (!raise) return { title: 'Startup' };
  return { title: raise.title, description: raise.summary.slice(0, 155) };
}

export default async function RaiseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [raise, viewer] = await Promise.all([getRaise(id), getSessionUser()]);
  if (!raise) notFound();

  const [backers, signal] = await Promise.all([
    backersFor(raise.id),
    signalFor('RAISE_SUMMARY', raise.id),
  ]);

  const p = progressOf(raise);
  const lines = parseUseOfFunds(raise.useOfFunds);
  const isFounder = viewer?.id === raise.founderId;
  const [mine, balances] = viewer && !isFounder
    ? await Promise.all([
      db.pledge.findUnique({
        where: { raiseId_backerId: { raiseId: raise.id, backerId: viewer.id } },
        select: { amountCents: true, status: true },
      }),
      db.user.findUnique({
        where: { id: viewer.id },
        select: { walletBalanceCents: true, postingBalanceCents: true },
      }),
    ])
    : [null, null];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link href="/startups"
        className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Everyone raising
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="violet">{STAGE_LABELS[raise.stage as Stage] ?? raise.stage}</Badge>
        <Badge>{raise.category}</Badge>
        {raise.status === 'FUNDED' && <Badge tone="teal">funded</Badge>}
        {raise.status === 'EXPIRED' && <Badge>closed under goal</Badge>}
        {raise.status === 'CANCELLED' && <Badge>withdrawn</Badge>}
      </div>

      <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
        {raise.title}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0">
          <Card className="p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {raise.summary}
            </p>
            <AuthorshipNote signal={signal} self={isFounder} className="mt-4" />
          </Card>

          {raise.traction && (
            <Card className="mt-5">
              <CardHeader title="Where it is today"
                description="What exists, separate from what is planned." />
              <p className="whitespace-pre-wrap px-5 pb-5 text-sm leading-relaxed">
                {raise.traction}
              </p>
            </Card>
          )}

          {lines.length > 0 && (
            <Card className="mt-5">
              <CardHeader title="What the money is for"
                description="These add up to the goal exactly — the form will not accept a raise where they do not." />
              <ul className="divide-y divide-border">
                {lines.map((line, i) => (
                  <li key={`${line.label}-${i}`}
                    className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-bold text-ink-muted">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">{line.label}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {money(line.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="mt-5">
            <CardHeader title={`${p.backersCount} ${p.backersCount === 1 ? 'backer' : 'backers'}`}
              description={backers.length === 0
                ? undefined
                : 'Amounts are public. Names are, unless a backer chose otherwise.'} />
            {backers.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-muted">
                Nobody has backed this yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {backers.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                    {b.who ? (
                      <Avatar username={b.who.username} name={b.who.displayName} size={32} />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-ink-faint">
                        <Users className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {b.who ? (
                        <Link href={`/profile/${b.who.username}`}
                          className="font-medium hover:underline">
                          {b.who.displayName}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">Anonymous backer</span>
                      )}
                      <span className="text-xs text-ink-faint"> · {ago(b.createdAt)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {money(b.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <Progress percent={p.percent} funded={raise.status === 'FUNDED'} />
            <p className="mt-3 font-serif text-2xl font-semibold">
              {money(p.raisedCents)}
            </p>
            <p className="text-sm text-ink-muted">
              of {money(p.goalCents)} · {p.percent}%
            </p>
            <dl className="mt-4 flex gap-6 border-t border-border pt-3 text-sm">
              <div>
                <dt className="text-xs text-ink-faint">Backers</dt>
                <dd className="font-semibold">{p.backersCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-faint">
                  {p.open ? 'Days left' : 'Status'}
                </dt>
                <dd className="font-semibold">
                  {p.open ? p.daysLeft
                    : raise.status === 'FUNDED' ? 'Funded'
                      : raise.status === 'CANCELLED' ? 'Withdrawn' : 'Closed'}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-border pt-4">
              {isFounder ? (
                <>
                  <p className="text-sm text-ink-muted">
                    This is your raise. You cannot back it yourself.
                  </p>
                  {raise.status === 'OPEN' && <CancelRaise raiseId={raise.id} />}
                </>
              ) : !p.open ? (
                <p className="text-sm text-ink-muted">
                  {raise.status === 'FUNDED'
                    ? 'This raise met its goal and the money has gone to the founder.'
                    : 'This raise is closed. Every pledge was refunded in full.'}
                </p>
              ) : !viewer ? (
                <>
                  <Button asChild className="w-full">
                    <Link href="/sign-up">Create an account to back this</Link>
                  </Button>
                  <Button asChild variant="ghost" className="mt-2 w-full">
                    <Link href="/sign-in">I already have one</Link>
                  </Button>
                </>
              ) : (
                <PledgeForm
                  raiseId={raise.id}
                  minPledgeCents={raise.minPledgeCents}
                  existingCents={mine?.status === 'HELD' ? mine.amountCents : null}
                  verified={viewer.isVerified}
                  availableCents={(balances?.walletBalanceCents ?? 0)
                    + (balances?.postingBalanceCents ?? 0)} />
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              The founder
            </h2>
            <div className="mt-2 flex items-start gap-3">
              <Avatar username={raise.founder.username}
                name={raise.founder.displayName} size={40} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {raise.founder.displayName}
                  {raise.founder.profile?.verified && (
                    <Badge tone="teal">
                      <BadgeCheck className="mr-1 h-3 w-3" /> verified
                    </Badge>
                  )}
                </p>
                {raise.founder.profile?.headline && (
                  <p className="text-sm text-ink-muted">
                    {raise.founder.profile.headline}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-muted">
                  On Felicek {ago(raise.founder.createdAt)}
                </p>
              </div>
            </div>
            {raise.websiteUrl && (
              <a href={raise.websiteUrl} target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline">
                <Globe className="h-3.5 w-3.5" /> {raise.websiteUrl}
              </a>
            )}
          </Card>

          <Card className="p-5">
            <ShieldCheck className="h-5 w-5 text-teal-deep" />
            <h2 className="mt-2 font-serif text-base font-semibold">
              What backing this means
            </h2>
            <ul className="mt-2 space-y-2 text-sm text-ink-muted">
              <li>
                Your money is held in escrow. It reaches the founder only if the
                goal is met by the deadline.
              </li>
              <li>
                If the goal is missed, every pledge is refunded in full — not to
                a credit balance, to your wallet.
              </li>
              <li>
                <strong className="text-ink">You get no equity.</strong> No
                shares, no dividend, no revenue share, no claim on the company.
                A stake sold to the public is a regulated securities offering
                and this is not one.
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
