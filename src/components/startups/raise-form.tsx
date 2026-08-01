'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextArea } from '@/components/ui/field';
import { CATEGORIES } from '@/lib/categories';
import { money, parseMoney } from '@/lib/money';
import { publishRaiseAction } from '@/server/actions/raises';
import { MAX_DAYS, MIN_DAYS, STAGES, STAGE_LABELS } from '@/server/services/raises';
import type { FormResult } from '@/server/actions/profile';

/**
 * Publishing a raise.
 *
 * The use-of-funds lines have to sum to the goal, and the running total is
 * shown live rather than reported after a failed submit — the same rule and
 * the same treatment as job milestones, because "your numbers do not add up"
 * is much cheaper to learn while typing than after pressing publish.
 */
export function RaiseForm() {
  const [state, action] = useActionState<FormResult | null, FormData>(
    publishRaiseAction, null,
  );
  const [goal, setGoal] = useState('');
  const [lines, setLines] = useState<{ label: string; amount: string }[]>([
    { label: '', amount: '' },
    { label: '', amount: '' },
  ]);
  const fieldError = (k: string) => state?.fieldErrors?.[k];

  const goalCents = parseMoney(goal) ?? 0;
  const total = lines.reduce((t, l) => t + (parseMoney(l.amount) ?? 0), 0);
  const gap = goalCents - total;

  const setLine = (i: number, patch: Partial<{ label: string; amount: string }>) =>
    setLines((cur) => cur.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError>{state?.error}</FormError>

      <Field label="What are you building?" name="title"
        placeholder="A Bengali-first bookkeeping app for small shops"
        hint="One line. This is what people see on the list."
        error={fieldError('title')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-sm font-semibold">
            Category
          </label>
          <select id="category" name="category" defaultValue=""
            className="mt-1.5 min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
            <option value="" disabled>Choose one</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {fieldError('category') && (
            <p className="mt-1.5 text-sm text-danger">{fieldError('category')}</p>
          )}
        </div>
        <div>
          <label htmlFor="stage" className="block text-sm font-semibold">
            How far along
          </label>
          <select id="stage" name="stage" defaultValue="IDEA"
            className="mt-1.5 min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <TextArea label="The pitch" name="summary" rows={10} authored
        placeholder="What it does, who it is for, why now, and why you."
        hint="At least 200 characters. Somebody is being asked for money on the strength of this."
        error={fieldError('summary')} />

      <TextArea label="Where it is today" name="traction" rows={4} authored
        placeholder="Users, revenue, a working prototype, letters of intent — or plainly that it is still an idea."
        hint="Optional, and the most-read section on the page. Saying “nothing yet” is better than implying more."
        error={fieldError('traction')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Goal" name="goal" inputMode="decimal"
          value={goal} onChange={(e) => setGoal(e.target.value)}
          placeholder="$5,000"
          hint="All or nothing — you get it only if you reach this."
          error={fieldError('goalCents')} />
        <Field label="Days to raise" name="days" inputMode="numeric"
          defaultValue="30"
          placeholder="30"
          hint={`${MIN_DAYS}–${MAX_DAYS}. Shorter raises do better.`}
          error={fieldError('days')} />
      </div>

      <Field label="Website" name="websiteUrl" type="url"
        placeholder="https://example.com"
        hint="Optional."
        error={fieldError('websiteUrl')} />

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="block text-sm font-semibold">What the money is for</span>
          <span className={`text-xs tabular-nums ${
            goalCents > 0 && gap === 0 ? 'font-semibold text-teal-deep' : 'text-ink-muted'
          }`}>
            {money(total)} of {money(goalCents)}
            {goalCents > 0 && gap !== 0
              && ` · ${gap > 0 ? `${money(gap)} unaccounted` : `${money(-gap)} over`}`}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          These have to add up to the goal exactly. A backer is entitled to see
          the whole amount accounted for.
        </p>

        <div className="mt-2 space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <input
                aria-label={`What line ${i + 1} buys`}
                value={line.label}
                onChange={(e) => setLine(i, { label: e.target.value })}
                placeholder="Six months of a backend engineer"
                className="min-h-[44px] min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
              <input
                aria-label={`Amount for line ${i + 1}`}
                value={line.amount}
                onChange={(e) => setLine(i, { amount: e.target.value })}
                inputMode="decimal"
                placeholder="$3,000"
                className="min-h-[44px] w-28 shrink-0 rounded-md border border-border-strong bg-surface px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-teal" />
              {lines.length > 1 && (
                <button type="button"
                  onClick={() => setLines((c) => c.filter((_, n) => n !== i))}
                  aria-label={`Remove line ${i + 1}`}
                  className="min-h-[44px] shrink-0 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-backdrop">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="button"
          onClick={() => setLines((c) => [...c, { label: '', amount: '' }])}
          className="mt-2 min-h-[36px] text-sm font-semibold text-teal-deep hover:underline">
          + Add a line
        </button>

        {/* The real payload: one `label|amount` per line, parsed server-side.
            The visible inputs are unnamed so a half-typed row cannot be
            submitted as if it were finished. */}
        <input type="hidden" name="useOfFunds"
          value={lines
            .filter((l) => l.label.trim())
            .map((l) => `${l.label.trim()}|${l.amount.trim()}`)
            .join('\n')} />

        {fieldError('useOfFunds') && (
          <p className="mt-1.5 text-sm text-danger">{fieldError('useOfFunds')}</p>
        )}
      </div>

      <Publish />
    </form>
  );
}

function Publish() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Publishing…' : 'Publish this raise'}
    </Button>
  );
}
