import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Inbox, ShieldCheck, Trophy } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { canBid } from '@/server/services/verification';
import { ago, money } from '@/lib/money';
import { MAX_BID_REVISIONS } from '@/lib/bids';
import { Badge, Card, CardHeader, Empty, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProposalForm } from '@/components/jobs/proposal-form';
import { MilestoneList } from '@/components/jobs/milestone-list';
import { ProposalList } from '@/components/jobs/proposal-list';
import { proposalsForViewer } from '@/server/services/proposals';
import { ChallengeBuilder } from '@/components/jobs/challenge-builder';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id }, select: { title: true } });
  return { title: job?.title ?? 'Job' };
}

export default async function JobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const job = await db.job.findUnique({
    where: { id },
    select: {
      id: true, title: true, description: true, category: true, skills: true,
      budgetCents: true, durationDays: true, status: true, escrowHeldCents: true,
      proposalsCount: true, createdAt: true, ownerId: true,
      owner: { select: { displayName: true, username: true } },
      milestones: {
        orderBy: { position: 'asc' },
        select: {
          id: true, label: true, amountCents: true,
          funded: true, released: true, position: true,
        },
      },
      challenge: {
        select: {
          id: true, mode: true, prompt: true, maxAttempts: true,
          timeLimitMins: true, scheduledAt: true,
        },
      },
    },
  });
  if (!job) notFound();

  const isOwner = job.ownerId === user.id;

  // Bids are private. `proposalsForViewer` is the only module that reads the
  // Proposal table; it decides per viewer which columns are even fetched.
  const view = await proposalsForViewer(job.id, user.id);
  const mine = view.own;
  const hired = view.proposals.some((p) => p.status === 'ACCEPTED');

  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      idSubmitted: true, depositPaid: true, kycStage: true,
      role: true, image: true,
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <PageHeader title={job.title}
          description={`${job.category} · posted ${ago(job.createdAt)} by ${job.owner.displayName}`
            + (job.durationDays ? ` · about ${job.durationDays} days` : '')} />

        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={job.status === 'OPEN' ? 'teal' : 'neutral'}>
              {job.status.toLowerCase()}
            </Badge>
            {job.escrowHeldCents > 0 && (
              <Badge tone="violet">{money(job.escrowHeldCents)} in escrow</Badge>
            )}
            {job.challenge && (
              <Badge tone="violet">
                <Trophy className="mr-1 h-3 w-3" />
                {job.challenge.mode.toLowerCase()} challenge
              </Badge>
            )}
            <span className="ml-auto font-serif text-xl font-semibold">
              {money(job.budgetCents)}
            </span>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
            {job.description}
          </p>

          {job.skills.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-4">
              {job.skills.map((s) => <Badge key={s}>{s}</Badge>)}
            </div>
          )}
        </Card>

        {job.milestones.length > 0 && (
          <Card className="mt-6">
            <CardHeader title="Milestones"
              description={isOwner || mine?.status === 'ACCEPTED'
                ? 'Escrow is funded and released one milestone at a time.'
                : 'Every job on Felicek is milestone-based. The amounts are '
                  + 'between the client and whoever is hired.'} />
            <MilestoneList milestones={job.milestones} isOwner={isOwner}
              hired={hired}
              showAmounts={isOwner || mine?.status === 'ACCEPTED'} />
          </Card>
        )}

        {isOwner && job.status === 'OPEN' && (
          <Card className="mt-6">
            <CardHeader
              title={job.challenge ? 'Change the challenge' : 'Add a skill challenge'}
              description="Optional. A short test tells you more than a paragraph of claims — and the freelancer's full submission stays private to them." />
            <div className="p-5">
              <ChallengeBuilder jobId={job.id} existingMode={job.challenge?.mode} />
            </div>
          </Card>
        )}

        {job.challenge && (
          <Card className="mt-6">
            <CardHeader title="Skill challenge"
              description={`${job.challenge.maxAttempts} attempts. `
                + (job.challenge.mode === 'LIVE'
                  ? 'Held live with the client.'
                  : 'Your full submission stays private to you — the client sees a score and a short preview.')} />
            <div className="p-5">
              {job.challenge.prompt && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {job.challenge.prompt}
                </p>
              )}
              {job.challenge.mode === 'LIVE' && job.challenge.scheduledAt && (
                <p className="mt-3 text-sm text-ink-muted">
                  Scheduled for {job.challenge.scheduledAt.toLocaleString()}.
                </p>
              )}
              {!isOwner && account.role === 'FREELANCER' && mine && (
                <Button asChild variant="outline" className="mt-4">
                  <Link href={`/jobs/${job.id}/challenge`}>Open the challenge</Link>
                </Button>
              )}
              {!mine && !isOwner && (
                <p className="mt-3 text-xs text-ink-faint">
                  Submit a bid first — the challenge opens with it.
                </p>
              )}
            </div>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader
            title={`Proposals (${view.total})`}
            description={isOwner
              ? view.range
                ? `Bids from ${money(view.range.lowCents)} to ${money(view.range.highCents)}. Only you can see these.`
                : 'Only you can see the amounts and cover letters on your job.'
              : 'Who applied is public. What they wrote and asked for is not — '
                + 'yours is private in the same way.'} />
          {view.total === 0 ? (
            <div className="p-5">
              <Empty icon={Inbox} title="No proposals yet"
                body="Verified freelancers see this posting on their board, matched against their skills." />
            </div>
          ) : (
            <ProposalList
              proposals={view.proposals}
              isOwner={isOwner}
              jobOpen={job.status === 'OPEN'}
              viewerUsername={user.username}
              firstMilestoneCents={job.milestones[0]?.amountCents ?? null} />
          )}
        </Card>
      </div>

      <aside>
        {isOwner ? (
          <Card className="p-5">
            <h2 className="font-serif text-base font-semibold">Your posting</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Proposals" value={String(view.total)} />
              <Row label="Budget" value={money(job.budgetCents)} />
              <Row label="In escrow" value={money(job.escrowHeldCents)} />
              <Row label="Milestones" value={String(job.milestones.length)} />
            </dl>
          </Card>
        ) : account.role !== 'FREELANCER' ? (
          <Card className="p-5">
            <p className="text-sm text-ink-muted">
              This is a hiring account, so there is nothing to bid with here.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link href="/talent">Browse talent</Link>
            </Button>
          </Card>
        ) : job.status !== 'OPEN' ? (
          <Card className="p-5">
            <p className="text-sm text-ink-muted">
              This job is no longer taking bids.
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/jobs">Find other work</Link>
            </Button>
          </Card>
        ) : !canBid(account) ? (
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-serif text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-teal-deep" />
              Verification required
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {account.image
                ? 'Bidding needs both your identity document and your deposit. It is free during the beta.'
                : 'Add a profile photo before bidding — clients skip faceless profiles.'}
            </p>
            <Button asChild variant="primary" className="mt-4 w-full">
              <Link href={account.image ? '/verify' : '/settings'}>
                {account.image ? 'Finish verification' : 'Add a photo'}
              </Link>
            </Button>
          </Card>
        ) : (
          <Card className="p-5">
            <h2 className="font-serif text-base font-semibold">
              {mine ? 'Your bid' : 'Submit a proposal'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Bidding is free. Only the client sees your price and cover
              letter, and you can revise them {MAX_BID_REVISIONS} times.
            </p>
            <div className="mt-4">
              <ProposalForm jobId={job.id}
                existingBid={mine ? money(mine.bidCents) : undefined}
                existingNote={mine?.note}
                existingTimeline={mine?.timelineDays ?? undefined}
                existingAttachment={mine?.attachmentUrl ?? undefined}
                revisionsUsed={mine?.revisions ?? 0}
                maxRevisions={MAX_BID_REVISIONS} />
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
