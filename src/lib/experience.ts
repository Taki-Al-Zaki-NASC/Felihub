import { z } from 'zod';

/**
 * Work history, stored as JSON on `Profile.experience`.
 *
 * JSON rather than a table because it is only ever read as a whole list on one
 * profile, never queried across accounts — a join table would buy nothing and
 * cost a migration. The Zod schema is what keeps the column honest, since
 * Postgres will accept any shape.
 */
export const experienceEntrySchema = z.object({
  title: z.string().trim().min(2, 'What was the role called?').max(120),
  organisation: z.string().trim().min(1, 'Who was it for?').max(120),
  period: z.string().trim().max(60).optional().or(z.literal('')),
  summary: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const experienceSchema = z.array(experienceEntrySchema).max(20);

export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;

/** Reads the column defensively — it is `Json`, so it holds whatever was last
 *  written, including whatever an older version of this code wrote. */
export function parseExperience(raw: unknown): ExperienceEntry[] {
  const result = experienceSchema.safeParse(raw);
  if (result.success) return result.data;
  if (!Array.isArray(raw)) return [];
  // Salvage the entries that are still valid rather than dropping the lot.
  return raw.flatMap((item) => {
    const one = experienceEntrySchema.safeParse(item);
    return one.success ? [one.data] : [];
  });
}
