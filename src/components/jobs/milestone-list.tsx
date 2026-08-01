'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { money } from '@/lib/money';
import {
  fundMilestoneAction, releaseMilestoneAction,
} from '@/server/actions/milestones';
import type { FormResult } from '@/server/actions/profile';

export interface MilestoneRow {
  id: string;
  label: string;
  amountCents: number;
  funded: boolean;
  released: boolean;
  position: number;
}

/**
 * The agreed breakdown of the work, and the only place money moves.
 *
 * Both parties see the same list in the same order, so "what is left" is never
 * a matter of recollection. Only the client sees the buttons — and the button
 * says the amount, because releasing is irreversible and a control that hides
 * what it costs is a trap.
 */
export function MilestoneList({ milestones, isOwner, hired }: {
  milestones: MilestoneRow[];
  isOwner: boolean;
  hired: boolean;
}) {
  const released = milestones.filter((m) => m.released).length;
  const total = milestones.reduce((t, m) => t + m.amountCents, 0);
  const paid = milestones.filter((m) => m.released)
    .reduce((t, m) => t + m.amountCents, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3 text-sm">
        <span className="text-ink-muted">
          {released} of {milestones.length} released
        </span>
        <span className="font-semibold">
          {money(paid)} <span className="font-normal text-ink-faint">of {money(total)}</span>
        </span>
      </div>

      <ul className="divide-y divide-border">
        {milestones.map((m, i) => (
          <li key={m.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 gap-3">
                <span className="mt-0.5 shrink-0">
                  {m.released
                    ? <CheckCircle2 className="h-4.5 w-4.5 text-teal" />
                    : m.funded
                      ? <Lock className="h-4.5 w-4.5 text-violet" />
                      : <Circle className="h-4.5 w-4.5 text-ink-faint" />}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{m.label}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Milestone {i + 1}
                    {m.released
                      ? ' · released'
                      : m.funded
                        ? ' · funded, in escrow'
                        : ' · not funded yet'}
                  </p>
                </div>
              </div>
              <span className="font-semibold">{money(m.amountCents)}</span>
            </div>

            {isOwner && hired && !m.released && (
              <div className="mt-3">
                {m.funded
                  ? <Release id={m.id} amount={money(m.amountCents)} />
                  : <Fund id={m.id} amount={money(m.amountCents)} />}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fund({ id, amount }: { id: string; amount: string }) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    fundMilestoneAction, null,
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="milestoneId" value={id} />
      <FormError>{state?.error}</FormError>
      <Pending idle={`Fund ${amount} into escrow`} busy="Funding…" variant="outline" />
    </form>
  );
}

function Release({ id, amount }: { id: string; amount: string }) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    releaseMilestoneAction, null,
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="milestoneId" value={id} />
      <FormError>{state?.error}</FormError>
      <Pending idle={`Release ${amount} to the freelancer`} busy="Releasing…"
        variant="primary" />
      <p className="text-xs text-ink-faint">
        Released payments cannot be pulled back. Check the work first.
      </p>
    </form>
  );
}

function Pending({ idle, busy, variant }: {
  idle: string; busy: string; variant: 'primary' | 'outline';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? busy : idle}
    </Button>
  );
}
