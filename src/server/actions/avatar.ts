'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import type { FormResult } from '@/server/actions/profile';

/**
 * The profile photo.
 *
 * Stored as a data URL on `User.image` rather than in object storage: the
 * browser downscales to 256px before upload, which lands around 20–40 KB, and
 * that keeps the whole product on Vercel's free tier with no bucket to
 * provision, no signed URLs and no second thing that can be misconfigured.
 * If photos ever need to be larger, this is the one function to change.
 *
 * The cap is enforced here, not only in the browser — a client that skips the
 * downscale gets refused rather than writing a megabyte into every session
 * query.
 */
const MAX_CHARS = 200_000; // ~150 KB decoded.

const schema = z.string()
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'That is not an image.')
  .max(MAX_CHARS, 'That image is too large. Try a smaller one.');

export async function saveAvatarAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();

  const raw = form.get('image');
  if (raw === 'REMOVE') {
    await db.user.update({ where: { id: user.id }, data: { image: null } });
    revalidatePath('/', 'layout');
    return { ok: true };
  }

  const parsed = schema.safeParse(String(raw ?? ''));
  if (!parsed.success) {
    return { fieldErrors: { image: parsed.error.issues[0].message } };
  }

  await db.user.update({
    where: { id: user.id },
    data: { image: parsed.data },
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}
