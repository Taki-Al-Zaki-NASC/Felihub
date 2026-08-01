'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { APPS, isAppKey } from '@/lib/apps';
import { offeredTo } from '@/server/services/apps';
import type { FormResult } from '@/server/actions/profile';

/**
 * Switching a tool on or off.
 *
 * Switching off keeps the row and its settings — a board is not deleted
 * because somebody turned the board tool off for a fortnight, and finding your
 * work gone on the way back is not a thing a toggle should be able to do.
 */
export async function toggleAppAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const app = String(form.get('app') ?? '');
  const on = form.get('enabled') === 'true';

  if (!isAppKey(app)) return { error: 'No such tool.' };
  if (!offeredTo(app, user.role)) {
    // Checked here as well as in the grid: the grid is a rendering decision,
    // this is the rule.
    return {
      error: `${APPS[app].title} is not offered to ${user.role.toLowerCase()} accounts.`,
    };
  }

  try {
    await db.appInstall.upsert({
      where: { userId_app: { userId: user.id, app } },
      create: { userId: user.id, app, enabled: on },
      update: { enabled: on },
    });
  } catch {
    return {
      error: 'That could not be saved. If this deployment was upgraded '
        + 'recently, its database may still need prisma/upgrade.sql.',
    };
  }

  // The sidebar is rendered by the layout, so the whole shell has to re-render
  // for a newly enabled tool to appear in it.
  revalidatePath('/', 'layout');
  return { ok: true };
}
