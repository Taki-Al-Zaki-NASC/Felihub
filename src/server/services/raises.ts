import type { PledgeStatus, RaiseStatus } from '@prisma/client';
import { db } from '@/server/db';

/**
 * Startup fundraising.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * A founder publishes what they are building, what the money is for, and a
 * deadline. Anyone verified — a client, a freelancer, another founder — can
 * pledge. If the goal is met by the deadline the money moves to the founder,
 * less the same 1% the rest of the platform charges. If it is not, every
 * pledge is refunded in full.
 *
 * **Backers receive no equity, no shares, no dividend, no revenue share and no
 * claim on the company.** That is a product decision, not an omission. Selling
 * a stake in a company to the public is a securities offering: in the US it
 * needs Reg CF and a registered funding portal, in the UK an FCA-authorised
 * platform, and Bangladesh's BSEC equity crowdfunding rules are their own
 * regime again. Running one without that authorisation is a criminal offence
 * in most of them, so nothing in this schema can represent a share, and the UI
 * says plainly what a backer is getting: early support for something, and
 * whatever the founder promises them directly.
 *
 * If Felicek ever wants to do equity properly, that starts with a licence and
 * a lawyer, not with a column called `equityPct`.
 *
 * **All-or-nothing** is the other deliberate choice. Partial funding is how a
 * backer pays for a third of a thing that then never gets built. Pledges sit
 * in escrow — the same escrow that holds job milestones — and the founder
 * cannot touch them until the goal is met.
 */

/** The platform takes the same 1% here as on job milestones. */
export { PLATFORM_FEE_BPS, platformFee } from '@/lib/fees';

export const STAGES = ['IDEA', 'PROTOTYPE', 'LAUNCHED', 'REVENUE'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  IDEA: 'Idea',
  PROTOTYPE: 'Prototype',
  LAUNCHED: 'Launched',
  REVENUE: 'Making revenue',
};

/** What the smallest and largest sensible raise are, in cents. Bounds rather
 *  than guesses: a $20 goal is noise, and anything above this needs the
 *  regulated product this one is careful not to be. */
export const MIN_GOAL_CENTS = 50_000;
export const MAX_GOAL_CENTS = 5_000_000;
export const MIN_PLEDGE_CENTS = 1_000;

/** How long a raise may run. Long enough to gather momentum, short enough that
 *  a backer's money is not held indefinitely against a goal nobody will meet. */
export const MIN_DAYS = 7;
export const MAX_DAYS = 90;

export interface UseOfFundsLine {
  label: string;
  amountCents: number;
}

/** Reads the JSON column defensively: it holds whatever was last written,
 *  including whatever an older version of this code wrote. */
export function parseUseOfFunds(raw: unknown): UseOfFundsLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const { label, amountCents } = item as Record<string, unknown>;
    if (typeof label !== 'string' || typeof amountCents !== 'number') return [];
    if (!Number.isFinite(amountCents) || amountCents < 0) return [];
    return [{ label, amountCents: Math.round(amountCents) }];
  });
}

/**
 * What a raise looks like to somebody reading it.
 *
 * Amounts pledged by named backers are public — that is the social proof a
 * raise runs on, and a backer chooses whether to be named. What is never
 * public is the note a backer wrote to the founder.
 */
export interface PublicBacker {
  id: string;
  amountCents: number;
  createdAt: Date;
  /** Null when the backer chose to stay anonymous. */
  who: { username: string; displayName: string } | null;
}

const BACKER_SELECT = {
  id: true,
  amountCents: true,
  createdAt: true,
  anonymous: true,
  backer: { select: { username: true, displayName: true } },
} as const;

/** Public backer rows. The `note` column is not in the select, so a private
 *  message to a founder is never fetched on a path that renders to a stranger. */
