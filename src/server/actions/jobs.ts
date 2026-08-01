'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { canBid, canPostJob } from '@/server/services/verification';
import { parseMoney } from '@/lib/money';
import { CATEGORIES } from '@/lib/categories';
import { parseTags, tagsSchema } from '@/lib/tags';
import { milestonesSchema, parseMilestones, sumCents } from '@/lib/milestones';
import { MAX_BID_REVISIONS } from '@/lib/bids';
import { money } from '@/lib/money';
import type { FormResult } from '@/server/actions/profile';

const jobSchema = z.object({
  title: z.string().trim().min(8, 'Say what you need in a full line.').max(140),
  description: z.string().trim()
    .min(80, 'Scope, deliverables and how you will judge it done — a couple of paragraphs.')
    .max(20000),
  category: z.enum(CATEGORIES, { message: 'Pick a category.' }),
  skills: tagsSchema.min(1, 'List at least one skill.'),
  budgetCents: z.number().int().positive('Enter a budget.'),
  durationDays: z.number().int().min(1).max(3650).nullable(),
  milestones: milestonesSchema,
});

function flatten(error: z.ZodError): FormResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0] ?? 'form')] ??= issue.message;
  }
  return { fieldErrors };
}

/** The gate, read from the database rather than from the session, so a stale
 *  page cannot submit a write the account is not entitled to make. */
async function gateFor(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      idSubmitted: true, depositPaid: true, kycStage: true,
      role: true, image: true, postingBalanceCents: true,
    },
  });
}

export async function createJobAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const account = await gateFor(user.id);

  if (account.role === 'FREELANCER') {
    return {
      error: 'This is a freelancer account, which bids on work rather than '
        + 'posting it. Posting needs a client, agency or startup account.',
    };
  }
  if (!canPostJob(account)) {
    return { error: 'Finish verification before posting — both the document and the deposit.' };
  }

  const parsed = jobSchema.safeParse({
    title: form.get('title'),
    description: form.get('description'),
    category: form.get('category'),
    skills: parseTags(form.get('skills')),
    budgetCents: parseMoney(String(form.get('budget') ?? '')) ?? 0,
    durationDays: String(form.get('durationDays') ?? '').trim()
      ? Number(form.get('durationDays'))
      : null,
    milestones: parseMilestones(form.get('milestones')),
  });
  if (!parsed.success) return flatten(parsed.error);

  const { milestones, ...job } = parsed.data;

  // The parts have to add up to the whole. Letting them disagree means the
  // budget is decoration and nobody can tell what was actually agreed.
  const total = sumCents(milestones);
  if (total !== job.budgetCents) {
    const off = total > job.budgetCents ? total - job.budgetCents : job.budgetCents - total;
    return {
      fieldErrors: {
        milestones: total > job.budgetCents
          ? `Milestones add up to ${money(off)} more than the budget.`
          : `Milestones are ${money(off)} short of the budget.`,
      },
    };
  }

  const created = await db.job.create({
    data: {
      ...job,
      ownerId: user.id,
      milestones: {
        createMany: {
          data: milestones.map((m, position) => ({ ...m, position })),
        },
      },
    },
    select: { id: true },
  });

  revalidatePath('/jobs');
  revalidatePath('/dashboard');
  redirect(`/jobs/${created.id}`);
}

const bidSchema = z.object({
  bidCents: z.number().int().positive('Enter what you would charge.'),
  note: z.string().trim()
    .min(40, 'Say how you would approach it — a client reads this before your price.')
    .max(8000),
  timelineDays: z.number().int().min(1).max(3650).nullable(),
  attachmentUrl: z.string().trim().url('That is not a full URL.').max(500)
    .nullable(),
});

