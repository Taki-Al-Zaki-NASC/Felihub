'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * The root error boundary.
 *
 * v1 showed "Application error: a client-side exception has occurred", which
 * tells the user nothing and gives them nowhere to go. This shows the digest —
 * the one string that lets us find the matching server log — and offers a
 * retry, because a large share of these are a transient database hiccup that
 * a second attempt clears.
 */
export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <h1 className="font-serif text-2xl font-semibold">Something broke.</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        This is our fault, not yours. Trying again often works — if it does not,
        send us the reference below and we can find the exact failure.
      </p>
      {error.digest && (
        <code className="mt-4 rounded border border-border bg-neutral-tint px-2.5 py-1.5 text-xs text-ink-muted">
          {error.digest}
        </code>
      )}
      {/* A digest alone means reading server logs to learn anything. The health
          endpoint answers the common causes — no database, no tables, no
          AUTH_SECRET — in one request. */}
      <p className="mt-4 text-xs text-ink-faint">
        Running this site?{' '}
        <a href="/api/health" className="underline hover:text-ink-muted">
          /api/health
        </a>{' '}
        says whether the database and configuration are in order.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>Try again</Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>
    </main>
  );
}
