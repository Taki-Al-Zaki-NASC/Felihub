'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { provenanceFrom } from '@/lib/authorship';
import { provenanceField } from '@/lib/authorship/field';
import { record } from '@/server/services/authorship';
import { requireUser } from '@/server/auth';
import { parseMoney } from '@/lib/money';
import { experienceSchema } from '@/lib/experience';
import { parseTags, tagsSchema } from '@/lib/tags';
import { CATEGORIES } from '@/lib/categories';

export interface FormResult {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Tell us your name.').max(80),
  headline: z.string().trim().min(4, 'One line on what you do.').max(120),
  bio: z.string().trim().min(40, 'Write at least a couple of sentences — this is what a client reads first.').max(4000),
  location: z.string().trim().min(2, 'Where are you based?').max(120),
  category: z.enum(CATEGORIES, { message: 'Pick the category you work in.' }),
  skills: tagsSchema,
  hourlyRateCents: z.number().int().positive().nullable(),
  portfolioUrl: z.string().trim().url('That is not a full URL.').max(300)
    .or(z.literal('')).transform((v) => v || null),
});

function flatten(error: z.ZodError): FormResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] ??= issue.message;
  }
  return { fieldErrors };
}

/**
 * Creates or updates the profile.
 *
 * Note what is *not* written here: `verified`. That column mirrors the derived
 * verification state and is written only by the payment webhook path. An
 * account editing its own profile can never set it, which is the schema-level
 * version of the v1 bug where the client decided it was verified.
 */
export async function saveProfileAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const isFreelancer = user.role === 'FREELANCER';

  const rate = String(form.get('hourlyRate') ?? '').trim();
  const parsed = profileSchema.safeParse({
    displayName: form.get('displayName'),
    headline: form.get('headline'),
    bio: form.get('bio'),
    location: form.get('location'),
    category: form.get('category'),
    skills: parseTags(form.get('skills')),
    hourlyRateCents: isFreelancer && rate ? parseMoney(rate) : null,
    portfolioUrl: form.get('portfolioUrl') ?? '',
  });
  if (!parsed.success) return flatten(parsed.error);

  const d = parsed.data;
  if (isFreelancer && d.skills.length === 0) {
    return { fieldErrors: { skills: 'List at least one skill — this is how clients find you.' } };
  }
  // A freelancer without a photo cannot bid (see meetsMandatoryRequirements),
  // so refuse it here rather than letting them finish onboarding and discover
  // the wall at the moment they try to bid on something.
  //
  // Read from the database rather than the session: the session deliberately
  // no longer carries the image, because doing so put ~30 KB in the HTML of
  // every page in the product.
  if (isFreelancer) {
    const photo = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { image: true },
    });
    if (!photo.image) {
      return { error: 'Add a profile photo above before saving — bidding needs one, and clients skip faceless profiles.' };
    }
  }

  const wasOnboarded = user.onboarded;

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { displayName: d.displayName },
    }),
    db.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline: d.headline,
        bio: d.bio,
        location: d.location,
        category: d.category,
        skills: d.skills,
        hourlyRateCents: d.hourlyRateCents,
        portfolioUrl: d.portfolioUrl,
      },
      update: {
        headline: d.headline,
        bio: d.bio,
        location: d.location,
        category: d.category,
        skills: d.skills,
        hourlyRateCents: d.hourlyRateCents,
        portfolioUrl: d.portfolioUrl,
      },
    }),
  ]);

  // Best-effort, and after the write: how the bio arrived is context next to
  // it, and must never be the reason saving a profile fails.
  await record('PROFILE_BIO', user.id, d.bio, provenanceFrom(form.get(provenanceField('bio'))));

  revalidatePath('/', 'layout');
  // First time through, onboarding hands straight to verification — the two
  // gates are one flow, and stopping between them is how v1 left accounts
  // half-created.
  if (!wasOnboarded) redirect('/verify');
  return { ok: true };
}

/**
 * Work history.
 *
 * A separate action from the rest of the profile because it is a separate
 * form: adding a role should not risk what is typed in the bio, and a
 * validation failure in one should not reject the other.
 */
export async function saveExperienceAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('experience') ?? '[]'));
  } catch {
    return { error: 'That could not be read. Reload the page and try again.' };
  }

  const parsed = experienceSchema.safeParse(raw);
  if (!parsed.success) {
    // Key errors by row index so the editor can put each one under its own
    // card rather than showing one message for the whole list.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const row = String(issue.path[0] ?? 'form');
      fieldErrors[row] ??= issue.message;
    }
    return { fieldErrors };
  }

  await db.profile.update({
    where: { userId: user.id },
    data: { experience: parsed.data },
  });

  revalidatePath('/settings');
  revalidatePath(`/profile/${user.username}`);
  return { ok: true };
}
