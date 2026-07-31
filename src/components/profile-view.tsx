'use client';

import type { PublicProfile, Review } from '@/lib/schema';
import { useCollection, byNewest, reviewsAbout } from '@/lib/queries';
import { Card, Pill, SectionLabel, money } from './ui';

/**
 * A profile as everyone else sees it.
 *
 * Rendered from `profiles/{uid}` only — the public document — so what the
 * owner sees here is exactly what a stranger sees. Building it from the
 * private `users/{uid}` record would show the owner a richer page than the one
 * that actually exists, which is how people end up surprised by what they are
 * publishing.
 */
export function ProfileView({ profile, action }: {
  profile: PublicProfile;
  /** Owner gets "Edit"; a visitor gets "Message". */
  action?: React.ReactNode;
}) {
  const name = profile.displayName?.trim() || 'Unnamed account';
  const roleLabel = profile.role === 'freelancer' ? 'Freelancer'
    : profile.role === 'agency' ? 'Agency'
      : profile.role === 'startup' ? 'Startup' : 'Client';

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {profile.photoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/jpeg;base64,${profile.photoBase64}`}
              alt={`${name}'s profile photo`}
              className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-teal-tint font-serif text-2xl font-semibold text-teal-deep">
              {name[0].toUpperCase()}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold">{name}</h1>
              {profile.verified
                ? <Pill tone="teal">✓ Verified</Pill>
                : <Pill>Unverified</Pill>}
              <Pill tone="violet">{roleLabel}</Pill>
            </div>
            {profile.title && (
              <p className="mt-1 text-sm font-medium text-ink-muted">{profile.title}</p>
            )}
            {profile.location && (
              <p className="mt-0.5 text-xs text-ink-faint">{profile.location}</p>
            )}
            {typeof profile.hourlyRateCents === 'number' && profile.hourlyRateCents > 0 && (
              <p className="mt-2 font-serif text-lg font-semibold text-teal-deep">
                {money(profile.hourlyRateCents)}
                <span className="text-xs font-normal text-ink-faint">/hr</span>
              </p>
            )}
          </div>

          {action && <div className="shrink-0 sm:self-center">{action}</div>}
        </div>
      </Card>

      {profile.bio && (
        <section className="mt-6">
          <SectionLabel>About</SectionLabel>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{profile.bio}</p>
        </section>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <section className="mt-6">
          <SectionLabel>Skills</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.skills.map((s) => <Pill key={s} tone="blue">{s}</Pill>)}
          </div>
        </section>
      )}

      {profile.experience && profile.experience.length > 0 && (
        <section className="mt-6">
          <SectionLabel>Work experience</SectionLabel>
          <div className="mt-2 space-y-3">
            {profile.experience.map((e, i) => (
              <div key={`${e.role}-${i}`}
                className="border-l-2 border-border pl-4">
                <p className="font-semibold">{e.role}</p>
                <p className="text-sm text-ink-muted">
                  {[e.company, e.period].filter(Boolean).join(' · ')}
                </p>
                {e.summary && (
                  <p className="mt-1 text-sm text-ink-muted">{e.summary}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.languages && profile.languages.length > 0 && (
        <section className="mt-6">
          <SectionLabel>Languages</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.languages.map((l) => <Pill key={l}>{l}</Pill>)}
          </div>
        </section>
      )}

      {profile.portfolioUrl && (
        <section className="mt-6">
          <SectionLabel>Portfolio</SectionLabel>
          <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-block break-all text-sm font-semibold text-teal-deep hover:underline">
            {profile.portfolioUrl}
          </a>
        </section>
      )}

      {/* The document id is the uid by construction, so it is the reliable
          source — older profiles were written without the field, and passing
          undefined into a where() clause throws during render. */}
      <Reviews uid={profile.uid || profile.id} />

      {!profile.bio
        && (!profile.skills || profile.skills.length === 0)
        && (!profile.experience || profile.experience.length === 0) && (
        <p className="mt-6 text-sm text-ink-muted">
          This profile has no description, skills or work history yet.
        </p>
      )}
    </>
  );
}

/**
 * Reviews about this account.
 *
 * Read from the public `reviews` collection rather than a rating cached on the
 * profile: a cached average is written by the person being rated, and the
 * whole point of a review is that its subject did not author it.
 */
function Reviews({ uid }: { uid: string }) {
  // A falsy uid would reach where('subjectId', '==', undefined), which
  // Firestore throws on synchronously — during render, taking the whole page
  // down. Passing a null path skips the query instead.
  const { data, loading, error } = useCollection<Review>(
    uid ? 'reviews' : null, uid ? reviewsAbout(uid) : [], [uid]);

  if (loading || error || data.length === 0) return null;

  const rows = byNewest(data);
  const average = rows.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rows.length;

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>Reviews</SectionLabel>
        <span className="text-sm">
          <strong className="font-serif text-lg text-teal-deep">
            {average.toFixed(1)}
          </strong>
          <span className="text-xs text-ink-faint"> / 5 · {rows.length}</span>
        </span>
      </div>
      <div className="mt-2 space-y-2">
        {rows.slice(0, 8).map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{r.authorName ?? 'A client'}</p>
              <span aria-label={`${r.rating} out of 5`} className="text-sm text-amber">
                {'★'.repeat(Math.max(0, Math.min(5, r.rating)))}
                <span className="text-ink-faint">
                  {'★'.repeat(Math.max(0, 5 - r.rating))}
                </span>
              </span>
            </div>
            {r.comment && (
              <p className="mt-1.5 text-sm text-ink-muted">{r.comment}</p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
