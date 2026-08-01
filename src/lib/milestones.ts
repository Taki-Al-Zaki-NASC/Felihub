import { z } from 'zod';
import { parseMoney } from '@/lib/money';

/**
 * Milestones are mandatory on every job.
 *
 * A single lump sum is where marketplace disputes come from: the freelancer
 * has done "most" of it, the client thinks it is half, and there is no agreed
 * point at which anything is owed. Splitting the work up front means every
 * argument is about one deliverable worth a known amount, and the freelancer is
 * never carrying the whole job unpaid.
 *
 * They also make escrow tractable — the client funds the first milestone
 * rather than the entire budget, which is what makes hiring affordable.
 */
export const MAX_MILESTONES = 10;

export const milestoneSchema = z.object({
  label: z.string().trim()
    .min(3, 'Say what this milestone delivers.')
    .max(120),
  amountCents: z.number().int()
    .positive('Every milestone needs an amount.')
    .max(100_000_000),
});

export const milestonesSchema = z.array(milestoneSchema)
  .min(1, 'Add at least one milestone — every job on Felicek is milestone-based.')
  .max(MAX_MILESTONES, `That is more than ${MAX_MILESTONES} milestones.`);

export type MilestoneInput = z.infer<typeof milestoneSchema>;

/** Reads the JSON the form submits, tolerating a half-filled row. */
export function parseMilestones(raw: FormDataEntryValue | null | undefined): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? '[]'));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const r = row as Record<string, unknown>;
    const label = String(r.label ?? '').trim();
    const amountCents = typeof r.amountCents === 'number'
      ? r.amountCents
      : parseMoney(String(r.amount ?? ''));
    // A completely blank trailing row is someone who clicked "add" and changed
    // their mind, not an error worth blocking the form for.
    if (!label && !amountCents) return [];
    return [{ label, amountCents: amountCents ?? 0 }];
  });
}

export const sumCents = (milestones: readonly { amountCents: number }[]) =>
  milestones.reduce((total, m) => total + m.amountCents, 0);
