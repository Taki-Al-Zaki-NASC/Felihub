import Link from 'next/link';
import type { Metadata } from 'next';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { money } from '@/lib/money';
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/components/profile/profile-form';
import { AvatarUpload } from '@/components/profile/avatar-upload';
import { signOutAction } from '@/server/actions/auth';

export const metadata: Metadata = { title: 'Settings' };

export default async function Settings() {
  const user = await requireUser();

  const [account, profile] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        email: true, username: true, role: true, kycStage: true,
        idSubmitted: true, depositPaid: true, depositCents: true,
        image: true, createdAt: true,
      },
    }),
    db.profile.findUnique({
      where: { userId: user.id },
      select: {
        headline: true, bio: true, location: true, skills: true,
        hourlyRateCents: true, portfolioUrl: true,
      },
    }),
  ]);

  const isFreelancer = account.role === 'FREELANCER';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings"
        description="Your account, your public profile, and what other people can see."
        action={
          <Button asChild variant="outline">
            <Link href={`/profile/${account.username}`}>
              View public profile <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        } />

      <Card className="mb-6">
        <CardHeader title="Account" />
        <dl className="divide-y divide-border">
          <Row label="Email" value={account.email} />
          <Row label="Username" value={`@${account.username}`} />
          <Row label="Account type" value={account.role.toLowerCase()} />
          <Row label="Verification" value={
            <span className="flex items-center gap-2">
              {user.isVerified ? (
                <Badge tone="teal">
                  <BadgeCheck className="mr-1 h-3 w-3" /> verified
                </Badge>
              ) : (
                <>
                  <Badge tone="amber">{account.kycStage.toLowerCase().replace('_', ' ')}</Badge>
                  <Link href="/verify"
                    className="text-sm font-semibold text-teal-deep hover:underline">
                    Finish
                  </Link>
                </>
              )}
            </span>
          } />
          <Row label="Deposit" value={
            account.depositPaid
              ? account.depositCents === 0 ? 'Cleared — free during beta' : money(account.depositCents)
              : 'Not cleared'
          } />
        </dl>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Public profile"
          description={isFreelancer
            ? 'This is what clients read in the talent directory before messaging you.'
            : 'Freelancers check who is hiring before they spend time on a proposal.'} />
        <div className="border-b border-border p-5">
          <AvatarUpload image={account.image} displayName={user.displayName}
            required={isFreelancer} />
        </div>
        <div className="p-5">
          <ProfileForm
            isFreelancer={isFreelancer}
            submitLabel="Save changes"
            defaults={{
              displayName: user.displayName,
              headline: profile?.headline ?? '',
              bio: profile?.bio ?? '',
              location: profile?.location ?? '',
              skills: profile?.skills.join(', ') ?? '',
              hourlyRate: profile?.hourlyRateCents ? money(profile.hourlyRateCents) : '',
              portfolioUrl: profile?.portfolioUrl ?? '',
            }}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Session" />
        <div className="p-5">
          <p className="text-sm text-ink-muted">
            Signing out clears this browser&rsquo;s session cookie. Your saved
            email stays so logging back in is one field.
          </p>
          <form action={signOutAction} className="mt-4">
            <Button type="submit" variant="outline">Sign out</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}
