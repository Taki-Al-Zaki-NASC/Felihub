'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useSession } from '@/lib/session';
import { useCollection, byNewest } from '@/lib/queries';
import {
  markAllRead, markNotificationRead, type AppNotification,
} from '@/lib/notifications';
import { Card, EmptyState, ErrorState, Loading, Pill } from '@/components/ui';

/**
 * The in-app feed.
 *
 * These arrive while the site is open. Waking a closed browser needs a push
 * service holding credentials on a server, which is the Blaze-tier work — so
 * this page is honest about being the whole of it rather than implying a push
 * that never comes.
 */
export default function Notifications() {
  const { user } = useSession();
  const { data, loading, error } = useCollection<AppNotification>(
    user ? `users/${user.uid}/notifications` : null, [], [user?.uid]);
  const [busy, setBusy] = useState(false);

  if (!user || loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  const rows = byNewest(data);
  const unread = rows.filter((n) => !n.read);

  async function clearAll() {
    if (!user || busy || unread.length === 0) return;
    setBusy(true);
    try {
      await markAllRead(user.uid, unread.map((n) => n.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {unread.length > 0
              ? `${unread.length} unread`
              : 'Everything here has been read.'}
          </p>
        </div>
        {unread.length > 0 && (
          <button onClick={() => void clearAll()} disabled={busy}
            className="min-h-[40px] rounded-[9px] border border-border-strong bg-surface px-4 text-xs font-bold transition hover:bg-backdrop disabled:opacity-50">
            {busy ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {rows.length === 0 ? (
          <EmptyState title="Nothing yet"
            message="Proposals, hires, milestone releases and messages show up here." />
        ) : rows.map((n) => (
          <NotificationRow key={n.id} n={n} uid={user.uid} />
        ))}
      </div>
    </>
  );
}

function NotificationRow({ n, uid }: { n: AppNotification; uid: string }) {
  // Where each kind should take you. A notification that does not lead
  // anywhere is just a nag.
  const href: Route | null =
    n.chatId ? (`/messages/${n.chatId}` as Route)
      : n.jobId ? (`/jobs/${n.jobId}` as Route)
        : null;

  const body = (
    <Card className={`transition ${n.read ? '' : 'border-teal/40 bg-teal-tint/40'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{n.title}</p>
            {!n.read && <Pill tone="teal">New</Pill>}
          </div>
          <p className="mt-1 text-sm text-ink-muted">{n.body}</p>
        </div>
        <span className="shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">
          {n.kind}
        </span>
      </div>
    </Card>
  );

  if (!href) return body;
  return (
    <Link href={href} onClick={() => void markNotificationRead(uid, n.id).catch(() => {})}
      className="block">
      {body}
    </Link>
  );
}
