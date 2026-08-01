import Link from 'next/link';
import type { Metadata } from 'next';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { money } from '@/lib/money';
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/components/profile/profile-form';
import { AvatarEditor } from '@/components/profile/avatar-editor';
import { ExperienceEditor } from '@/components/profile/experience-editor';
import { parseExperience } from '@/lib/experience';
import { signOutAction } from '@/server/actions/auth';
import { appsFor } from '@/lib/apps';
import { AppCard } from '@/components/settings/app-card';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Two tabs, as query parameters rather than client state.
 *
 * A link is shareable, survives a refresh, and the back button works — none of
 * which is true of a tab that only exists in a `useState`. It also keeps this
 * page a Server Component, so the apps grid is rendered from the database
 * rather than fetched after paint.
 */
const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'apps', label: 'Apps' },
] as const;

export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const active = tab === 'apps' ? 'apps' : 'profile';

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
        headline: true, bio: true, location: true, skills: true, category: true,
        hourlyRateCents: true, portfolioUrl: true, experience: true,
      },
    }),
  ]);

  const isFreelancer = account.role === 'FREELANCER';
  const offered = appsFor(account.role);
  // From the session, not a second query — see server/auth.ts.
  const on = new Set(user.apps);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings"
        description="Your account, your public profile, and the tools you have switched on."
        action={
          <Button asChild variant="outline">
            <Link href={`/profile/${account.username}`}>
              View public profile <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        } />

      <nav aria-label="Settings sections"
        className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link key={t.key} href={`/settings?tab=${t.key}`}
            aria-current={active === t.key ? 'page' : undefined}
            className={`-mb-px min-h-[40px] border-b-2 px-4 py-2 text-sm font-semibold transition ${
              active === t.key
                ? 'border-teal text-teal-deep'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {active === 'apps' ? (
        <>
          <Card className="mb-5 p-5">
            <h2 className="font-serif text-lg font-semibold">Apps</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Optional tools, all free, all off until you turn them on. Turning
              one off hides it and keeps whatever you made with it — a board is
              not deleted because you stopped using boards for a fortnight.
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {offered.map((app) => (
              <AppCard key={app.key} app={app} enabled={on.has(app.key)} />
            ))}
          </div>

          {offered.length === 0 && (
            <Card className="p-5">
              <p className="text-sm text-ink-muted">
                No tools are offered to {account.role.toLowerCase()} accounts yet.
              </p>
            </Card>
          )}
        </>
      ) : (
      <>
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
          <AvatarEditor username={user.username} displayName={user.displayName}
            hasImage={Boolean(account.image)} required={isFreelancer} />
        </div>
        <div className="p-5">
          <ProfileForm
            role={user.role}
            submitLabel="Save changes"
            defaults={{
              displayName: user.displayName,
              headline: profile?.headline ?? '',
              bio: profile?.bio ?? '',
              location: profile?.location ?? '',
              category: profile?.category ?? '',
              skills: profile?.skills ?? [],
              hourlyRate: profile?.hourlyRateCents ? money(profile.hourlyRateCents) : '',
              portfolioUrl: profile?.portfolioUrl ?? '',
            }}
          />
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Work experience"
          description="Past roles, shown on your public profile. The fastest way to convince someone you have done this before." />
        <div className="p-5">
          <ExperienceEditor initial={parseExperience(profile?.experience)} />
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
      </>
      )}
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
