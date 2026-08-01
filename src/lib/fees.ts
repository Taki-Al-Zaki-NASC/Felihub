/**
 * Felicek's fee, in basis points. 100 = 1%.
 *
 * Basis points with integer arithmetic so the fee on $333.33 is exactly $3.33
 * and not $3.3333000000000004. A float here is somebody's wages rounding the
 * wrong way, every time, forever.
 *
 * Lives outside the Server Action because a `'use server'` module may only
 * export async functions, and the pricing page needs to quote the same number
 * the ledger charges.
 */
export const PLATFORM_FEE_BPS = 100;

export const platformFee = (cents: number) =>
  Math.round((cents * PLATFORM_FEE_BPS) / 10_000);
