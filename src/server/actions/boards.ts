'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { appEnabled } from '@/server/services/apps';
import type { FormResult } from '@/server/actions/profile';

/**
 * Kanban boards.
 *
 * Positions are sparse — a card's position is the midpoint between its new
 * neighbours — so dropping a card between two others writes one row instead of
 * renumbering the column. When two midpoints collide the column is rewritten
 * once, spaced out again; that happens rarely enough that the simple path is
 * worth having.
 */

const GAP = 1024;

/** The default columns. Three, because a board that opens with eight empty
 *  lanes is a form, not a board. */
const DEFAULT_COLUMNS = ['To do', 'In progress', 'Done'];

/** Ownership, checked in one place. A board is readable by the account that
 *  owns it and — when it is attached to a job — by whoever is hired on it. */
async function boardFor(userId: string, boardId: string) {
  return db.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: userId },
        { job: { proposals: { some: { freelancerId: userId, status: { in: ['ACCEPTED', 'COMPLETED'] } } } } },
      ],
    },
    select: { id: true, ownerId: true, jobId: true },
  });
}

async function requireBoardTool(userId: string) {
  if (!(await appEnabled(userId, 'KANBAN'))) {
    return 'Boards are switched off. Turn them on in Settings → Apps.';
  }
  return null;
}

export async function createBoardAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const off = await requireBoardTool(user.id);
  if (off) return { error: off };

  const parsed = z.object({
    title: z.string().trim().min(2, 'Give the board a name.').max(80),
    jobId: z.string().trim().optional().or(z.literal('')),
  }).safeParse({
    title: form.get('title'),
    jobId: form.get('jobId') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Attaching to a job is what lets the board's cards stand for milestones
  // that already exist, so it has to be a job this account actually owns.
  let jobId: string | null = null;
  if (parsed.data.jobId) {
    const job = await db.job.findFirst({
      where: { id: parsed.data.jobId, ownerId: user.id },
      select: { id: true, board: { select: { id: true } } },
    });
    if (!job) return { error: 'That job is not yours to attach a board to.' };
    if (job.board) return { error: 'That job already has a board.' };
    jobId = job.id;
  }

  const board = await db.board.create({
    data: {
      ownerId: user.id,
      jobId,
      title: parsed.data.title,
      columns: {
        create: DEFAULT_COLUMNS.map((title, i) => ({ title, position: (i + 1) * GAP })),
      },
    },
    select: { id: true, columns: { orderBy: { position: 'asc' }, select: { id: true } } },
  });

  // A board attached to a job opens with its milestones already on it. That is
  // the whole reason to attach one — retyping the milestones by hand produces
  // a second list that drifts from the one the money is tied to.
  if (jobId) {
    const milestones = await db.milestone.findMany({
      where: { jobId },
      orderBy: { position: 'asc' },
      select: { id: true, label: true, released: true },
    });
    const todo = board.columns[0]?.id;
    const done = board.columns[board.columns.length - 1]?.id;
    if (todo && done) {
      await db.boardCard.createMany({
        data: milestones.map((m, i) => ({
          boardId: board.id,
          columnId: m.released ? done : todo,
          title: m.label,
          milestoneId: m.id,
          position: (i + 1) * GAP,
        })),
      });
    }
  }

  revalidatePath('/boards');
  redirect(`/boards/${board.id}`);
}

export async function addCardAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const boardId = String(form.get('boardId') ?? '');
  const columnId = String(form.get('columnId') ?? '');
  const title = String(form.get('title') ?? '').trim();

  if (title.length < 2) return { error: 'A card needs a title.' };
  if (title.length > 200) return { error: 'That title is too long for a card.' };

  const board = await boardFor(user.id, boardId);
  if (!board) return { error: 'That board is not yours.' };

  const column = await db.boardColumn.findFirst({
    where: { id: columnId, boardId },
    select: { id: true },
  });
  if (!column) return { error: 'That column is not on this board.' };

  const last = await db.boardCard.findFirst({
    where: { columnId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  await db.boardCard.create({
    data: {
      boardId, columnId, title,
      position: (last?.position ?? 0) + GAP,
    },
  });

  revalidatePath(`/boards/${boardId}`);
  return { ok: true };
}

/**
 * Moving a card.
 *
 * `before` and `after` are the ids of the cards it was dropped between, either
 * of which may be absent at the ends of a column. The new position is their
 * midpoint, so one row is written.
 */
export async function moveCardAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const cardId = String(form.get('cardId') ?? '');
  const columnId = String(form.get('columnId') ?? '');
  const beforeId = String(form.get('before') ?? '');
  const afterId = String(form.get('after') ?? '');

  const card = await db.boardCard.findUnique({
    where: { id: cardId },
    select: { id: true, boardId: true },
  });
  if (!card) return { error: 'That card no longer exists.' };

  const board = await boardFor(user.id, card.boardId);
  if (!board) return { error: 'That board is not yours.' };

  const column = await db.boardColumn.findFirst({
    where: { id: columnId, boardId: card.boardId },
    select: { id: true },
  });
  if (!column) return { error: 'That column is not on this board.' };

  const [before, after] = await Promise.all([
    beforeId
      ? db.boardCard.findFirst({ where: { id: beforeId, columnId }, select: { position: true } })
      : null,
    afterId
      ? db.boardCard.findFirst({ where: { id: afterId, columnId }, select: { position: true } })
      : null,
  ]);

  let position: number;
  if (before && after) position = Math.round((before.position + after.position) / 2);
  else if (before) position = before.position + GAP;
  else if (after) position = after.position - GAP;
  else position = GAP;

  // Midpoints eventually collide after enough drops in the same gap. Respace
  // the column once and put the card where it was asked to go.
  const collides = before && after
    && (position === before.position || position === after.position);

  await db.$transaction(async (tx) => {
    await tx.boardCard.update({ where: { id: cardId }, data: { columnId, position } });
    if (collides) {
      const cards = await tx.boardCard.findMany({
        where: { columnId },
        orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
        select: { id: true },
      });
      for (const [i, c] of cards.entries()) {
        await tx.boardCard.update({
          where: { id: c.id },
          data: { position: (i + 1) * GAP },
        });
      }
    }
  });

  revalidatePath(`/boards/${card.boardId}`);
  return { ok: true };
}

export async function deleteCardAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const cardId = String(form.get('cardId') ?? '');

  const card = await db.boardCard.findUnique({
    where: { id: cardId },
    select: { id: true, boardId: true, milestoneId: true },
  });
  if (!card) return { ok: true };

  const board = await boardFor(user.id, card.boardId);
  if (!board) return { error: 'That board is not yours.' };

  // A card standing for a milestone is a view of it, not the thing itself.
  // Deleting the card must not look like deleting the milestone.
  if (card.milestoneId) {
    return {
      error: 'This card stands for a milestone on the job. Remove the '
        + 'milestone on the job itself if that is what you meant — deleting '
        + 'the card here would hide it without changing anything about the money.',
    };
  }

  await db.boardCard.delete({ where: { id: cardId } });
  revalidatePath(`/boards/${card.boardId}`);
  return { ok: true };
}
