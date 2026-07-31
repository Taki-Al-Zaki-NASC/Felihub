import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import {
  FREE_VERIFICATION, depositFor, isVerified,
} from '@/server/services/verification';
import { VerifyPanel } from '@/components/verify/verify-panel';
import { Progress } from '@/components/onboarding/progress';

export const metadata: Metadata = { title: 'Verify your account' };

export default async function Verify() {
  const user = await requireUser();
  if (!user.onboarded) redirect('/onboarding');
  if (user.isVerified) redirect('/dashboard');

  const record = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { idSubmitted: true, depositPaid: true, kycStage: true, role: true },
  });

  // Belt and braces: the layout already redirects on `isVerified`, but reading
  // it again from fresh data means a stale session cannot leave someone stuck
  // on a page they have finished.
  if (isVerified(record)) redirect('/dashboard');

  const deposit = depositFor(record.role);

  return (
    <>
      <Progress step={2} />
      <h1 className="mt-6 font-serif text-2xl font-semibold">
        Verify your account
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Both steps are required, for every account on both sides of the
        marketplace. Until they are done you can look around, but you cannot
        post, bid or message.
      </p>

      <div className="mt-8">
        <VerifyPanel
          idSubmitted={record.idSubmitted}
          depositPaid={record.depositPaid}
          depositLabel={`${deposit.label} — ${FREE_VERIFICATION ? 'free during beta' : '$' + deposit.cents / 100}`}
          depositExplain={deposit.explain}
          freeBeta={FREE_VERIFICATION}
        />
      </div>
    </>
  );
}
