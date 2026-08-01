'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { money, parseMoney } from '@/lib/money';
import { CATEGORIES } from '@/lib/categories';
import { provenanceFrom } from '@/lib/authorship';
import { provenanceField } from '@/lib/authorship/field';
import { record } from '@/server/services/authorship';
import {
  MAX_DAYS, MAX_GOAL_CENTS, MIN_DAYS, MIN_GOAL_CENTS, MIN_PLEDGE_CENTS, STAGES,
  settleRaise,
} from '@/server/services/raises';
import type { FormResult } from '@/server/actions/profile';

/**
 * Publishing a raise, and backing one.
 *
 * Read `src/server/services/raises.ts` first: it explains why a pledge buys no
 * equity, and why the money is all-or-nothing.
 */

const raiseSchema = z.object({
  title: z.string().trim().min(8, 'Give it a title someone can search for.').max(120),
  summary: z.string().trim().min(200,
    'Two hundred characters at least. Somebody is being asked for money on the '
    + 'strength of this.').max(8000),
  category: z.enum(CATEGORIES),
  stage: z.enum(STAGES),
  traction: z.string().trim().max(4000).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url('That is not a URL.').max(300)
    .optional().or(z.literal('')),
  goalCents: z.number().int()
    .min(MIN_GOAL_CENTS, `The smallest goal is ${money(MIN_GOAL_CENTS)}.`)
    .max(MAX_GOAL_CENTS,
      `The largest goal here is ${money(MAX_GOAL_CENTS)}. Above that you want a `
      + 'regulated equity platform, not this one.'),
  days: z.number().int()
    .min(MIN_DAYS, `A raise runs for at least ${MIN_DAYS} days.`)
    .max(MAX_DAYS, `A raise runs for at most ${MAX_DAYS} days.`),
});

/** `label|amount` per line, the same shape the job form uses for milestones. */
function parseUseOfFunds(raw: FormDataEntryValue | null) {
  return String(raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, amount] = line.split('|');
      return {
        label: (label ?? '').trim(),
        amountCents: parseMoney((amount ?? '').trim()) ?? 0,
      };
    })
    .filter((l) => l.label.length > 0);
}

export async function publishRaiseAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  if (!user.isVerified) {
    return {
      error: 'Finish verification before asking anyone for money. That is the '
        + 'whole reason a backer here can trust who they are backing.',
    };
  }

  const parsed = raiseSchema.safeParse({
    title: form.get('title'),
    summary: form.get('summary'),
    category: form.get('category'),
    stage: form.get('stage'),
    traction: form.get('traction') ?? '',
    websiteUrl: form.get('websiteUrl') ?? '',
    goalCents: parseMoney(String(form.get('goal') ?? '')) ?? 0,
    days: Number(form.get('days') ?? 0),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }
  const d = parsed.data;

  const useOfFunds = parseUseOfFunds(form.get('useOfFunds'));
  if (useOfFunds.length === 0) {
    return {
      fieldErrors: {
        useOfFunds: 'Say what the money is for. One line each, as "What it '
          + 'buys | $2,000".',
      },
    };
  }
  const total = useOfFunds.reduce((t, l) => t + l.amountCents, 0);
  if (total !== d.goalCents) {
    return {
      fieldErrors: {
        useOfFunds: `These add up to ${money(total)}, and the goal is `
          + `${money(d.goalCents)}. A backer is entitled to see the whole `
          + 'amount accounted for.',
      },
    };
  }

  // One live raise at a time. Two open raises from one founder splits their
  // own backers and makes both look like they are failing.
  const running = await db.raise.count({
    where: { founderId: user.id, status: 'OPEN' },
  });
  if (running > 0) {
    return {
      error: 'You already have a raise running. Let it finish before starting '
        + 'another one.',
    };
  }

  const created = await db.raise.create({
    data: {
      founderId: user.id,
      title: d.title,
      summary: d.summary,
      category: d.category,
      stage: d.stage,
      traction: d.traction || null,
      websiteUrl: d.websiteUrl || null,
      useOfFunds,
      goalCents: d.goalCents,
      minPledgeCents: MIN_PLEDGE_CENTS,
      deadline: new Date(Date.now() + d.days * 86_400_000),
      status: 'OPEN',
    },
    select: { id: true },
  });

  await record('RAISE_SUMMARY', created.id, d.summary,
    provenanceFrom(form.get(provenanceField('summary'))));

  revalidatePath('/startups');
  revalidatePath('/dashboard');
  redirect(`/startups/${created.id}`);
}

const pledgeSchema = z.object({
  amountCents: z.number().int()
    .min(MIN_PLEDGE_CENTS, `The smallest pledge is ${money(MIN_PLEDGE_CENTS)}.`)
    .max(MAX_GOAL_CENTS, 'That is more than any raise here can accept.'),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
});

/**
 * Backing a raise.
 *
 * The money leaves the backer's wallet now and sits in escrow. It reaches the
 * founder only if the goal is met; otherwise `settleRaise` returns it in full.
 * Taking it up front is the point — a pledge nobody has funded is a promise,
 * and a progress bar made of promises tells a backer nothing.
 */
