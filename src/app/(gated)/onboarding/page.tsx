import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { money } from '@/lib/money';
import { ProfileForm } from '@/components/profile/profile-form';
import { AvatarEditor } from '@/components/profile/avatar-editor';
import { Progress } from '@/components/onboarding/progress';
import { AlreadyDone } from '@/components/ui/already-done';
import { flowFor } from '@/lib/onboarding';

export const metadata: Metadata = { title: 'Finish your profile' };

export default async function Onboarding() {
  const user = await requireUser();
  // Already finished? Say so rather than bouncing — a redirect here is what
  // made the back button appear broken.
  if (user.onboarded && user.isVerified) {
    return (
      <AlreadyDone
        title="Your profile is complete"
        body="Nothing left to fill in here. You can edit any of it later in Settings."
        href="/dashboard" cta="Go to your dashboard" />
    );
  }

  const [profile, account] = await Promise.all([
    db.profile.findUnique({
      where: { userId: user.id },
      select: {
        headline: true, bio: true, location: true, skills: true, category: true,
        hourlyRateCents: true, portfolioUrl: true,
      },
    }),
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { image: true },
    }),
  ]);

  const isFreelancer = user.role === 'FREELANCER';
  // Four account types, four flows. The heading, the questions and what the
  // account gets at the end all come from one definition per role.
  const flow = flowFor(user.role);

  return (
    <>
      <Progress step={1} steps={flow.steps} />
      <h1 className="mt-6 font-serif text-2xl font-semibold">{flow.title}</h1>
      <p className="mt-1.5 text-sm text-ink-muted">{flow.intro}</p>

      <ul className="mt-4 space-y-1.5 rounded-lg border border-border bg-neutral-tint p-4">
        <li className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          What a verified {flow.noun} account can do
        </li>
        {flow.unlocks.map((u) => (
          <li key={u} className="flex gap-2 text-sm text-ink-muted">
            <span aria-hidden className="font-bold text-teal-deep">✓</span>
            {u}
          </li>
        ))}
      </ul>

      {/* Its own form, saved on pick: the photo is a separate write from the
          text fields, so choosing one never risks losing what was typed. */}
      <div className="mt-7 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Profile photo</h2>
        <div className="mt-3">
          <AvatarEditor username={user.username} displayName={user.displayName}
            hasImage={Boolean(account.image)} required={isFreelancer} />
        </div>
      </div>

      <div className="mt-6">
        <ProfileForm
          role={user.role}
          submitLabel="Save and continue"
          defaults={{
            displayName: user.displayName,
            headline: profile?.headline ?? '',
            bio: profile?.bio ?? '',
            location: profile?.location ?? '',
            category: profile?.category ?? '',
            skills: profile?.skills ?? [],
            hourlyRate: profile?.hourlyRateCents
              ? money(profile.hourlyRateCents)
              : '',
            portfolioUrl: profile?.portfolioUrl ?? '',
          }}
        />
      </div>
    </>
  );
}
