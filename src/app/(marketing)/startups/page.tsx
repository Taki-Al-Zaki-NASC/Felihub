import Link from 'next/link';
import type { Metadata } from 'next';
import { Rocket, Search } from 'lucide-react';
import { db, databaseConfigured } from '@/server/db';
import { describeDbError } from '@/server/db-errors';
import { getSessionUser } from '@/server/auth';
import { CATEGORIES } from '@/lib/categories';
import { ago, money } from '@/lib/money';
import { Badge, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  STAGE_LABELS, progressOf, settleDueRaises, type Stage,
} from '@/server/services/raises';

export const metadata: Metadata = {
  title: 'Back a startup',
  description:
    'Founders raising on Felicek — every one identity-verified, every pledge '
    + 'held in escrow, and refunded in full if the goal is not met.',
};

export const dynamic = 'force-dynamic';

/**
 * The third side of the marketplace.
 *
 * Felicek already matched people who need work done with people who do it.
 * This is the same accounts, the same verification and the same escrow,
 * pointed at a different problem: a founder who needs money rather than a
 * contractor, and a client or freelancer who wants to put some in.
 *
 * Public, like `/browse`. Nobody is going to create an account to find out
 * whether there is anything here worth backing.
 */
export default async function Startups({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; show?: string }>;
}) {
  const { q, category, show } = await searchParams;
  const term = q?.trim();
  const chosen = CATEGORIES.includes(category as never) ? category : undefined;
  const closed = show === 'closed';

  const [viewer, result] = await Promise.all([
    getSessionUser(),
    listRaises(term, chosen, closed),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
            Back a startup
          </h1>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Founders whose identity is on file, asking for money to build
            something. Every pledge sits in escrow and goes back in full if the
            goal is not met by the deadline.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href={viewer ? '/startups/new' : '/sign-up?role=startup'}>
            Raise for your startup
          </Link>
        </Button>
      </div>

      {/* Said once, plainly, at the top — not buried in a footer. Somebody
          about to send money is entitled to know what they are not getting. */}
      <div className="mt-6 rounded-lg border border-border bg-neutral-tint p-4 text-sm text-ink-muted">
        <strong className="font-semibold text-ink">
          A pledge here buys no equity.
        </strong>{' '}
        No shares, no dividend, no revenue share, no claim on the company.
        Selling a stake in a company to the public is a regulated securities
        offering and this is not one. What you get is early support for
        something, and whatever the founder offers you directly.
      </div>

      <form className="mt-8 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={term ?? ''}
            placeholder="Search what people are building"
            aria-label="Search startups"
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

      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/startups"
          className={`rounded-md px-3 py-1.5 font-semibold ${closed ? 'text-ink-muted hover:bg-backdrop' : 'bg-teal-tint text-teal-deep'}`}>
          Raising now
        </Link>
        <Link href="/startups?show=closed"
          className={`rounded-md px-3 py-1.5 font-semibold ${closed ? 'bg-teal-tint text-teal-deep' : 'text-ink-muted hover:bg-backdrop'}`}>
          Finished
        </Link>
      </div>

      {result.problem ? (
        <Notice title="Fundraising is not available right now" body={result.problem} />
      ) : result.raises.length === 0 ? (
        <Notice
          title={closed ? 'Nothing has finished yet' : 'Nobody is raising right now'}
          body={term || chosen
            ? 'Try a broader search, or clear the category filter.'
            : 'Founders appear here the moment a verified account publishes a raise.'} />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {result.raises.map((r) => {
            const p = progressOf(r);
            return (
              <li key={r.id} className="min-w-0">
                <Card className="flex h-full flex-col p-5 transition hover:border-border-strong">
                  <Link href={`/startups/${r.id}`} prefetch={false} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="violet">{STAGE_LABELS[r.stage as Stage] ?? r.stage}</Badge>
                      <Badge>{r.category}</Badge>
                      {r.status === 'FUNDED' && <Badge tone="teal">funded</Badge>}
                      {r.status === 'EXPIRED' && <Badge>closed under goal</Badge>}
                    </div>
                    <h2 className="mt-2.5 font-serif text-base font-semibold hover:underline">
                      {r.title}
                    </h2>
                    <p className="mt-1 text-xs text-ink-muted">
                      {r.founder.displayName} · started {ago(r.createdAt)}
                    </p>
                    <p className="mt-2.5 line-clamp-3 text-sm text-ink-muted">
                      {r.summary}
                    </p>
                  </Link>

                  <div className="mt-4 border-t border-border pt-3">
                    <Progress percent={p.percent} funded={r.status === 'FUNDED'} />
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-semibold">
                        {money(p.raisedCents)}
                        <span className="font-normal text-ink-muted">
                          {' '}of {money(p.goalCents)}
                        </span>
                      </span>
                      <span className="text-xs text-ink-muted">
                        {p.backersCount} {p.backersCount === 1 ? 'backer' : 'backers'}
                        {p.open && ` · ${p.daysLeft} ${p.daysLeft === 1 ? 'day' : 'days'} left`}
                      </span>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** A bar that cannot overflow its track, because `percent` is capped at 100 —
 *  a raise at 340% of goal would otherwise render off the side of the card. */
export function Progress({ percent, funded }: { percent: number; funded?: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-tint"
      role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
      aria-label="Progress towards the goal">
      <div className={`h-full rounded-full ${funded ? 'bg-teal' : 'bg-violet'}`}
        style={{ width: `${percent}%` }} />
    </div>
  );
}

async function listRaises(
  term: string | undefined,
  category: string | undefined,
  closed: boolean,
) {
  if (!databaseConfigured) {
    return {
      raises: [],
      problem: 'This deployment has no database connected yet, so there is '
        + 'nothing to list.',
    };
  }
  try {
    // No cron on the free tier, so raises are settled when somebody looks at
    // the list. A backer's money must not sit in escrow because a scheduled
    // job nobody set up did not run.
    await settleDueRaises();

    const raises = await db.raise.findMany({
      where: {
        status: closed ? { in: ['FUNDED', 'EXPIRED'] } : 'OPEN',
        ...(category ? { category } : {}),
        ...(term
          ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { summary: { contains: term, mode: 'insensitive' } },
            ],
          }
          : {}),
      },
      orderBy: closed ? { settledAt: 'desc' } : { deadline: 'asc' },
      take: 24,
      select: {
        id: true, title: true, summary: true, category: true, stage: true,
        goalCents: true, raisedCents: true, backersCount: true,
        deadline: true, status: true, createdAt: true,
        founder: { select: { displayName: true, username: true } },
      },
    });
    return { raises, problem: null as string | null };
  } catch (error) {
    const problem = describeDbError(error);
    if (problem) return { raises: [], problem };
    throw error;
  }
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-tint text-ink-faint">
        <Rocket className="h-5 w-5" />
      </span>
      <h2 className="mt-4 w-full font-semibold">{title}</h2>
      <p className="mt-1.5 w-full max-w-md text-sm text-ink-muted">{body}</p>
    </div>
  );
}
