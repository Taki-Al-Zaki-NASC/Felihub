'use client';

import Link from 'next/link';
import { useActionState, useOptimistic, useTransition } from 'react';
import { AlertTriangle, ArrowRight, KanbanSquare, Timer, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleAppAction } from '@/server/actions/apps';
import type { AppDefinition } from '@/lib/apps';
import type { FormResult } from '@/server/actions/profile';

const ICONS = { KanbanSquare, Timer, Users } as const;

/**
 * One tool in the Apps grid.
 *
 * The switch is optimistic: a toggle that waits for a round trip before moving
 * reads as broken, and people click it again. It snaps back if the write
 * fails, and the failure is stated rather than swallowed.
 */
export function AppCard({ app, enabled }: { app: AppDefinition; enabled: boolean }) {
  const Icon = ICONS[app.icon];
  const [state, action] = useActionState<FormResult | null, FormData>(
    toggleAppAction, null,
  );
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(enabled);

  // The server is the truth; the optimistic value only covers the round trip.
  const on = pending ? optimistic : enabled;

  const toggle = () => {
    const next = !on;
    const data = new FormData();
    data.set('app', app.key);
    data.set('enabled', String(next));
    startTransition(() => {
      setOptimistic(next);
      action(data);
    });
  };

  const switchId = `toggle-${app.key}`;

  return (
    <div className={cn(
      'flex h-full min-w-0 flex-col rounded-lg border bg-surface p-5 transition',
      on ? 'border-teal/40' : 'border-border',
    )}>
      <div className="flex items-start gap-3">
        <span className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
          on ? 'bg-teal-tint text-teal-deep' : 'bg-neutral-tint text-ink-faint',
        )}>
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-base font-semibold">{app.title}</h3>
            <span className="inline-flex items-center rounded-full bg-teal-tint px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-teal-deep">
              {app.price}
            </span>
          </div>
        </div>

        {/* A real switch, not a checkbox with a label: role and aria-checked
            are what a screen reader needs to say "on" instead of "checked". */}
        <button
          type="button"
          id={switchId}
          role="switch"
          aria-checked={on}
          aria-label={`${on ? 'Turn off' : 'Turn on'} ${app.title}`}
          onClick={toggle}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
            on ? 'bg-teal' : 'bg-border-strong',
          )}>
          <span className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
            on ? 'translate-x-6' : 'translate-x-1',
          )} />
        </button>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
        {app.description}
      </p>

      {app.caution && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-amber/30 bg-amber-tint px-3 py-2 text-xs text-amber">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {app.caution}
        </p>
      )}

      {state?.error && (
        <p role="alert" className="mt-3 text-xs text-danger">{state.error}</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="min-w-0 text-xs text-ink-muted">
          {on ? app.whenOn : 'Off. Nothing about it appears anywhere.'}
        </p>
        {on && (
          <Link href={app.href as never}
            className="inline-flex min-h-[32px] shrink-0 items-center gap-1 text-xs font-bold text-teal-deep hover:underline">
            Open <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
