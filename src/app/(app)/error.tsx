'use client';

import { useEffect } from 'react';

/**
 * Catches render-time crashes inside the signed-in app.
 *
 * Without this, one thrown exception replaces the entire page with Next.js's
 * bare "Application error: a client-side exception has occurred" — which tells
 * the person nothing, offers no way back, and sends them to a browser console
 * they should never need to open. A crash is still a bug; this makes it a
 * recoverable one.
 */
export default function AppError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The message is the only lead a bug report will carry, so keep it in the
    // console deliberately rather than relying on React's own logging.
    console.error('Felicek app error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <h1 className="font-serif text-2xl font-semibold">Something broke on this page</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This is a bug in Felicek, not something you did. The rest of the app
        still works.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={reset}
          className="min-h-[44px] rounded-button bg-ink-strong px-5 text-sm font-bold text-canvas hover:opacity-90">
          Try again
        </button>
        <a href="/dashboard"
          className="flex min-h-[44px] items-center rounded-button border border-border-strong bg-surface px-5 text-sm font-bold hover:bg-backdrop">
          Back to dashboard
        </a>
      </div>

      {error.message && (
        <p className="mt-6 break-words rounded-field bg-backdrop px-3 py-2 text-left text-xs text-ink-muted">
          {error.message}
        </p>
      )}
    </div>
  );
}
