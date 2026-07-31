import type { Role, User } from '@prisma/client';

/**
 * The single definition of "this account may act".
 *
 * All three conditions, together. v1 kept a client-side copy that omitted
 * `idSubmitted`, so an account that paid its deposit before submitting
 * documents read as verified in the app and unverified in the database: the
 * UI unlocked posting and bidding, took a whole listing or proposal, and the
 * write was refused at the end.
 *
 * Nothing in `src/app` or `src/components` may re-implement this. Server
 * Actions call it before every gated mutation, and the layout passes the
 * result down, so the interface can never promise what the database will
 * refuse.
 */
export function isVerified(
  user: Pick<User, 'idSubmitted' | 'depositPaid' | 'kycStage'>,
): boolean {
  return user.idSubmitted && user.depositPaid && user.kycStage === 'VERIFIED';
}

/** Freelancers additionally need a face — a faceless "verified" profile
 *  defeats the point of the badge. */
export function meetsMandatoryRequirements(
  user: Pick<User, 'idSubmitted' | 'depositPaid' | 'kycStage' | 'role' | 'image'>,
): boolean {
  if (!isVerified(user)) return false;
  return user.role !== 'FREELANCER' || Boolean(user.image);
}

export const canPostJob = meetsMandatoryRequirements;
export const canBid = meetsMandatoryRequirements;

/** What each role puts down, and what it is for. Cents, always. */
export const DEPOSIT = {
  TRUST_BOND: {
    cents: 2000,
    kind: 'TRUST_BOND' as const,
    label: 'Trust bond',
    explain: 'Refunded in full after your first completed job. It exists so '
      + 'bidding can stay free without the board filling with noise.',
  },
  POSTING_BALANCE: {
    cents: 5000,
    kind: 'POSTING_BALANCE' as const,
    label: 'Posting balance',
    explain: 'Not a fee — it is your money, held on the platform and spent '
      + 'into escrow on real work. Whatever you do not spend, you withdraw.',
  },
} as const;

export function depositFor(role: Role) {
  return role === 'FREELANCER' ? DEPOSIT.TRUST_BOND : DEPOSIT.POSTING_BALANCE;
}

/**
 * Beta: verification costs nothing.
 *
 * The gate itself still runs — documents are still submitted and checked, and
 * `depositPaid` is still what unlocks the account. Only the amount is zero, so
 * ending the beta changes one constant rather than re-enabling a code path
 * that has not executed in months.
 */
export const FREE_VERIFICATION = true;
