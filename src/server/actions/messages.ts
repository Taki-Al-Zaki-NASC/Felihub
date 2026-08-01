'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { meetsMandatoryRequirements } from '@/server/services/verification';
import type { FormResult } from '@/server/actions/profile';

const bodySchema = z.string().trim().min(1, 'Write something first.').max(8000);

/** Membership is the read/write boundary for a thread. Every query below is
 *  scoped by it rather than filtered after the fact. */
async function assertMember(threadId: string, userId: string) {
  const member = await db.threadMember.findUnique({
    where: { threadId_userId: { threadId, userId } },
    select: { threadId: true },
  });
  if (!member) redirect('/messages');
}

export async function sendMessageAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const threadId = String(form.get('threadId') ?? '');
  await assertMember(threadId, user.id);

  const parsed = bodySchema.safeParse(form.get('body'));
  if (!parsed.success) {
    return { fieldErrors: { body: parsed.error.issues[0].message } };
  }

  const others = await db.threadMember.findMany({
    where: { threadId, userId: { not: user.id } },
    select: { userId: true },
  });

  let created = '';
  await db.$transaction(async (tx) => {
    const row = await tx.message.create({
      data: { threadId, senderId: user.id, body: parsed.data },
      select: { id: true },
    });
    created = row.id;
    await tx.thread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });
    if (others.length) {
      await tx.notification.createMany({
        data: others.map((o) => ({
          userId: o.userId,
          kind: 'MESSAGE',
          title: `Message from ${user.displayName}`,
          body: parsed.data.slice(0, 120),
          href: `/messages/${threadId}`,
        })),
      });
    }
  });

  // Deliberately *not* revalidating this thread's own page.
  //
  // `revalidatePath` here re-ran the whole route on every send — the layout's
  // session lookup, the thread query, the message list — and the sender waited
  // for all of it before their own message appeared. That is the delay. The
  // sender renders it optimistically and the other side gets it over Realtime
  // broadcast; both are already correct before this action returns.
  //
  // The *list* page is still revalidated, because its ordering and unread
  // counts change and nothing on the client is tracking that.
  revalidatePath('/messages');

  // The real id, so the optimistic row can adopt it and a later broadcast of
  // the same message is recognised as a duplicate rather than shown twice.
  return { ok: true, message: created };
}

/**
 * Opens (or reuses) a direct thread with someone.
 *
 * Reuses deliberately: a second thread between the same two people splits the
 * history in half and neither side can tell which one holds the message they
 * remember.
 */
export async function openThreadAction(username: string): Promise<never> {
  const user = await requireUser();

  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      idSubmitted: true, depositPaid: true, kycStage: true,
      role: true, image: true,
    },
  });
  if (!meetsMandatoryRequirements(account)) redirect('/verify');

  const other = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!other || other.id === user.id) redirect('/messages');

  const existing = await db.thread.findFirst({
    where: {
      jobId: null,
      AND: [
        { members: { some: { userId: user.id } } },
        { members: { some: { userId: other.id } } },
      ],
    },
    select: { id: true },
  });
  if (existing) redirect(`/messages/${existing.id}`);

  const thread = await db.thread.create({
    data: {
      members: {
        createMany: {
          data: [{ userId: user.id }, { userId: other.id }],
        },
      },
    },
    select: { id: true },
  });
  redirect(`/messages/${thread.id}`);
}

export async function markThreadReadAction(threadId: string): Promise<void> {
  const user = await requireUser();
  await db.threadMember.updateMany({
    where: { threadId, userId: user.id },
    data: { readAt: new Date() },
  });
}
