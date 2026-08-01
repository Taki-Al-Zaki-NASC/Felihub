import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { appEnabled } from '@/server/services/apps';
import { PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppOff } from '@/components/settings/app-off';
import { BoardView } from '@/components/boards/board-view';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const board = await db.board.findUnique({ where: { id }, select: { title: true } });
  return { title: board?.title ?? 'Board' };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!(await appEnabled(user.id, 'KANBAN'))) return <AppOff app="KANBAN" />;

  // Readable by the owner, and by whoever is hired on the job it is attached
  // to — a board the freelancer cannot see is a status report, not a board.
  const board = await db.board.findFirst({
    where: {
      id,
      OR: [
        { ownerId: user.id },
        { job: { proposals: { some: { freelancerId: user.id, status: { in: ['ACCEPTED', 'COMPLETED'] } } } } },
      ],
    },
    select: {
      id: true, title: true, ownerId: true,
      job: { select: { id: true, title: true } },
      columns: { orderBy: { position: 'asc' }, select: { id: true, title: true, position: true } },
      cards: {
        orderBy: { position: 'asc' },
        select: { id: true, title: true, columnId: true, position: true, milestoneId: true },
      },
    },
  });
  if (!board) notFound();

  return (
    <>
      <PageHeader title={board.title}
        description={board.job
          ? 'Attached to a job — cards marked as milestones are the ones the escrow is tied to.'
          : 'A standalone board. Drag a card, or use the arrows on it.'}
        action={board.job ? (
          <Button asChild variant="outline">
            <Link href={`/jobs/${board.job.id}`}>
              Open the job <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : undefined} />

      <BoardView boardId={board.id} columns={board.columns} cards={board.cards}
        canEdit />
    </>
  );
}
