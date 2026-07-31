import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface', className)}
      {...props} />
  );
}

export function CardHeader({ title, action, description }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h2 className="font-serif text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * An empty state that says what to do next.
 *
 * "No results" alone is a dead end; every one of these carries the action that
 * makes it non-empty, which is the difference between a blank page and a
 * starting point.
 */
export function Empty({ icon: Icon, title, body, cta }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta?: { href: Route; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-tint text-ink-faint">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{body}</p>
      {cta && (
        <Button asChild className="mt-6">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}

export function Stat({ label, value, hint }: {
  label: string; value: string; hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="mt-1.5 font-serif text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </Card>
  );
}

export function Badge({ tone = 'neutral', children }: {
  tone?: 'neutral' | 'teal' | 'amber' | 'violet' | 'danger';
  children: React.ReactNode;
}) {
  const tones = {
    neutral: 'bg-neutral-tint text-ink-muted',
    teal: 'bg-teal-tint text-teal-deep',
    amber: 'bg-amber-tint text-amber',
    violet: 'bg-violet-tint text-violet',
    danger: 'bg-danger-tint text-danger',
  } as const;
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      tones[tone],
    )}>
      {children}
    </span>
  );
}
