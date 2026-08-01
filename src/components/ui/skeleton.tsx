import { cn } from '@/lib/utils';

/**
 * The shape of the content, shown while the server fetches it.
 *
 * Every signed-in page is rendered on demand against the database, so there is
 * always a wait. Without a `loading.tsx` the browser holds the *previous* page
 * on screen for the whole of it and nothing acknowledges the click — which
 * reads as "the site is broken", not "the site is loading". A skeleton turns
 * the same wait into visible progress.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden
      className={cn('animate-pulse rounded bg-border-strong/60', className)} />
  );
}

/** A page header plus a stack of cards — close enough to the real layout that
 *  nothing jumps when the content lands. */
export function PageSkeleton({ rows = 4, stats = false }: {
  rows?: number;
  stats?: boolean;
}) {
  return (
    // `data-loading` is what the end-to-end walk waits to disappear: signed-in
    // pages stream, so "the document loaded" and "the content arrived" are two
    // different moments and the test needs the second one.
    <div role="status" aria-label="Loading" data-loading>
      <div className="mb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="mt-3 h-3.5 w-2/3" />
            <Skeleton className="mt-2 h-3.5 w-1/3" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