export async function backersFor(raiseId: string): Promise<PublicBacker[]> {
  const rows = await db.pledge.findMany({
    where: { raiseId, status: { in: ['HELD', 'RELEASED'] } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: BACKER_SELECT,
  });
  return rows.map((r) => ({
    id: r.id,
    amountCents: r.amountCents,
    createdAt: r.createdAt,
    who: r.anonymous ? null : r.backer,
  }));
}

export interface RaiseProgress {
  raisedCents: number;
  goalCents: number;
  /** 0–100, capped, for a progress bar that cannot overflow its track. */
  percent: number;
  backersCount: number;
  daysLeft: number;
  /** True once the goal is met, whether or not the deadline has passed. */
  metGoal: boolean;
  open: boolean;
}

export function progressOf(raise: {
  raisedCents: number; goalCents: number; backersCount: number;
  deadline: Date; status: RaiseStatus;
}): RaiseProgress {
  const ms = raise.deadline.getTime() - Date.now();
  return {
    raisedCents: raise.raisedCents,
    goalCents: raise.goalCents,
    percent: raise.goalCents > 0
      ? Math.min(100, Math.round((raise.raisedCents / raise.goalCents) * 100))
      : 0,
    backersCount: raise.backersCount,
    daysLeft: Math.max(0, Math.ceil(ms / 86_400_000)),
    metGoal: raise.raisedCents >= raise.goalCents,
    open: raise.status === 'OPEN' && ms > 0,
  };
}

/**
 * Settle every raise whose deadline has passed.
 *
 * Called opportunistically when the listing is read, because there is no cron
 * on Vercel's free tier and a backer's money must not sit in escrow because
 * nobody happened to run a job. Idempotent: it only ever moves rows out of
 * OPEN, and a second call finds nothing to do.
 *
 * Returns how many it settled, so a caller can log or ignore it.
 */
export async function settleDueRaises(): Promise<number> {
  const due = await db.raise.findMany({
    where: { status: 'OPEN', deadline: { lt: new Date() } },
    select: { id: true },
    take: 25,
  });
  let settled = 0;
  for (const { id } of due) {
    try {
      await settleRaise(id);
      settled += 1;
    } catch {
      // One raise failing to settle must not stop the others, and must not
      // fail the page that happened to trigger this.
    }
  }
  return settled;
}

/**
 * Decide one raise: pay the founder, or refund everybody.
 *
 * The whole thing is a single transaction. A partial settlement — some backers
 * refunded, some not, the founder paid — is the one outcome that would be
 * genuinely hard to unpick afterwards.
 */
export async function settleRaise(raiseId: string): Promise<RaiseStatus> {
  const { platformFee } = await import('@/lib/fees');

  return db.$transaction(async (tx) => {
    const raise = await tx.raise.findUniqueOrThrow({
      where: { id: raiseId },
      select: {
        id: true, title: true, founderId: true, goalCents: true,
        raisedCents: true, status: true, deadline: true,
      },
    });
    if (raise.status !== 'OPEN') return raise.status;

    const held = await tx.pledge.findMany({
      where: { raiseId, status: 'HELD' },
      select: {
        id: true, backerId: true, amountCents: true, fromPostingCents: true,
      },
    });

    const succeeded = raise.raisedCents >= raise.goalCents;
    const now = new Date();

    if (!succeeded) {
      // Every backer whole again, to the cent, and back into the balance the
      // money left from — a client's posting balance is what funds escrow when
      // they hire, so returning it to the wallet would strand it.
      for (const pledge of held) {
        const toPosting = Math.min(pledge.fromPostingCents, pledge.amountCents);
        const toWallet = pledge.amountCents - toPosting;
        await tx.user.update({
          where: { id: pledge.backerId },
          data: {
            ...(toWallet > 0 ? { walletBalanceCents: { increment: toWallet } } : {}),
            ...(toPosting > 0 ? { postingBalanceCents: { increment: toPosting } } : {}),
          },
        });
        await tx.ledgerEntry.create({
          data: {
            userId: pledge.backerId,
            kind: 'REFUND',
            amountCents: pledge.amountCents,
            label: `Refunded — “${raise.title}” did not reach its goal`,
          },
        });
        await tx.notification.create({
          data: {
            userId: pledge.backerId,
            kind: 'PLEDGE_REFUNDED',
            title: 'Your pledge was refunded',
            body: `“${raise.title}” closed below its goal, so your pledge is `
              + 'back in your wallet in full.',
            href: `/startups/${raise.id}`,
          },
        });
      }
      await tx.pledge.updateMany({
        where: { raiseId, status: 'HELD' },
        data: { status: 'REFUNDED' as PledgeStatus, settledAt: now },
      });
      await tx.raise.update({
        where: { id: raiseId },
        data: { status: 'EXPIRED', settledAt: now },
      });
      await tx.notification.create({
        data: {
          userId: raise.founderId,
          kind: 'RAISE_EXPIRED',
          title: 'Your raise closed below its goal',
          body: `“${raise.title}” did not reach its goal, so every pledge has `
            + 'been refunded. You can publish a new raise whenever you are ready.',
          href: `/startups/${raise.id}`,
        },
      });
      return 'EXPIRED';
    }

    const gross = held.reduce((t, p) => t + p.amountCents, 0);
    const fee = platformFee(gross);
    const net = gross - fee;

    await tx.user.update({
      where: { id: raise.founderId },
      data: { walletBalanceCents: { increment: net } },
    });
    await tx.ledgerEntry.createMany({
      data: [
        {
          userId: raise.founderId,
          kind: 'PLEDGE_RELEASE',
          amountCents: gross,
          label: `Raise funded — “${raise.title}”`,
        },
        {
          userId: raise.founderId,
          kind: 'PLATFORM_FEE',
          amountCents: -fee,
          label: 'Felicek fee, 1% of the amount raised',
        },
      ],
    });
    await tx.pledge.updateMany({
      where: { raiseId, status: 'HELD' },
      data: { status: 'RELEASED' as PledgeStatus, settledAt: now },
    });
    await tx.raise.update({
      where: { id: raiseId },
      data: { status: 'FUNDED', settledAt: now },
    });

    await tx.notification.create({
      data: {
        userId: raise.founderId,
        kind: 'RAISE_FUNDED',
        title: 'Your raise is funded',
        body: `“${raise.title}” met its goal. The money is in your wallet, `
          + 'less the 1% platform fee.',
        href: `/startups/${raise.id}`,
      },
    });
    for (const pledge of held) {
      await tx.notification.create({
        data: {
          userId: pledge.backerId,
          kind: 'RAISE_FUNDED',
          title: 'Something you backed got funded',
          body: `“${raise.title}” met its goal. Your pledge has gone to the founder.`,
          href: `/startups/${raise.id}`,
        },
      });
    }
    return 'FUNDED';
  }, { timeout: 20_000 });
}
