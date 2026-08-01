import type { Category } from '../src/lib/categories';

/**
 * Shapes for the sample marketplace.
 *
 * They live apart from the data so the four data files and the writer in
 * `seed.ts` agree on one definition. A duplicated interface is how a field
 * gets added in one file and silently ignored in another.
 */

export interface SeedClient {
  key: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  category: Category;
  /** Skills this client typically hires for — shown on their profile. */
  hires: string[];
}

export interface SeedJob {
  key: string;
  client: string;
  title: string;
  category: Category;
  skills: string[];
  budgetCents: number;
  durationDays: number;
  description: string;
  milestones: { label: string; amountCents: number }[];

  /**
   * A finished contract, which is what gives the marketplace a past.
   *
   * `hired` names the freelancer who won it; the job closes, their proposal is
   * marked COMPLETED, every milestone is funded and released, and `review` is
   * written by the client. A board with only open work looks like it opened
   * yesterday, and a directory of freelancers with no ratings looks the same.
   */
  hired?: string;
  review?: { rating: number; comment: string };

  /**
   * The key of an earlier contract this one came after.
   *
   * Two reviews on the same profile that say "second engagement" have to be
   * dated in that order, and the dates are otherwise derived from a hash of
   * the key — which is arbitrary, so the story held by luck and would have
   * silently inverted the next time a key changed. Naming the predecessor
   * makes the ordering a fact rather than a coincidence.
   */
  follows?: string;
}

export interface SeedFreelancer {
  key: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  category: Category;
  skills: string[];
  languages: string[];
  hourlyRateCents: number;
  portfolioUrl?: string;
  experience: { title: string; organisation: string; period: string; summary: string }[];
}

/**
 * A live bid on an open job.
 *
 * These are what make a job card say "4 proposals" instead of "0". The amount
 * and the letter are never shown to anyone but the bidder and the job's owner
 * — see `src/server/services/proposals.ts` — so seeding them is safe, and it
 * exercises the privacy boundary with real rows rather than an empty table.
 */
export interface SeedBid {
  job: string;
  freelancer: string;
  bidCents: number;
  timelineDays: number;
  note: string;
}
