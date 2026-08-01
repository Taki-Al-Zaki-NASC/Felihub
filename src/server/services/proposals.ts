import type { ProposalStatus } from '@prisma/client';
import { db } from '@/server/db';

/**
 * The only module that reads the Proposal table.
 *
 * Everything about a bid except the applicant's identity is commercially
 * sensitive: the amount, the cover letter, the delivery estimate and any
 * attachment. Competitors reading them can undercut the best bid to the cent
 * and reuse its pitch, which is a market that punishes effort.
 *
 * Two rules:
 *
 *   - the job's owner may read every field of every proposal on *their* job;
 *   - a freelancer may read every field of *their own* proposal, and only the
 *     public shape of anyone else's.
 *
 * The enforcement is structural rather than remembered. `PUBLIC_SELECT` and
 * `PRIVATE_SELECT` are separate Prisma selects, and the sensitive columns are
 * never *fetched* for a viewer who may not see them — not fetched and then
 * deleted. A leak would require editing the select, and there is no object in
 * memory holding a secret that a stray `JSON.stringify` could serialise.
 *
 * The two return types have different shapes, so a component that tries to
 * render `bidCents` on a public row does not compile.
 *
 * Note on RLS: Postgres row-level security cannot express this here. Prisma
 * connects as one pooled application role, so `auth.uid()` is null and every
 * request looks identical to the database. Carrying the viewer in a session
 * variable would mean `SET LOCAL` inside a transaction on every query, which
 * transaction-mode pooling makes unsafe. If the browser ever talks to Supabase
 * directly, add RLS *as well* — it would be a second layer, not a replacement
 * for this one.
 */

/** What anyone signed in may see about somebody else's bid. */
const PUBLIC_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  freelancer: {
    select: {
      username: true,
      displayName: true,
      profile: {
        select: { headline: true, ratingAvg: true, ratingCount: true },
      },
    },
  },
} as const;

/** Adds the commercially sensitive fields. Used for the owner's view of any
 *  bid on their job, and a freelancer's view of their own. */
const PRIVATE_SELECT = {
  ...PUBLIC_SELECT,
  bidCents: true,
  note: true,
  timelineDays: true,
  attachmentUrl: true,
  revisions: true,
} as const;

/** The owner additionally sees the challenge summary. Never the full answer —
 *  that stays in ChallengeAnswer, which no client-facing query reads. */
const OWNER_SELECT = {
  ...PRIVATE_SELECT,
  score: true,
  answerPreview: true,
} as const;

export interface PublicProposal {
  id: string;
  status: ProposalStatus;
  createdAt: Date;
  freelancer: {
    username: string;
    displayName: string;
    profile: {
      headline: string | null;
      ratingAvg: number | null;
      ratingCount: number;
    } | null;
  };
  /** Discriminant. `false` means the sensitive fields are absent, not empty. */
  visible: false;
}

export interface PrivateProposal extends Omit<PublicProposal, 'visible'> {
  visible: true;
  bidCents: number;
  note: string;
  timelineDays: number | null;
  attachmentUrl: string | null;
  revisions: number;
  /** Owner-only, and only when a challenge was attempted. */
  score?: number | null;
  answerPreview?: string | null;
}

export type VisibleProposal = PublicProposal | PrivateProposal;

export interface ProposalsView {
  /** Aggregate, safe for everyone: how many people applied. */
  total: number;
  /** Ordered for display. Sensitive fields present only where permitted. */
  proposals: VisibleProposal[];
  /** The viewer's own bid, if they made one. Always fully visible to them. */
  own: PrivateProposal | null;
  /** Bid range — the owner's alone. A range leaks what people are charging,
   *  which is most of what a competitor wants from the amount. */
  range: { lowCents: number; highCents: number } | null;
}

/**
 * Every proposal on a job, shaped for one viewer.
 *
 * `viewerId` is the signed-in account, or null for a logged-out visitor, who
 * gets the aggregate count and the public rows and nothing else.
 */
export async function proposalsForViewer(
  jobId: string,
  viewerId: string | null,
): Promise<ProposalsView> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { ownerId: true },
  });
  if (!job) return { total: 0, proposals: [], own: null, range: null };

  const isOwner = viewerId !== null && job.ownerId === viewerId;

  // The owner's query is the only one that selects the sensitive columns for
  // rows the viewer did not write.
  if (isOwner) {
    const rows = await db.proposal.findMany({
      where: { jobId },
      orderBy: [{ status: 'asc' }, { bidCents: 'asc' }],
      select: OWNER_SELECT,
    });
    const amounts = rows.map((r) => r.bidCents);
    return {
      total: rows.length,
      proposals: rows.map((r) => ({ ...r, visible: true as const })),
      own: null,
      range: amounts.length
        ? { lowCents: Math.min(...amounts), highCents: Math.max(...amounts) }
        : null,
    };
  }

  // Everyone else: public rows for all bids, plus their own in full. Two
  // queries rather than one filtered in memory — the private columns are
  // fetched only for the row the viewer wrote.
  const [publicRows, ownRow] = await Promise.all([
    db.proposal.findMany({
      where: { jobId },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      select: PUBLIC_SELECT,
    }),
    viewerId
      ? db.proposal.findUnique({
        where: { jobId_freelancerId: { jobId, freelancerId: viewerId } },
        select: PRIVATE_SELECT,
      })
      : null,
  ]);

  const own: PrivateProposal | null = ownRow
    ? { ...ownRow, visible: true as const }
    : null;

  return {
    total: publicRows.length,
    proposals: publicRows.map((r) =>
      own && r.id === own.id ? own : { ...r, visible: false as const }),
    own,
    range: null,
  };
}

/**
 * One proposal, for a viewer entitled to all of it.
 *
 * Returns null rather than throwing when the viewer is neither the bidder nor
 * the job's owner: a proposal you may not read should be indistinguishable
 * from one that does not exist, or the 403 itself tells you it exists.
 */
export async function privilegedProposal(
  proposalId: string,
  viewerId: string,
): Promise<PrivateProposal | null> {
  const row = await db.proposal.findFirst({
    where: {
      id: proposalId,
      OR: [
        { freelancerId: viewerId },
        { job: { ownerId: viewerId } },
      ],
    },
    select: OWNER_SELECT,
  });
  return row ? { ...row, visible: true as const } : null;
}

/**
 * The count alone, for job lists and cards.
 *
 * `Job.proposalsCount` is a denormalised counter, so listing pages never join
 * the Proposal table at all — there is nothing on those code paths to leak.
 */
export async function proposalCount(jobId: string): Promise<number> {
  return db.proposal.count({ where: { jobId } });
}
