import Link from 'next/link';
import type { Route } from 'next';
import { Wordmark } from './ui';

/**
 * Header and footer shared by the landing page and the marketing pages
 * (about/features/offer/calculator/faq/contact). Extracted once six pages
 * started needing the same chrome, rather than copied into each.
 */
export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href={'/signin' as Route}
            className="rounded-[9px] px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-backdrop">
            Sign in
          </Link>
          <Link href={'/signup' as Route}
            className="rounded-button bg-ink-strong px-4 py-2.5 text-sm font-bold text-canvas hover:opacity-90">
            Join
          </Link>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS: { title: string; links: { href: Route; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '/jobs' as Route, label: 'Find work' },
      { href: '/signup' as Route, label: 'Post a job' },
      { href: '/features' as Route, label: 'Features' },
      { href: '/offer' as Route, label: 'Pricing' },
      { href: '/calculator' as Route, label: 'Fee calculator' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about' as Route, label: 'About' },
      { href: '/faq' as Route, label: 'FAQ' },
      { href: '/contact' as Route, label: 'Contact' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-ink-strong py-12 text-white/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <span className="flex items-center gap-2.5 font-serif text-lg font-semibold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-white/10">
                <span className="h-2.5 w-2.5 rounded-full bg-teal" />
              </span>
              Felicek
            </span>
            <p className="mt-3 max-w-xs text-sm">
              Identity-verified freelance marketplace. A flat 1% platform fee,
              shown separately from payment processing.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs sm:flex-row sm:justify-between">
          <span>© Felicek</span>
          <Link href={'/signin' as Route} className="hover:text-white">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
