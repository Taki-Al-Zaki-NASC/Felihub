'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { appEnabled } from '@/server/services/apps';
import type { FormResult } from '@/server/actions/profile';

/**
 * Inviting somebody to help run an account.
 *
 * The invitation is addressed to an email and carries a token, because the
 * person may not have an account yet. The token is stored hashed and shown
 * once: it is a bearer credential, and a bearer credential kept in plaintext
 * is a password kept in plaintext.
 */

const TOKEN_TTL_DAYS = 14;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function inviteMemberAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  if (!(await appEnabled(user.id, 'TEAM_MANAGER'))) {
    return { error: 'Team Manager is switched off. Turn it on in Settings → Apps.' };
  }

  const parsed = z.object({
    email: z.string().trim().toLowerCase().email('That is not an email address.'),
    role: z.enum(['VIEWER', 'MANAGER', 'ADMIN']),
  }).safeParse({
    email: form.get('email'),
    role: form.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, role } = parsed.data;

  const me = await db.user.findUniqueOrThrow({
    where: { id: user.id }, select: { email: true, displayName: true },
  });
  if (email === me.email.toLowerCase()) {
    return { error: 'That is your own address — you already run this account.' };
  }

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86_400_000);

  // Re-inviting the same address replaces the invitation rather than stacking
  // a second one, so a resend is one row and one working link.
  const existing = await db.teamMember.findUnique({
    where: { ownerId_email: { ownerId: user.id, email } },
    select: { status: true },
  });
  if (existing?.status === 'ACTIVE') {
    return { error: 'They are already on your team. Change their role below instead.' };
  }

  await db.teamMember.upsert({
    where: { ownerId_email: { ownerId: user.id, email } },
    create: {
      ownerId: user.id, email, role,
      tokenHash: hash(token), expiresAt, status: 'INVITED',
    },
    update: {
      role, tokenHash: hash(token), expiresAt, status: 'INVITED',
      invitedAt: new Date(), acceptedAt: null, memberId: null,
    },
  });

  // If they already have an account, tell them in-product. There is no mail
  // sender wired up yet, so the link below is the whole delivery mechanism —
  // said plainly rather than pretending an email went out.
  const invitee = await db.user.findUnique({
    where: { email }, select: { id: true },
  });
  if (invitee) {
    await db.notification.create({
      data: {
        userId: invitee.id,
        kind: 'TEAM_INVITE',
        title: 'You were invited to a team',
        body: `${me.displayName} invited you to help run their account as ${role.toLowerCase()}.`,
        href: `/team/accept?token=${token}`,
      },
    });
  }

  revalidatePath('/team');
  return {
    ok: true,
    // Surfaced to the inviter so they can send it themselves. Shown once.
    message: `/team/accept?token=${token}`,
  };
}

export async function setMemberRoleAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const id = String(form.get('memberId') ?? '');
  const role = String(form.get('role') ?? '');
  if (!['VIEWER', 'MANAGER', 'ADMIN'].includes(role)) return { error: 'No such role.' };

  const row = await db.teamMember.findFirst({
    where: { id, ownerId: user.id }, select: { id: true },
  });
  if (!row) return { error: 'That is not somebody on your team.' };

  await db.teamMember.update({
    where: { id },
    data: { role: role as 'VIEWER' | 'MANAGER' | 'ADMIN' },
  });
  revalidatePath('/team');
  return { ok: true };
}

export async function removeMemberAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const id = String(form.get('memberId') ?? '');

  const row = await db.teamMember.findFirst({
    where: { id, ownerId: user.id }, select: { id: true },
  });
  if (!row) return { ok: true };

  // Removed rather than deleted: who had access and when is worth keeping,
  // and the token is cleared so any outstanding link stops working.
  await db.teamMember.update({
    where: { id },
    data: { status: 'REMOVED', tokenHash: null, expiresAt: null },
  });
  revalidatePath('/team');
  return { ok: true };
}

/** Accepting an invitation. The token is matched by hash, never by lookup on
 *  the raw value, and it is spent on first use. */
export async function acceptInviteAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const token = String(form.get('token') ?? '');
  if (!token) return { error: 'That invitation link is incomplete.' };

  const row = await db.teamMember.findUnique({
    where: { tokenHash: hash(token) },
    select: { id: true, ownerId: true, status: true, expiresAt: true, email: true },
  });
  if (!row || row.status === 'REMOVED') {
    return { error: 'That invitation is not valid any more.' };
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return { error: 'That invitation has expired. Ask for a new one.' };
  }
  if (row.ownerId === user.id) {
    return { error: 'That is your own invitation — you already run this account.' };
  }

  await db.teamMember.update({
    where: { id: row.id },
    data: {
      memberId: user.id, status: 'ACTIVE', acceptedAt: new Date(),
      tokenHash: null, expiresAt: null,
    },
  });
  await db.notification.create({
    data: {
      userId: row.ownerId,
      kind: 'TEAM_JOINED',
      title: 'An invitation was accepted',
      body: `${user.displayName} joined your team.`,
      href: '/team',
    },
  });

  revalidatePath('/team');
  return { ok: true };
}
