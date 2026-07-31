'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useSession } from '@/lib/session';
import { freelancerProfiles, useCollection } from '@/lib/queries';
import type { PublicProfile } from '@/lib/schema';
import { describeError, openThread } from '@/lib/mutations';
import {
  Card, EmptyState, ErrorState, Loading, Pill, money,
} from '@/components/ui';

/**
 * Talent directory — the hiring side's equivalent of "Find work".
 *
 * A client browsing the jobs feed is looking at their own side of the market;
 * what they actually need is people. Built from `profiles/{uid}`, which is
 * public by rule and holds nothing private — no email, no identity reference,
 * no balances. Those live on `users/{uid}` and are owner-only.
 *
 * Messaging opens a thread directly rather than requiring a job first: a
 * client who wants to ask about availability should not have to post a
 * listing to do it.
 */
export default function Talent() {
  const { user } = useSession();
  const { data, loading, error } = useCollection<PublicProfile>(
    'profiles', freelancerProfiles(), []);
  const [term, setTerm] = useState('');
  const [skill, setSkill] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const router = useRouter();

  const skills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of data) for (const s of p.skills ?? []) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [data]);

  const shown = useMemo(() => {
    const q = term.trim().toLowerCase();
    return data
      // Profiles that have never been filled in are noise in a directory.
      .filter((p) => (p.displayName ?? '').trim() && p.uid !== user?.uid)
      .filter((p) => {
        if (skill && !(p.skills ?? []).includes(skill)) return false;
        if (!q) return true;
        return `${p.displayName} ${p.title ?? ''} ${p.bio ?? ''} ${(p.skills ?? []).join(' ')}`
          .toLowerCase().includes(q);
      })
      // Verified first — the whole premise of the marketplace.
      .sort((a, b) => Number(b.verified ?? false) - Number(a.verified ?? false));
  }, [data, term, skill, user?.uid]);

  async function message(p: PublicProfile) {
    if (!user || busyId) return;
    setBusyId(p.uid); setFailure(null);
    try {
      const id = await openThread({
        meId: user.uid, meName: user.displayName,
        otherId: p.uid, otherName: p.displayName ?? 'Felicek user',
      });
      router.push(`/messages/${id}` as Route);
    } catch (e) {
      setFailure(describeError(e));
      setBusyId(null);
    }
  }

  if (loading) return <Loading label="Loading freelancers…" />;

  return (
    <>
      <div>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Find talent</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every freelancer here holds an account on the same terms as yours.
          Message anyone directly — you do not need a listing first.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by name, headline or skill"
          className="w-full rounded-field border border-border bg-surface px-3.5 py-3 text-base outline-none focus:border-teal sm:text-sm"
        />
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map(([s, n]) => (
              <button key={s} type="button"
                onClick={() => setSkill(skill === s ? null : s)}
                aria-pressed={skill === s}
                className={`min-h-[36px] rounded-[9px] px-3.5 text-xs font-semibold transition ${
                  skill === s ? 'bg-teal text-white' : 'bg-backdrop text-ink-muted hover:bg-border'
                }`}>
                {s} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {failure && <div className="mt-4"><ErrorState message={failure} /></div>}
      {error && <div className="mt-4"><ErrorState message={error} /></div>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {shown.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState
              title={data.length === 0 ? 'No freelancers yet' : 'Nothing matches that'}
              message={data.length === 0
                ? 'Freelancer profiles appear here as people join and complete them.'
                : 'Try a different search, or clear the skill filter.'} />
          </div>
        ) : shown.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-start gap-3">
              {p.photoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`data:image/jpeg;base64,${p.photoBase64}`}
                  alt={`${p.displayName}'s profile photo`}
                  className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-tint font-serif text-lg font-semibold text-teal-deep">
                  {(p.displayName ?? '?')[0].toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/profile/${p.uid}` as Route}
                    className="truncate font-semibold hover:text-teal-deep hover:underline">
                    {p.displayName}
                  </Link>
                  {p.verified && <Pill tone="teal">Verified</Pill>}
                </div>
                {p.title && (
                  <p className="mt-0.5 truncate text-sm text-ink-muted">{p.title}</p>
                )}
                {p.location && (
                  <p className="mt-0.5 text-xs text-ink-faint">{p.location}</p>
                )}
              </div>
              {typeof p.hourlyRateCents === 'number' && p.hourlyRateCents > 0 && (
                <span className="shrink-0 text-sm font-semibold">
                  {money(p.hourlyRateCents)}<span className="text-xs text-ink-faint">/hr</span>
                </span>
              )}
            </div>

            {p.bio && (
              <p className="mt-3 line-clamp-3 text-sm text-ink-muted">{p.bio}</p>
            )}

            {p.skills && p.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.skills.slice(0, 5).map((s) => <Pill key={s} tone="blue">{s}</Pill>)}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Link href={`/profile/${p.uid}` as Route}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-button border border-border-strong bg-surface px-4 text-sm font-bold transition hover:bg-backdrop">
                View profile
              </Link>
              <button
                onClick={() => void message(p)}
                disabled={busyId === p.uid}
                className="min-h-[44px] flex-1 rounded-button bg-ink-strong px-4 text-sm font-bold text-canvas transition hover:opacity-90 disabled:opacity-50"
              >
                {busyId === p.uid ? 'Opening…' : 'Message'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
