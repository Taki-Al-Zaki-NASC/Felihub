import Link from 'next/link';
import type { Route } from 'next';
import type { Metadata } from 'next';
import { Bell } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { ago } from '@/lib/money';
import { Card, Empty, PageHeader } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Notifications' };

export default async function Notifications() {
  const user = await requireUser();

  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, kind: true, title: true, body: true, href: true,
      read: true, createdAt: true,
    },
  });

  // Opening the page is the acknowledgement. A separate "mark all read"
  // button is a chore nobody performs, and the badge then never clears.
  if (items.some((n) => !n.read)) {
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
  }

  return (
    <>
      <PageHeader title="Notifications"
        description="Bids, hires, messages and money movements." />

      {items.length === 0 ? (
        <Empty icon={Bell} title="Nothing yet"
          body="You will hear from us when someone bids, hires, messages you, or when money moves." />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const inner = (
                <div className={`flex gap-3 px-5 py-4 ${n.href ? 'hover:bg-neutral-tint' : ''}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-border-strong' : 'bg-teal'}`}
                    aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-sm text-ink-muted">{n.body}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{ago(n.createdAt)}</p>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.href
                    ? <Link href={n.href as Route}>{inner}</Link>
                    : inner}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
