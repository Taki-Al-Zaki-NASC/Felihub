import Link from 'next/link';
import { PowerOff } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { APPS, type AppKey } from '@/lib/apps';

/**
 * What a tool's own page says when the tool is off.
 *
 * A 404 would be wrong — the page exists and the account could have it — and a
 * silent redirect to Settings leaves somebody who followed a bookmark
 * wondering what happened. This says which switch, and links to it.
 */
export function AppOff({ app }: { app: AppKey }) {
  const definition = APPS[app];
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={definition.title} />
      <Card className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-tint text-ink-faint">
          <PowerOff className="h-5 w-5" />
        </span>
        <h2 className="mt-4 w-full font-semibold">This tool is switched off</h2>
        <p className="mt-1.5 w-full max-w-sm text-sm text-ink-muted">
          {definition.description}
        </p>
        <Button asChild className="mt-6">
          <Link href="/settings?tab=apps">Turn it on in Settings → Apps</Link>
        </Button>
      </Card>
    </div>
  );
}
