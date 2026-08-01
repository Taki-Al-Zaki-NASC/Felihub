'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { appEnabled } from '@/server/services/apps';
import { tokenHash } from '@/server/tracker-token';
import type { FormResult } from '@/server/actions/profile';

/**
 * Pairing a desktop device.
 *
 * The desktop client authenticates as a *device*, never as the account. A
 * credential that sits on a laptop for months has to be revocable on its own,
 * and it must not be the thing that also lets you move money — so the token
 * below can do exactly one thing: post time for the account that made it.
 *
 * Stored as a SHA-256 hash and shown once. A token we can read back is a
 * token an attacker who reaches the database can read back.
 */

export async function pairDeviceAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  if (!(await appEnabled(user.id, 'TIME_TRACKER'))) {
    return { error: 'The time tracker is switched off. Turn it on in Settings → Apps.' };
  }

  const name = String(form.get('name') ?? '').trim() || 'My computer';
  const platform = String(form.get('platform') ?? 'windows');
  if (!['windows', 'macos', 'linux'].includes(platform)) {
    return { error: 'Pick a platform.' };
  }
  if (name.length > 60) return { error: 'That name is too long.' };

  const active = await db.trackerDevice.count({
    where: { userId: user.id, revokedAt: null },
  });
  if (active >= 5) {
    return {
      error: 'Five paired devices is the limit. Revoke one you no longer use — '
        + 'a list of forgotten laptops is a list of live credentials.',
    };
  }

  const token = `flk_${randomBytes(24).toString('base64url')}`;
  await db.trackerDevice.create({
    data: { userId: user.id, name, platform, tokenHash: tokenHash(token) },
  });

  revalidatePath('/tracker');
  // Shown once. There is no way to read it back, by design.
  return { ok: true, message: token };
}

export async function revokeDeviceAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const id = String(form.get('deviceId') ?? '');

  const device = await db.trackerDevice.findFirst({
    where: { id, userId: user.id }, select: { id: true },
  });
  if (!device) return { ok: true };

  // Kept, not deleted: the time it reported is still real, and the row is what
  // ties those hours to a machine.
  await db.trackerDevice.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  revalidatePath('/tracker');
  return { ok: true };
}
