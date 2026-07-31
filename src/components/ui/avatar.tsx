import { cn } from '@/lib/utils';

/**
 * The photo, or the initial as a fallback.
 *
 * One component so the fallback is identical everywhere — v1 drew the initial
 * five different ways and two of them overflowed on long names.
 *
 * `img` rather than next/image on purpose: these are 256px data URLs written
 * by the avatar upload, so there is no remote fetch to optimise and no domain
 * to allowlist.
 */
export function Avatar({ src, name, size = 40, className }: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" style={style}
        className={cn('shrink-0 rounded-full border border-border object-cover', className)} />
    );
  }

  return (
    <span style={style} aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-teal-tint font-serif font-semibold text-teal-deep',
        size >= 56 ? 'text-xl' : size >= 40 ? 'text-sm' : 'text-xs',
        className,
      )}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
