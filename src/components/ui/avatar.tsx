import { cn } from '@/lib/utils';

/**
 * Someone's photo, by username.
 *
 * Always a URL, never the image itself: avatars used to be base64 data URLs
 * selected on every request and inlined into the HTML, which made every page
 * tens of kilobytes heavier and the talent directory megabytes. `/api/avatar`
 * serves the bytes with an ETag, so the browser fetches each one once.
 *
 * The route also draws the initial fallback, so there is no branch here and no
 * query anywhere needs to select the image column just to know whether one
 * exists.
 *
 * `img` rather than next/image: these are already sized, same-origin, and
 * cached — the optimiser has nothing to add and would add a round trip.
 */
export function Avatar({ username, name, size = 40, className, priority }: {
  username: string;
  name: string;
  size?: number;
  className?: string;
  /** The one avatar that is part of the first paint — the top bar. */
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/avatar/${encodeURIComponent(username)}`}
      alt={name}
      width={size}
      height={size}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={{ width: size, height: size }}
      className={cn(
        'shrink-0 rounded-full border border-border bg-teal-tint object-cover',
        className,
      )}
    />
  );
}
