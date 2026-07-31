import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Phone, Video } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago } from '@/lib/money';
import { markThreadReadAction } from '@/server/actions/messages';
import { Composer } from '@/components/messages/composer';
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
        select: { user: { select: { displayName: true, username: true, image: true } } },
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
        <Avatar src={other?.image} name={other?.displayName ?? '?'} size={36} />
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
        {/* Calls are peer-to-peer WebRTC; the signalling transport is the one
            open decision, so these stay disabled rather than pretending. */}
        <button type="button" disabled aria-label="Voice call — coming soon"
          title="Voice calls are coming soon"
          className="flex h-10 w-10 items-center justify-center rounded-md text-ink-faint disabled:opacity-40">
          <Phone className="h-4 w-4" />
        </button>
        <button type="button" disabled aria-label="Video call — coming soon"
          title="Video calls are coming soon"
          className="flex h-10 w-10 items-center justify-center rounded-md text-ink-faint disabled:opacity-40">
          <Video className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {thread.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            No messages yet. Say hello.
          </p>
        ) : (
          thread.messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-lg px-3.5 py-2.5 ${
                  mine
                    ? 'bg-teal text-white'
                    : 'border border-border bg-surface'
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.body}
                  </p>
                  {m.attachmentUrl && (
                    <p className={`mt-1.5 text-xs ${mine ? 'text-white/70' : 'text-ink-muted'}`}>
                      {m.releasedAt
                        ? 'Attachment released'
                        : m.watermarked
                          ? 'Watermarked preview — the clean file unlocks when the milestone is released'
                          : 'Attachment'}
                    </p>
                  )}
                  <p className={`mt-1 text-[11px] ${mine ? 'text-white/60' : 'text-ink-faint'}`}>
                    {ago(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Composer threadId={thread.id} />
    </div>
  );
}