export async function submitProposalAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const account = await gateFor(user.id);

  if (account.role !== 'FREELANCER') {
    return { error: 'Only freelancer accounts can bid.' };
  }
  if (!canBid(account)) {
    return {
      error: account.image
        ? 'Finish verification before bidding — both the document and the deposit.'
        : 'Add a profile photo before bidding. Clients skip faceless profiles, so this protects your time as much as theirs.',
    };
  }

  const jobId = String(form.get('jobId') ?? '');
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, ownerId: true, title: true },
  });
  if (!job) return { error: 'That job no longer exists.' };
  if (job.status !== 'OPEN') return { error: 'That job is no longer taking bids.' };
  if (job.ownerId === user.id) return { error: 'You cannot bid on your own posting.' };

  const rawDays = String(form.get('timelineDays') ?? '').trim();
  const rawUrl = String(form.get('attachmentUrl') ?? '').trim();
  const parsed = bidSchema.safeParse({
    bidCents: parseMoney(String(form.get('bid') ?? '')) ?? 0,
    note: form.get('note'),
    timelineDays: rawDays ? Number(rawDays) : null,
    attachmentUrl: rawUrl || null,
  });
  if (!parsed.success) return flatten(parsed.error);

  // Upsert on the (jobId, freelancerId) unique pair: re-bidding edits the
  // existing proposal rather than stacking a second one.
  const existing = await db.proposal.findUnique({
    where: { jobId_freelancerId: { jobId, freelancerId: user.id } },
    select: { id: true, revisions: true },
  });

  // Two revisions, then the bid is final. Revising once is a correction;
  // revising ten times is negotiating against yourself.
  if (existing && existing.revisions >= MAX_BID_REVISIONS) {
    return {
      error: `You have already revised this bid ${MAX_BID_REVISIONS} times, `
        + 'which is the limit. Message the client if something has changed.',
    };
  }

  await db.$transaction(async (tx) => {
    await tx.proposal.upsert({
      where: { jobId_freelancerId: { jobId, freelancerId: user.id } },
      create: { jobId, freelancerId: user.id, ...parsed.data },
      update: {
        ...parsed.data,
        status: 'SUBMITTED',
        revisions: { increment: 1 },
      },
    });
    if (!existing) {
      await tx.job.update({
        where: { id: jobId },
        data: { proposalsCount: { increment: 1 } },
      });
    }
    await tx.notification.create({
      data: {
        userId: job.ownerId,
        kind: 'PROPOSAL',
        title: existing ? 'A bid was updated' : 'New bid',
        // Deliberately no amount: notifications are read in previews and
        // email, and the price is private to this thread.
        body: `${user.displayName} sent a proposal for “${job.title}”.`,
        href: `/jobs/${jobId}`,
      },
    });
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/**
 * Hiring: the money moves at the same moment the proposal is accepted.
 *
 * One transaction, so there is no window in which someone is hired against
 * unfunded escrow. The posting balance is debited, the job's escrow is
 * credited, and both sides get a ledger row — the hirer's outgoing hold and
 * nothing yet for the freelancer, because nothing has been released.
 */
export async function hireAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const proposalId = String(form.get('proposalId') ?? '');

  const proposal = await db.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true, bidCents: true, freelancerId: true, status: true,
      freelancer: { select: { displayName: true } },
      job: {
        select: {
          id: true, ownerId: true, title: true, status: true, budgetCents: true,
          milestones: {
            orderBy: { position: 'asc' },
            select: { id: true, amountCents: true, label: true, position: true },
          },
        },
      },
    },
  });
  if (!proposal) return { error: 'That bid no longer exists.' };
  if (proposal.job.ownerId !== user.id) {
    return { error: 'Only the person who posted the job can hire on it.' };
  }
  if (proposal.job.status !== 'OPEN') {
    return { error: 'Someone is already hired on this job.' };
  }

  const milestones = proposal.job.milestones;
  if (milestones.length === 0) {
    return { error: 'This job has no milestones, so there is nothing to fund.' };
  }

  // The agreed price is the bid, not the advertised budget. Rescale the
  // milestones proportionally so they still describe the same split of the
  // same work — with the rounding remainder on the last one, so the parts add
  // back up to the agreed total exactly.
  const scaled = rescale(milestones, proposal.bidCents);
  const first = scaled[0];

  const account = await gateFor(user.id);
  if (account.postingBalanceCents < first.amountCents) {
    const short = (first.amountCents - account.postingBalanceCents) / 100;
    return {
      error: `Hiring funds the first milestone, ${money(first.amountCents)}, from your `
        + `posting balance — you are $${short.toFixed(2)} short. Top up on the Wallet page.`,
    };
  }

  await db.$transaction(async (tx) => {
    for (const m of scaled) {
      await tx.milestone.update({
        where: { id: m.id },
        data: { amountCents: m.amountCents },
      });
    }
    await tx.milestone.update({
      where: { id: first.id },
      data: { funded: true, fundedAt: new Date() },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { postingBalanceCents: { decrement: first.amountCents } },
    });
    await tx.job.update({
      where: { id: proposal.job.id },
      data: {
        status: 'FILLED',
        hiredProposalId: proposal.id,
        escrowHeldCents: { increment: first.amountCents },
      },
    });
    await tx.proposal.update({
      where: { id: proposal.id },
      data: { status: 'ACCEPTED' },
    });
    await tx.proposal.updateMany({
      where: { jobId: proposal.job.id, id: { not: proposal.id }, status: 'SUBMITTED' },
      data: { status: 'DECLINED' },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: user.id,
        kind: 'ESCROW_HOLD',
        amountCents: -first.amountCents,
        label: `Escrow funded — ${first.label}`,
        jobId: proposal.job.id,
      },
    });
    await tx.notification.create({
      data: {
        userId: proposal.freelancerId,
        kind: 'HIRED',
        title: 'You were hired',
        body: `Your bid on “${proposal.job.title}” was accepted. `
          + `${money(first.amountCents)} is in escrow for “${first.label}” — you can start.`,
        href: `/jobs/${proposal.job.id}`,
      },
    });

    // A thread so the two can actually talk. Created here rather than on first
    // message, so neither side has to find the other again.
    const thread = await tx.thread.create({
      data: { jobId: proposal.job.id },
      select: { id: true },
    });
    await tx.threadMember.createMany({
      data: [
        { threadId: thread.id, userId: user.id },
        { threadId: thread.id, userId: proposal.freelancerId },
      ],
    });
  });

  revalidatePath(`/jobs/${proposal.job.id}`);
  revalidatePath('/dashboard');
  return { ok: true };
}


/**
 * Rescales milestone amounts to a new total, preserving their proportions.
 *
 * Integer cents throughout, with the remainder landing on the last milestone
 * so the parts always sum to the whole. Distributing rounding "fairly" would
 * be worse: it is more code, and it can still leave the total a cent off.
 */
function rescale<T extends { id: string; amountCents: number; label: string }>(
  milestones: readonly T[],
  totalCents: number,
): { id: string; amountCents: number; label: string }[] {
  const current = milestones.reduce((t, m) => t + m.amountCents, 0);
  if (current === totalCents || current === 0) {
    return milestones.map((m) => ({ id: m.id, amountCents: m.amountCents, label: m.label }));
  }

  let assigned = 0;
  return milestones.map((m, i) => {
    const last = i === milestones.length - 1;
    const amountCents = last
      ? totalCents - assigned
      : Math.round((m.amountCents / current) * totalCents);
    assigned += amountCents;
    return { id: m.id, amountCents, label: m.label };
  });
}
