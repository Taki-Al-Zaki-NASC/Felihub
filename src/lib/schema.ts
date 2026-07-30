import type { Timestamp } from 'firebase/firestore';

/**
 * Job, proposal and chat shapes, mirroring the Dart models.
 *
 * Fields are optional where the Android app writes them conditionally, so a
 * document written by an older build does not read as corrupt here.
 */

export type JobStatus = 'open' | 'filled' | 'closed';
export type ProposalStatus =
  | 'draft' | 'submitted' | 'shortlisted' | 'accepted' | 'declined' | 'withdrawn';

export interface Milestone {
  label: string;
  /** Free text as entered ("$450"), not cents — matches Milestone in job.dart. */
  amount: string;
  released?: boolean;
}

export interface Job {
  id: string;
  ownerId: string;
  ownerName: string;
  type: string;
  typeLabel: string;
  title: string;
  description?: string;
  skills?: string[];
  budget?: string;
  budgetValue?: number;
  status?: JobStatus;
  milestones?: Milestone[];
  /**
   * `proposalsCount`, not `proposalCount`. The name is load-bearing: a bidder
   * is not the job owner, so their increment is only permitted by the rule's
   * `onlyFieldsChanged(['views', 'shortlisted', 'proposalsCount'])` branch.
   * Writing the singular spelling fell outside that allow-list and denied the
   * whole submit-proposal transaction.
   */
  proposalsCount?: number;
  shortlisted?: number;
  views?: number;
  hiredProposalId?: string | null;
  hiredFreelancerId?: string | null;
  escrowHeldCents?: number;
  createdAt?: Timestamp;
  searchTerms?: string[];
}

export interface Proposal {
  id: string;
  jobId: string;
  jobTitle?: string;
  /**
   * The job owner's uid. Named `jobOwnerId` because that is the field the
   * rules read, both to authorise the create and to decide who may read the
   * proposal back. It was previously written as `ownerId`, which the rules
   * never look at — so every bid was denied.
   */
  jobOwnerId: string;
  freelancerId: string;
  freelancerName: string;
  status: ProposalStatus;
  bidAmountCents?: number;
  note?: string;
  chatId?: string | null;
  challenge?: {
    completed?: boolean;
    score?: number | null;
    preview?: string | null;
  };
  createdAt?: Timestamp;
}

export interface ChatThread {
  id: string;
  /** The uids, and the field every chat rule authorises against. */
  participantIds: string[];
  /** Denormalised {uid: displayName}, so a thread list needs no extra reads. */
  participants?: Record<string, string>;
  jobId?: string | null;
  jobTitle?: string | null;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  readUpTo?: Record<string, Timestamp>;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  imageBase64?: string | null;
  attachmentName?: string | null;
  watermarked?: boolean;
  sentAt?: Timestamp | null;
  clientSentAt?: Timestamp | null;
}

/**
 * A milestone's value in cents.
 *
 * Deliberately the same parse as EngagementRepository.milestoneCents in Dart:
 * pull a "$1,234.56" out of the free-text amount, else split the bid evenly.
 * If these two ever disagree, a client is shown one figure and charged
 * another.
 */
export function milestoneCents(m: Milestone, job: Job, proposal: Proposal): number {
  const match = /\$\s*([\d,]+(?:\.\d+)?)/.exec(m.amount ?? '');
  if (match) {
    const value = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0) return Math.round(value * 100);
  }
  const count = job.milestones?.length || 1;
  return Math.round((proposal.bidAmountCents ?? 0) / count);
}
