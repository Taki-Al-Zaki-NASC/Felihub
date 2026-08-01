import { z } from 'zod';

/**
 * The limits on a skill tag, in one place.
 *
 * The chip input enforces these so you find out while typing, and the Server
 * Actions enforce them again because a form is not a security boundary. Both
 * import from here, so they cannot drift apart — which is the bug class that
 * cost us a whole afternoon in v1.
 */
export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 30;
export const MIN_TAG_LENGTH = 2;

export const tagSchema = z.string()
  .trim()
  .min(MIN_TAG_LENGTH, `Each one needs at least ${MIN_TAG_LENGTH} characters.`)
  .max(MAX_TAG_LENGTH, `Keep each one under ${MAX_TAG_LENGTH} characters — these are tags, not sentences.`);

export const tagsSchema = z.array(tagSchema)
  .max(MAX_TAGS, `That is more than ${MAX_TAGS}. Pick the ones you actually want to be found for.`);

/**
 * Turns the submitted comma-joined string into clean tags.
 *
 * Trims, drops empties, removes case-insensitive duplicates, and truncates
 * anything over the limit rather than rejecting the whole form — a stray long
 * tag should cost that tag, not everything else the person typed.
 */
export function parseTags(raw: FormDataEntryValue | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of String(raw ?? '').split(',')) {
    const value = part.trim().slice(0, MAX_TAG_LENGTH);
    if (value.length < MIN_TAG_LENGTH) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_TAGS) break;
  }

  return out;
}
