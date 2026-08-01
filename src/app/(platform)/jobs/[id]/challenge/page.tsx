import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Video } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { publicChallengeFor } from '@/server/services/challenge';
import { modeLabel } from '@/lib/challenge';
import { Card, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChallengeTaker } from '@/components/jobs/challenge-taker';

export const metadata: Metadata = { title: 'Skill challenge' };

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const job = await db.job.findUnique({
    where: { id },
    select: { id: true, title: true, ownerId: true, status: true },
  });
  if (!job) notFound();
  // The owner has no attempt to make; send them to the posting, where the
  // scores are.
  if (job.ownerId === user.id) redirect(`/jobs/${job.id}`);

  const challenge = await publicChallengeFor(job.id);
  if (!challenge) redirect(`/jobs/${job.id}`);

  const proposal = await db.proposal.findUnique({
    where: { jobId_freelancerId: { jobId: job.id, freelancerId: user.id } },
    select: { id: true },
  });
  if (!proposal) redirect(`/jobs/${job.id}`);

  const attemptsUsed = await db.challengeAnswer.count({
    where: { proposalId: proposal.id },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href={`/jobs/${job.id}`}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the job
        </Link>
      </Button>

      <PageHeader title="Skill challenge"
        description={`${modeLabel(challenge.mode)} · ${job.title}`} />

      {challenge.mode === 'LIVE' ? (
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-serif text-base font-semibold">
            <Video className="h-4 w-4 text-teal-deep" />
            Live interview
          </h2>
          {challenge.scheduledAt && (
            <p className="mt-2 text-sm">
              Scheduled for{' '}
              <strong>{challenge.scheduledAt.toLocaleString()}</strong>.
            </p>
          )}
          {challenge.prompt && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
              {challenge.prompt}
            </p>
          )}
          <p className="mt-4 text-sm text-ink-muted">
            The interview is held in your message thread with the client, over
            a peer-to-peer call. Nothing is submitted here.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/messages">Open messages</Link>
          </Button>
        </Card>
      ) : (
        <ChallengeTaker
          jobId={job.id}
          mode={challenge.mode}
          prompt={challenge.prompt}
          questions={challenge.questions.map((q) => ({
            prompt: q.prompt,
            options: q.options,
          }))}
          attemptsUsed={attemptsUsed}
          maxAttempts={challenge.maxAttempts}
          timeLimitMins={challenge.timeLimitMins}
        />
      )}
    </div>
  );
}