export async function pledgeAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const raiseId = String(form.get('raiseId') ?? '');

  if (!user.isVerified) {
    return { error: 'Finish verification before backing anything.' };
  }

  const parsed = pledgeSchema.safeParse({
    amountCents: parseMoney(String(form.get('amount') ?? '')) ?? 0,
    note: form.get('note') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { amountCents, note } = parsed.data;
  const anonymous = form.get('anonymous') === 'on';

  const raise = await db.raise.findUnique({
    where: { id: raiseId },
    select: {
      id: true, title: true, founderId: true, status: true, deadline: true,
      minPledgeCents: true,
    },
  });
  if (!raise) return { error: 'That raise no longer exists.' };
  if (raise.founderId === user.id) {
    return { error: 'You cannot back your own raise.' };
  }
  if (raise.status !== 'OPEN') {
    return { error: 'This raise has closed.' };
  }
  if (raise.deadline.getTime() <= Date.now()) {
    // Settle it rather than leaving a stale OPEN row behind a rejection.
    await settleRaise(raise.id).catch(() => {});
    return { error: 'This raise closed while you were reading it.' };
  }
  if (amountCents < raise.minPledgeCents) {
    return { error: `The smallest pledge here is ${money(raise.minPledgeCents)}.` };
  }

  const existing = await db.pledge.findUnique({
    where: { raiseId_backerId: { raiseId, backerId: user.id } },
    select: { id: true, amountCents: true, status: true },
  });
  if (existing && existing.status !== 'HELD') {
    return { error: 'Your earlier pledge on this raise has already settled.' };
  }

  // Raising an existing pledge costs the difference; the original is already
  // held. Lowering it is not offered — it would mean paying a backer out of
  // escrow that other people are reading as committed.
  const owed = existing ? amountCents - existing.amountCents : amountCents;
  if (owed < 0) {
    return {
      error: 'You can increase a pledge but not reduce it — other backers are '
        + 'reading the total as committed. Message the founder if you need to '
        + 'withdraw.',
    };
  }

  /*
   * Where the money comes from.
   *
   * Two balances exist: the wallet, which is what a freelancer earns into, and
   * the posting balance, which is what a client tops up and spends into escrow
   * when they hire. Taking a pledge from the wallet alone looked right and was
   * a dead end — a client has no wallet balance until they have been paid for
   * something, and clients are half the people this feature is for. The same
   * shape of bug as the verified client who could not hire.
   *
   * So: wallet first, then the posting balance. Both are the account's own
   * money held on the platform, both are spent into the same escrow, and the
   * ledger records which one moved.
   */
  const balances = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { walletBalanceCents: true, postingBalanceCents: true },
  });
  const fromWallet = Math.min(balances.walletBalanceCents, owed);
  const fromPosting = owed - fromWallet;
  if (fromPosting > balances.postingBalanceCents) {
    const available = balances.walletBalanceCents + balances.postingBalanceCents;
    return {
      error: `This needs ${money(owed)} and you have ${money(available)} `
        + 'available across your wallet and posting balance. Top up on the '
        + 'Wallet page first.',
    };
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        ...(fromWallet > 0 ? { walletBalanceCents: { decrement: fromWallet } } : {}),
        ...(fromPosting > 0 ? { postingBalanceCents: { decrement: fromPosting } } : {}),
      },
    });
    await tx.pledge.upsert({
      where: { raiseId_backerId: { raiseId, backerId: user.id } },
      create: {
        raiseId, backerId: user.id, amountCents,
        fromPostingCents: fromPosting,
        note: note || null, anonymous,
      },
      update: {
        amountCents, note: note || null, anonymous,
        // Increasing a pledge can draw from a different balance than the
        // first instalment did, so this accumulates rather than replacing.
        fromPostingCents: { increment: fromPosting },
      },
    });
    await tx.raise.update({
      where: { id: raiseId },
      data: {
        raisedCents: { increment: owed },
        ...(existing ? {} : { backersCount: { increment: 1 } }),
      },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: user.id,
        kind: 'PLEDGE',
        amountCents: -owed,
        label: `Pledged to “${raise.title}” — held until the goal is met`
          + (fromPosting > 0 && fromWallet > 0
            ? ` (${money(fromWallet)} wallet, ${money(fromPosting)} posting balance)`
            : fromPosting > 0 ? ' (from your posting balance)' : ''),
      },
    });
    await tx.notification.create({
      data: {
        userId: raise.founderId,
        kind: 'PLEDGE',
        title: existing ? 'A backer increased their pledge' : 'New backer',
        body: `${anonymous ? 'Someone' : user.displayName} backed `
          + `“${raise.title}”.`,
        href: `/startups/${raiseId}`,
      },
    });
  });

  // Hitting the goal does not settle early: backers keep pledging past 100%,
  // and closing the moment it tips would cut that off. The deadline decides.
  revalidatePath(`/startups/${raiseId}`);
  revalidatePath('/startups');
  return { ok: true };
}

/**
 * Withdrawing a raise, which refunds every backer.
 *
 * Reuses `settleRaise`'s refund path by moving the deadline into the past and
 * settling, so there is exactly one piece of code that returns money — rather
 * than a second implementation that could disagree with it about a rounding.
 */
export async function cancelRaiseAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const raiseId = String(form.get('raiseId') ?? '');

  const raise = await db.raise.findUnique({
    where: { id: raiseId },
    select: { id: true, founderId: true, status: true },
  });
  if (!raise) return { error: 'That raise no longer exists.' };
  if (raise.founderId !== user.id) {
    return { error: 'Only the founder can withdraw a raise.' };
  }
  if (raise.status !== 'OPEN') return { ok: true };

  await db.raise.update({
    where: { id: raiseId },
    data: { deadline: new Date(Date.now() - 1000) },
  });
  await settleRaise(raiseId);
  await db.raise.update({
    where: { id: raiseId },
    data: { status: 'CANCELLED' },
  });

  revalidatePath(`/startups/${raiseId}`);
  revalidatePath('/startups');
  return { ok: true };
}
