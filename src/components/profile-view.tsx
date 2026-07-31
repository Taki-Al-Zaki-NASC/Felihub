'use client';

import type { PublicProfile } from '@/lib/schema';
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

      {!profile.bio && (!profile.skills || profile.skills.length === 0) && (
        <p className="mt-6 text-sm text-ink-muted">
          This profile has no description or skills yet.
        </p>
      )}
    </>
  );
}
