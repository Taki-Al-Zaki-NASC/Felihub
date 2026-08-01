import Link from 'next/link';
import type { Metadata } from 'next';
import { Monitor, Timer } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { hasApp } from '@/server/services/apps';
import { ago } from '@/lib/money';
import { Badge, Card, CardHeader, Empty, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppOff } from '@/components/settings/app-off';
import { PairDevice, RevokeDevice } from '@/components/tracker/device-forms';
import { DESKTOP_VERSION, anyBuildAvailable } from '@/lib/desktop';

export const metadata: Metadata = { title: 'Time tracker' };

const hhmm = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default async function Tracker() {
  const user = await requireUser();
  if (!hasApp(user, 'TIME_TRACKER')) return <AppOff app="TIME_TRACKER" />;

  const [devices, entries, totals] = await Promise.all([
    db.trackerDevice.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { pairedAt: 'desc' },
      select: { id: true, name: true, platform: true, pairedAt: true, lastSeenAt: true },
    }),
    db.timeEntry.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 25,
      select: {
        id: true, startedAt: true, seconds: true, note: true,
        job: { select: { id: true, title: true } },
        device: { select: { name: true } },
        _count: { select: { samples: true } },
      },
    }),
    db.timeEntry.aggregate({
      where: { userId: user.id },
      _sum: { seconds: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Time tracker"
        description="Hours reported by the desktop app, against your contracts." />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Tracked in total
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold">
            {hhmm(totals._sum.seconds ?? 0)}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/download">
            {anyBuildAvailable
              ? `Download the desktop app (${DESKTOP_VERSION})`
              : 'About the desktop app'}
          </Link>
        </Button>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Paired devices"
          description="Each device gets its own token. Revoking one stops that machine and nothing else." />
        <div className="border-b border-border p-5">
          <PairDevice />
        </div>
        {devices.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">
            No devices paired yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Monitor className="h-4 w-4 shrink-0 text-ink-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.name}</p>
                  <p className="text-xs text-ink-muted">
                    {d.platform} · paired {ago(d.pairedAt)}
                    {d.lastSeenAt ? ` · last reported ${ago(d.lastSeenAt)}` : ' · never reported'}
                  </p>
                </div>
                <RevokeDevice id={d.id} name={d.name} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent sessions" />
        {entries.length === 0 ? (
          <div className="p-5">
            <Empty icon={Timer} title="Nothing tracked yet"
              body="Pair a device above, then run the desktop app. Sessions appear here as it reports them." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {e.job ? e.job.title : 'No contract'}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {ago(e.startedAt)}
                    {e.device && ` · ${e.device.name}`}
                    {e._count.samples > 0 && ` · ${e._count.samples} activity samples`}
                    {e.note && ` · ${e.note}`}
                  </p>
                </div>
                <Badge>{hhmm(e.seconds)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
