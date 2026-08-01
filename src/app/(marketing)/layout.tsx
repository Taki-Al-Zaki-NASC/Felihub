import Link from 'next/link';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';

/**
 * Public shell. No session lookup, no client JS beyond what a page asks for —
 * these pages have to be crawlable, which is the whole reason this is Next.js
 * and not a canvas-rendered SPA.
 */
const NAV = [
  { href: '/browse', label: 'Browse work' },
  { href: '/how-it-works#hiring', label: 'For hiring' },
  { href: '/how-it-works#freelancing', label: 'For freelancers' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
] as const;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-strong">
              <span className="h-3 w-3 rounded-full border-[2.5px] border-canvas" />
            </span>
            <span className="font-serif text-lg font-semibold">Felicek</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((l) => (
              <Link key={l.href} href={l.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-backdrop hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>

        {/* Phones get a scrollable strip rather than a hamburger: fewer taps,
            and the destinations stay visible instead of hidden behind a menu
            that has to be discovered. */}
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-1.5 lg:hidden
                        [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href}
              className="flex min-h-[36px] items-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-backdrop">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border bg-ink-strong py-12 text-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <span className="flex items-center gap-2 font-serif text-lg font-semibold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal" />
                </span>
                Felicek
              </span>
              <p className="mt-3 max-w-xs text-sm">
                Identity-verified marketplace. A flat 1% platform fee, itemised
                separately from payment processing.
              </p>
            </div>
            <FooterCol title="Product" links={[
              ['/browse', 'Browse open work'],
              ['/how-it-works#hiring', 'For hiring'],
              ['/how-it-works#freelancing', 'For freelancers'],
              ['/pricing', 'Fees'],
            ]} />
            <FooterCol title="Company" links={[
              ['/about', 'About'], ['/sign-up', 'Create an account'],
              ['/sign-in', 'Log in'],
            ]} />
          </div>
          <p className="mt-10 border-t border-white/10 pt-6 text-xs">© Felicek</p>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: {
  title: string; links: readonly (readonly [Route, string])[];
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
        {title}
      </h2>
      <ul className="mt-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href}
              className="inline-flex min-h-[36px] items-center hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
