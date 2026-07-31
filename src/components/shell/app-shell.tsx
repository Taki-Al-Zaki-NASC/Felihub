'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase, FileText, LayoutDashboard, Menu, MessageSquare,
  Search, Settings, Users, Wallet, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/types/session';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * The two sides of the marketplace want opposite things, so they get different
 * navigation rather than one menu with dead entries: a hirer browses people, a
 * freelancer browses work. v1 showed both sides the same "Jobs" tab, which put
 * clients in the freelancer's feed.
 */
function navFor(role: SessionUser['role']): NavItem[] {
  const hires = role !== 'FREELANCER';
  return [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    hires
      ? { href: '/talent', label: 'Find talent', icon: Users }
      : { href: '/jobs', label: 'Find work', icon: Briefcase },
    { href: '/contracts', label: 'Contracts', icon: FileText },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const nav = navFor(user.role);
  const hires = user.role !== 'FREELANCER';

  return (
    <div className="min-h-screen bg-backdrop">
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-border bg-canvas/95 backdrop-blur">
        <div className="flex h-full items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="lg:hidden"
            aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-strong">
              <span className="h-3 w-3 rounded-full border-[2.5px] border-canvas" />
            </span>
            <span className="font-serif text-lg font-semibold">Felicek</span>
          </Link>

          <button
            className="ml-4 hidden h-9 w-72 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-ink-muted transition hover:border-border-strong md:flex"
            aria-label={hires ? 'Search talent' : 'Search jobs'}
          >
            <Search className="h-4 w-4" />
            <span>{hires ? 'Search talent' : 'Search jobs'}</span>
            <kbd className="ml-auto rounded border border-border px-1.5 text-[10px]">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {hires && (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/jobs/new">Post a job</Link>
              </Button>
            )}
            <Link href="/notifications" aria-label={
              user.unreadNotifications > 0
                ? `Notifications, ${user.unreadNotifications} unread`
                : 'Notifications'}
              className="relative flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-backdrop">
              <BellIcon />
              {user.unreadNotifications > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-teal px-1 text-[10px] font-bold text-white">
                  {user.unreadNotifications > 9 ? '9+' : user.unreadNotifications}
                </span>
              )}
            </Link>
            <Link href={`/profile/${user.username}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-tint font-serif text-sm font-semibold text-teal-deep"
              aria-label="Your profile">
              {user.displayName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-60 border-r border-border bg-canvas lg:block">
        <SidebarNav nav={nav} pathname={pathname} />
      </aside>

      {/* Mobile drawer carries the same destinations, not a reduced set. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-64 bg-canvas shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="font-serif text-lg font-semibold">Felicek</span>
              <Button variant="ghost" size="icon" aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarNav nav={nav} pathname={pathname}
              onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="pt-14 lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

function SidebarNav({
  nav, pathname, onNavigate,
}: {
  nav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map(({ href, label, icon: Icon }) => {
        // Prefix match so a detail page keeps its section lit, exact match on
        // the segment itself so /jobs does not stay active on /jobs/new.
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
              active
                ? 'bg-teal-tint text-teal-deep'
                : 'text-ink-muted hover:bg-backdrop hover:text-ink',
            )}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" strokeLinejoin="round" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" strokeLinecap="round" />
    </svg>
  );
}
