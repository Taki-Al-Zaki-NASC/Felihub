import Link from 'next/link';
import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago } from '@/lib/money';
import { Card, Empty, PageHeader } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

export const metadata: Metadata = { title: 'Messages' };

export default async function Messages() {
  const user = await requireUser();

  const memberships = await db.threadMember.findMany({
    where: { userId: user.id },
    orderBy: { thread: { lastMessageAt: 'desc' } },
    take: 50,
    select: {
      readAt: true,
      thread: {
        select: {
          id: true, lastMessageAt: true,
          job: { select: { title: true } },
          members: {
            where: { userId: { not: user.id } },
            select: { user: { select: { displayName: true, username: true, image: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { body: true, senderId: true, createdAt: true },
          },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Messages"
        description={user.role === 'FREELANCER'
          ? 'Every conversation about your bids and contracts.'
          : 'Conversations with freelancers you have contacted or hired.'} />

      {memberships.length === 0 ? (
        <Empty icon={MessageSquare} title="No conversations yet"
          body={user.role === 'FREELANCER'
            ? 'A thread opens automatically when a client hires you, and clients can message you directly from your profile.'
            : 'Message any verified freelancer straight from the talent directory — you do not need to post a job first.'}
          cta={user.role === 'FREELANCER'
            ? { href: '/jobs', label: 'Find work' }
            : { href: '/talent', label: 'Browse talent' }} />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {memberships.map(({ thread, readAt }) => {
              const other = thread.members[0]?.user;
              const last = thread.messages[0];
              const unread = last
                && last.senderId !== user.id
                && (!readAt || readAt < last.createdAt);
              return (
                <li key={thread.id}>
                  <Link href={`/messages/${thread.id}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-neutral-tint">
                    <Avatar src={other?.image} name={other?.displayName ?? '?'} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate ${unread ? 'font-bold' : 'font-semibold'}`}>
                          {other?.displayName ?? 'Conversation'}
                        </span>
                        {unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-teal"
                            aria-label="Unread" />
                        )}
                      </span>
                      {thread.job && (
                        <span className="block truncate text-xs text-ink-faint">
                          {thread.job.title}
                        </span>
                      )}
                      <span className="block truncate text-sm text-ink-muted">
                        {last
                          ? `${last.senderId === user.id ? 'You: ' : ''}${last.body}`
                          : 'No messages yet'}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {ago(thread.lastMessageAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
