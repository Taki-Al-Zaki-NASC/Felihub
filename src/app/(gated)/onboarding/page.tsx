import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { money } from '@/lib/money';
import { ProfileForm } from '@/components/profile/profile-form';
import { AvatarUpload } from '@/components/profile/avatar-upload';
import { Progress } from '@/components/onboarding/progress';

export const metadata: Metadata = { title: 'Finish your profile' };

export default async function Onboarding() {
  const user = await requireUser();
  // Already onboarded and verified? Then this page has nothing to do and the
  // platform is where they belong.
  if (user.onboarded && user.isVerified) redirect('/dashboard');

  const [profile, account] = await Promise.all([
    db.profile.findUnique({
      where: { userId: user.id },
      select: {
        headline: true, bio: true, location: true, skills: true,
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
          <AvatarUpload image={account.image} displayName={user.displayName}
            required={isFreelancer} />
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
            skills: profile?.skills.join(', ') ?? '',
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
