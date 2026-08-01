'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { money } from '@/lib/money';
import { platformFee } from '@/lib/fees';
import type { FormResult } from '@/server/actions/profile';

/**
 * Fund one milestone: money leaves the client's posting balance and is held
 * against that milestone. Nothing about the freelancer changes yet — funding
 * is a commitment, not a payment.
 */
export async function fundMilestoneAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const milestoneId = String(form.get('milestoneId') ?? '');

  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
    select: {
      id: true, amountCents: true, funded: true, label: true,
      job: {
        select: {
          id: true, ownerId: true, title: true,
          proposals: {
            where: { status: 'ACCEPTED' },
            take: 1,
            select: { freelancerId: true },
          },
        },
      },
    },
  });
  if (!milestone) return { error: 'That milestone no longer exists.' };
  if (milestone.job.ownerId !== user.id) {
    return { error: 'Only the client who posted the job can fund it.' };
  }
  if (milestone.funded) return { ok: true };

  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { postingBalanceCents: true },
  });
  if (account.postingBalanceCents < milestone.amountCents) {
    const short = (milestone.amountCents - account.postingBalanceCents) / 100;
    return {
      error: `That milestone is ${money(milestone.amountCents)} and you are `
        + `$${short.toFixed(2)} short. Top up on the Wallet page.`,
    };
  }

  const freelancerId = milestone.job.proposals[0]?.freelancerId;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { postingBalanceCents: { decrement: milestone.amountCents } },
    });
    await tx.job.update({
      where: { id: milestone.job.id },
      data: { escrowHeldCents: { increment: milestone.amountCents } },
    });
    await tx.milestone.update({
      where: { id: milestone.id },
      data: { funded: true, fundedAt: new Date() },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: user.id,
        kind: 'ESCROW_HOLD',
        amountCents: -milestone.amountCents,
        label: `Escrow funded — ${milestone.label}`,
        jobId: milestone.job.id,
      },
    });
    if (freelancerId) {
      await tx.notification.create({
        data: {
          userId: freelancerId,
          kind: 'MILESTONE_FUNDED',
          title: 'A milestone was funded',
          body: `${money(milestone.amountCents)} is in escrow for “${milestone.label}”. You can start.`,
          href: `/jobs/${milestone.job.id}`,
        },
      });
    }
  });

  revalidatePath(`/jobs/${milestone.job.id}`);
  revalidatePath('/wallet');
  return { ok: true };
}

/**
 * Release one milestone. This is the only place money reaches a freelancer.
 *
 * The platform fee and the amount released are separate ledger rows on both
 * sides, because blending them is precisely how a marketplace advertises 1%
 * and collects several. A freelancer can read exactly what was earned and
 * exactly what was deducted.
 */
export async function releaseMilestoneAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const milestoneId = String(form.get('milestoneId') ?? '');

  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
    select: {
      id: true, amountCents: true, funded: true, released: true, label: true,
      job: {
        select: {
          id: true, ownerId: true, title: true, escrowHeldCents: true,
          proposals: {
            where: { status: 'ACCEPTED' },
            take: 1,
            select: { id: true, freelancerId: true },
          },
          milestones: { select: { id: true, released: true } },
        },
      },
    },
  });
  if (!milestone) return { error: 'That milestone no longer exists.' };
  if (milestone.job.ownerId !== user.id) {
    return { error: 'Only the client who posted the job can release payment.' };
  }
  if (!milestone.funded) {
    return { error: 'Fund this milestone before releasing it.' };
  }
  if (milestone.released) return { ok: true };

  const hired = milestone.job.proposals[0];
  if (!hired) return { error: 'Nobody is hired on this job yet.' };

  const gross = milestone.amountCents;
  const fee = platformFee(gross);
  const net = gross - fee;

  // Every milestone but this one already released? Then the job is done.
  const lastOne = milestone.job.milestones
    .every((m) => m.id === milestone.id || m.released);

  await db.$transaction(async (tx) => {
    await tx.milestone.update({
      where: { id: milestone.id },
      data: { released: true, releasedAt: new Date() },
    });
    await tx.job.update({
      where: { id: milestone.job.id },
      data: {
        escrowHeldCents: { decrement: gross },
        ...(lastOne ? { status: 'CLOSED' as const } : {}),
      },
    });
    await tx.user.update({
      where: { id: hired.freelancerId },
      data: {
        walletBalanceCents: { increment: net },
        totalEarnedCents: { increment: net },
      },
    });
    if (lastOne) {
      await tx.proposal.update({
        where: { id: hired.id },
        data: { status: 'COMPLETED' },
      });
      // The trust bond comes back after the first completed job, which is what
      // was promised when it was taken.
      const freelancer = await tx.user.findUniqueOrThrow({
        where: { id: hired.freelancerId },
        select: { depositReleased: true, depositCents: true, depositKind: true },
      });
      if (!freelancer.depositReleased && freelancer.depositKind === 'TRUST_BOND') {
        await tx.user.update({
          where: { id: hired.freelancerId },
          data: {
            depositReleased: true,
            walletBalanceCents: { increment: freelancer.depositCents },
          },
        });
        if (freelancer.depositCents > 0) {
          await tx.ledgerEntry.create({
            data: {
              userId: hired.freelancerId,
              kind: 'REFUND',
              amountCents: freelancer.depositCents,
              label: 'Trust bond refunded — first job completed',
              jobId: milestone.job.id,
            },
          });
        }
      }
    }

    await tx.ledgerEntry.createMany({
      data: [
        {
          userId: hired.freelancerId,
          kind: 'ESCROW_RELEASE',
          amountCents: gross,
          label: `Released — ${milestone.label}`,
          jobId: milestone.job.id,
        },
        {
          userId: hired.freelancerId,
          kind: 'PLATFORM_FEE',
          amountCents: -fee,
          label: `Felicek fee, 1% of ${money(gross)}`,
          jobId: milestone.job.id,
        },
        {
          userId: user.id,
          kind: 'ESCROW_RELEASE',
          amountCents: 0,
          label: `Released ${money(gross)} — ${milestone.label}`,
          jobId: milestone.job.id,
        },
      ],
    });

    await tx.notification.create({
      data: {
        userId: hired.freelancerId,
        kind: 'MILESTONE_RELEASED',
        title: lastOne ? 'Final milestone released' : 'Milestone released',
        body: `${money(net)} is in your wallet for “${milestone.label}” `
          + `(${money(gross)} less the ${money(fee)} platform fee).`,
        href: `/jobs/${milestone.job.id}`,
      },
    });
  });

  revalidatePath(`/jobs/${milestone.job.id}`);
  revalidatePath('/wallet');
  revalidatePath('/contracts');
  return { ok: true };
}
