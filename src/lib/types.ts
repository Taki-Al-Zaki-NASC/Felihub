/**
 * Mirrors of the Firestore documents the Android app writes.
 *
 * These are the same shapes as app/lib/data/models/*.dart. They are duplicated
 * because the stacks differ, not because the schema does — if one side changes
 * a field name, the other silently reads undefined, so any change here has a
 * matching change in Dart.
 */
export type UserRoleKey = 'freelancer' | 'client' | 'agency' | 'startup';
export type KycStage = 'none' | 'idSubmitted' | 'verified';

export interface KycState {
  idSubmitted: boolean;
  depositPaid: boolean;
  stage: KycStage;
  idDocumentType?: string | null;
  idReference?: string | null;
  paymentRef?: string | null;
  depositAmountCents?: number;
  /** Freelancer trust bond, unlocked by the first completed engagement. */
  depositReleased?: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRoleKey;
  onboarded: boolean;
  profileComplete: boolean;
  profilePhotoBase64?: string | null;
  kyc: KycState;

  // Money. Written by escrow.ts, in cents, and absent until the first
  // movement — so every read defaults rather than assuming zero is stored.
  /** Freelancer: released earnings not yet withdrawn. */
  walletBalanceCents?: number;
  /** Freelancer: lifetime gross, before fees. */
  totalEarnedCents?: number;
  /** Client: funds available to spend into escrow when hiring. */
  postingBalanceCents?: number;
  jobsDone?: number;
}

/** One line of the money ledger — users/{uid}/transactions/{id}. */
export interface WalletTransaction {
  id: string;
  label: string;
  /** Negative for fees and withdrawals, positive for credits. */
  amountCents: number;
  kind?: string;
  jobId?: string | null;
  createdAt?: { seconds?: number };
}

/** Deposit policy, matching UserRole in user_role.dart. */
export const DEPOSIT_CENTS: Record<UserRoleKey, number> = {
  freelancer: 2000,
  client: 5000,
  agency: 5000,
  startup: 5000,
};

/** Only individual freelancers must show a face. */
export const REQUIRES_PHOTO: Record<UserRoleKey, boolean> = {
  freelancer: true,
  client: false,
  agency: false,
  startup: false,
};

/**
 * Exactly what `isAccountVerified()` in firestore.rules requires.
 *
 * `idSubmitted` is part of it, and leaving it out was not a cosmetic
 * difference: the rule checks all three, so an account that had cleared its
 * deposit but never submitted identity was "verified" to the client and
 * refused by the server. The app offered the post-a-job form, took a title, a
 * description and milestones, and only then failed the write.
 *
 * If this predicate and the rule ever disagree again, the UI will promise
 * something the database will not honour — so they are kept in the same shape
 * deliberately.
 */
export const isVerified = (u: AppUser) =>
  u.kyc.idSubmitted === true
  && u.kyc.depositPaid === true
  && u.kyc.stage === 'verified';

/**
 * The gate. Mirrors AppUser.meetsMandatoryRequirements — identity on file, the
 * deposit cleared, and a photo where the role requires one. There is no "skip
 * for now", on either surface.
 */
export const meetsMandatoryRequirements = (u: AppUser) =>
  (!REQUIRES_PHOTO[u.role] || Boolean(u.profilePhotoBase64)) && isVerified(u);
