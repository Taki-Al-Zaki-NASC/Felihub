import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Inbox, Lock, ShieldCheck } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { canBid } from '@/server/services/verification';
import { ago, money } from '@/lib/money';
import { Badge, Card, CardHeader, Empty, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProposalForm } from '@/components/jobs/proposal-form';
import { HireButton } from '@/components/jobs/hire-button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await db.job.findUnique({
    where: { id }, select: { title: true },
  });
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
      budgetCents: true, status: true, escrowHeldCents: true,
      proposalsCount: true, createdAt: true, ownerId: true,
      owner: { select: { displayName: true, username: true } },
    },
  });
  if (!job) notFound();

  const isOwner = job.ownerId === user.id;

  // Proposals are read only by the person who posted the job. A freelancer
  // gets their own bid and nothing else — not a filtered list of everyone's.
  const proposals = isOwner
    ? await db.proposal.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, bidCents: true, note: true, status: true, createdAt: true,
        score: true, answerPreview: true,
        freelancer: {
          select: {
            username: true, displayName: true,
            profile: { select: { headline: true, ratingAvg: true, ratingCount: true } },
          },
        },
      },
    })
    : [];

  const mine = isOwner ? null : await db.proposal.findUnique({
    where: { jobId_freelancerId: { jobId: job.id, freelancerId: user.id } },
    select: { bidCents: true, note: true, status: true },
  });

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
          description={`${job.category} · posted ${ago(job.createdAt)} by ${job.owner.displayName}`} />

        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={job.status === 'OPEN' ? 'teal' : 'neutral'}>
              {job.status.toLowerCase()}
            </Badge>
            {job.escrowHeldCents > 0 && (
              <Badge tone="violet">{money(job.escrowHeldCents)} in escrow</Badge>
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

        {isOwner && (
          <Card className="mt-6">
            <CardHeader title={`Bids (${proposals.length})`}
              description={job.status === 'OPEN'
                ? 'Hiring funds escrow from your posting balance in the same step.'
                : 'This job is filled.'} />
            {proposals.length === 0 ? (
              <div className="p-5">
                <Empty icon={Inbox} title="No bids yet"
                  body="Verified freelancers see this posting on their board. Bids usually start arriving within a day." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {proposals.map((p) => (
                  <li key={p.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/profile/${p.freelancer.username}`}
                          className="font-semibold hover:underline">
                          {p.freelancer.displayName}
                        </Link>
                        <p className="text-sm text-ink-muted">
                          {p.freelancer.profile?.headline}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          Bid {ago(p.createdAt)}
                          {p.freelancer.profile?.ratingCount
                            ? ` · ★ ${p.freelancer.profile.ratingAvg?.toFixed(1)} (${p.freelancer.profile.ratingCount})`
                            : ' · no reviews yet'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-lg font-semibold">
                          {money(p.bidCents)}
                        </p>
                        <Badge tone={
                          p.status === 'ACCEPTED' ? 'teal'
                            : p.status === 'DECLINED' ? 'danger' : 'neutral'
                        }>
                          {p.status.toLowerCase()}
                        </Badge>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm text-ink-muted">
                      {p.note}
                    </p>

                    {p.score != null && (
                      <div className="mt-3 rounded-md border border-border bg-neutral-tint p-3">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <Lock className="h-3.5 w-3.5 text-ink-faint" />
                          Challenge score: {p.score}%
                        </p>
                        {p.answerPreview && (
                          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                            {p.answerPreview}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs text-ink-faint">
                          Their full submission stays private to them — you see the
                          score and this preview.
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.status === 'OPEN' && p.status !== 'DECLINED' && (
                        <HireButton proposalId={p.id}
                          amount={money(p.bidCents)}
                          name={p.freelancer.displayName.split(' ')[0]} />
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/messages/new?to=${p.freelancer.username}`}>
                          Message
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <aside>
        {isOwner ? (
          <Card className="p-5">
            <h2 className="font-serif text-base font-semibold">Your posting</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Bids" value={String(job.proposalsCount)} />
              <Row label="Budget" value={money(job.budgetCents)} />
              <Row label="In escrow" value={money(job.escrowHeldCents)} />
            </dl>
          </Card>
        ) : account.role !== 'FREELANCER' ? (
          <Card className="p-5">
            <p className="text-sm text-ink-muted">
              This is a hiring account, so there is nothing to bid with here.
              You can post your own job or browse verified talent.
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
              Bidding is free. There are no credits to buy.
            </p>
            <div className="mt-4">
              <ProposalForm jobId={job.id}
                existingBid={mine ? money(mine.bidCents) : undefined}
                existingNote={mine?.note} />
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
