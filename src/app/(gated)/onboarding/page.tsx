import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { money } from '@/lib/money';
import { ProfileForm } from '@/components/profile/profile-form';
import { AvatarEditor } from '@/components/profile/avatar-editor';
import { Progress } from '@/components/onboarding/progress';
import { AlreadyDone } from '@/components/ui/already-done';

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

  return (
    <>
      <Progress step={1} />
      <h1 className="mt-6 font-serif text-2xl font-semibold">
        Finish your profile
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        {isFreelancer
          ? 'This is what a client reads before deciding to message you. '
            + 'Two more minutes here is worth more than ten more bids.'
          : 'Freelancers check who is hiring before they spend time on a '
            + 'proposal. A filled-in profile gets better bids.'}
      </p>

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
          isFreelancer={isFreelancer}
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
