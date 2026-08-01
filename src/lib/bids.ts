/**
 * How many times a freelancer may revise a submitted bid.
 *
 * Bids on Felicek are public, so unlimited edits turn a proposal into a live
 * auction against whoever bid last — a race to the bottom rather than a
 * market. Two revisions covers a genuine correction and stops there.
 *
 * Lives here rather than in the Server Action because a `'use server'` module
 * may only export async functions, and the bid form needs this number to show
 * how many are left.
 */
export const MAX_BID_REVISIONS = 2;
