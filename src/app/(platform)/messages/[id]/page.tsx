import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago } from '@/lib/money';
import { markThreadReadAction } from '@/server/actions/messages';
import { ThreadView } from '@/components/messages/thread-view';
import { CallPanel } from '@/components/messages/call-panel';
import { Avatar } from '@/components/ui/avatar';

export const metadata: Metadata = { title: 'Conversation' };

export default async function Thread({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Membership is part of the query, not a check after it: a thread the user
  // is not in simply does not exist as far as this page is concerned.
  const thread = await db.thread.findFirst({
    where: { id, members: { some: { userId: user.id } } },
    select: {
      id: true,
      job: { select: { id: true, title: true } },
      members: {
        where: { userId: { not: user.id } },
        select: { user: { select: { displayName: true, username: true } } },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 200,
        select: {
          id: true, body: true, senderId: true, createdAt: true,
          attachmentUrl: true, watermarked: true, releasedAt: true,
        },
      },
    },
  });
  if (!thread) notFound();

  await markThreadReadAction(thread.id);
  const other = thread.members[0]?.user;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-canvas">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link href="/messages" aria-label="Back to messages"
          className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-backdrop lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar username={other?.username ?? ''} name={other?.displayName ?? '?'} size={36} />
        <div className="min-w-0 flex-1">
          {other ? (
            <Link href={`/profile/${other.username}`}
              className="block truncate font-semibold hover:underline">
              {other.displayName}
            </Link>
          ) : (
            <span className="font-semibold">Conversation</span>
          )}
          {thread.job && (
            <Link href={`/jobs/${thread.job.id}`}
              className="block truncate text-xs text-ink-muted hover:underline">
              {thread.job.title}
            </Link>
          )}
        </div>
        {/* Peer-to-peer WebRTC, signalled over the thread's Realtime channel.
            Media never touches a server of ours. */}
        <CallPanel threadId={thread.id} selfId={user.id}
          otherName={other?.displayName ?? 'them'} />
      </header>

      <ThreadView
        threadId={thread.id}
        selfId={user.id}
        initial={thread.messages.map((m) => ({
          id: m.id,
          body: m.body,
          senderId: m.senderId,
          createdAt: m.createdAt.toISOString(),
          attachmentUrl: m.attachmentUrl,
          watermarked: m.watermarked,
          releasedAt: m.releasedAt?.toISOString() ?? null,
        }))} />
    </div>
  );
}
