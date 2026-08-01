import Link from 'next/link';
import type { Metadata } from 'next';
import { KanbanSquare } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { hasApp } from '@/server/services/apps';
import { ago } from '@/lib/money';
import { Card, Empty, PageHeader } from '@/components/ui/card';
import { AppOff } from '@/components/settings/app-off';
import { NewBoard } from '@/components/boards/new-board';

export const metadata: Metadata = { title: 'Boards' };

export default async function Boards() {
  const user = await requireUser();
  if (!hasApp(user, 'KANBAN')) return <AppOff app="KANBAN" />;

  const [boards, jobs] = await Promise.all([
    db.board.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { job: { proposals: { some: { freelancerId: user.id, status: { in: ['ACCEPTED', 'COMPLETED'] } } } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, updatedAt: true, ownerId: true,
        job: { select: { id: true, title: true } },
        _count: { select: { cards: true } },
      },
    }),
    // Only jobs of this account's that do not have a board yet — offering one
    // that already has a board is an error message waiting to happen.
    db.job.findMany({
      where: { ownerId: user.id, board: null },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, title: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Boards"
        description="Tasks and milestones, in columns you can drag between. A board attached to a job starts with that job's milestones already on it." />

      <NewBoard jobs={jobs} />

      {boards.length === 0 ? (
        <Empty icon={KanbanSquare} title="No boards yet"
          body="Make one above. Attaching it to a job brings that job's milestones across, so the board and the money stay the same list." />
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {boards.map((b) => (
            <li key={b.id} className="min-w-0">
              <Card className="h-full transition hover:border-border-strong">
                <Link href={`/boards/${b.id}`} prefetch={false} className="block p-5">
                  <h2 className="font-serif text-base font-semibold">{b.title}</h2>
                  <p className="mt-1 text-xs text-ink-muted">
                    {b._count.cards} {b._count.cards === 1 ? 'card' : 'cards'}
                    {' · '}updated {ago(b.updatedAt)}
                    {b.ownerId !== user.id && ' · shared with you'}
                  </p>
                  {b.job && (
                    <p className="mt-2 truncate text-sm text-ink-muted">
                      On “{b.job.title}”
                    </p>
                  )}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
