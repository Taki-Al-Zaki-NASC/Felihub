import type { User } from '@prisma/client';

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
