/**
 * Money is stored and passed around in integer cents. It is formatted exactly
 * once, here, at the edge where it is displayed — a float never enters the
 * system, because a rounding error in this codebase is somebody's wages.
 */
export function money(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Parses "$1,200", "1200", "1,200.50" → cents. Returns null if unparseable. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** "3 days ago" — relative time without pulling in a date library. */
export function ago(date: Date | string): string {
  const then = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'], [3600, 'minute'], [86400, 'hour'],
    [604800, 'day'], [2629800, 'week'], [31557600, 'month'],
  ];
  const fmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let prev = 1;
  for (const [limit, unit] of units) {
    if (seconds < limit) return fmt.format(-Math.floor(seconds / prev), unit);
    prev = limit;
  }
  return fmt.format(-Math.floor(seconds / 31557600), 'year');
}
