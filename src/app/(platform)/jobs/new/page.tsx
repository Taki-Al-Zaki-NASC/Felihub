import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { canPostJob } from '@/server/services/verification';
import { money } from '@/lib/money';
import { Card, PageHeader } from '@/components/ui/card';
import { JobForm } from '@/components/jobs/job-form';

export const metadata: Metadata = { title: 'Post a job' };

export default async function NewJob() {
  const user = await requireUser();
  if (user.role === 'FREELANCER') redirect('/jobs');

  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      idSubmitted: true, depositPaid: true, kycStage: true, role: true,
      image: true, postingBalanceCents: true,
    },
  });
  // The same predicate the Server Action enforces. Checked here only so the
  // form is not offered to someone whose submission would be refused.
  if (!canPostJob(account)) redirect('/verify');

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Post a job"
        description="Only identity-verified, deposit-backed freelancers can bid on this." />

      <Card className="mb-5 flex items-start gap-3 p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" />
        <p className="text-sm text-ink-muted">
          Posting is free. You fund escrow only when you hire, out of your
          posting balance of{' '}
          <strong className="text-ink">{money(account.postingBalanceCents)}</strong>.
        </p>
      </Card>

      <JobForm />
    </div>
  );
}
