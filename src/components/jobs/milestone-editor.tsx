'use client';

import * as React from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, parseMoney } from '@/lib/money';
import { MAX_MILESTONES } from '@/lib/milestones';

interface Row { label: string; amount: string }

/**
 * The milestone breakdown, required on every job.
 *
 * It shows the running total against the budget as you type, because the two
 * disagreeing is the whole reason a client would get this wrong — and finding
 * out on submit, after writing five rows, is the worst moment to be told.
 */
export function MilestoneEditor({ budget, error }: {
  budget: string;
  error?: string;
}) {
  const [rows, setRows] = React.useState<Row[]>([
    { label: '', amount: '' },
  ]);

  const budgetCents = parseMoney(budget);
  const totalCents = rows.reduce((t, r) => t + (parseMoney(r.amount) ?? 0), 0);
  const difference = budgetCents == null ? null : budgetCents - totalCents;

  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  const payload = rows.map((r) => ({
    label: r.label.trim(),
    amountCents: parseMoney(r.amount) ?? 0,
  }));

  /** Divides the budget evenly, remainder on the first row so the parts always
   *  add back up to the whole — the rounding has to land somewhere. */
  const split = () => {
    if (budgetCents == null || rows.length === 0) return;
    const each = Math.floor(budgetCents / rows.length);
    const remainder = budgetCents - each * rows.length;
    setRows((r) => r.map((row, i) => ({
      ...row,
      amount: money(each + (i === 0 ? remainder : 0)),
    })));
  };

  return (
    <div>
      <input type="hidden" name="milestones" value={JSON.stringify(payload)} />

      <div className="flex items-baseline justify-between gap-2">
        <label className="block text-sm font-semibold">Milestones</label>
        <span className="text-xs text-ink-faint">{rows.length} / {MAX_MILESTONES}</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Required. Escrow is funded and released one milestone at a time, so
        neither side is ever carrying the whole job.
      </p>

      <ul className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-3 hidden text-ink-faint sm:block" aria-hidden>
              <GripVertical className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <input
                value={row.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder={i === 0 ? 'Designs signed off' : 'What this delivers'}
                aria-label={`Milestone ${i + 1} deliverable`}
                className="block min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal" />
            </div>
            <input
              value={row.amount}
              onChange={(e) => update(i, { amount: e.target.value })}
              inputMode="decimal"
              placeholder="$400"
              aria-label={`Milestone ${i + 1} amount`}
              className="block min-h-[44px] w-28 shrink-0 rounded-md border border-border-strong bg-surface px-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal" />
            <button type="button"
              onClick={() => setRows((r) => r.filter((_, n) => n !== i))}
              disabled={rows.length === 1}
              aria-label={`Remove milestone ${i + 1}`}
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-danger-tint hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-faint">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm"
          disabled={rows.length >= MAX_MILESTONES}
          onClick={() => setRows((r) => [...r, { label: '', amount: '' }])}>
          <Plus className="h-3.5 w-3.5" /> Add milestone
        </Button>
        {budgetCents != null && (
          <Button type="button" variant="ghost" size="sm" onClick={split}>
            Split the budget evenly
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-neutral-tint px-3 py-2.5 text-sm">
        <span className="text-ink-muted">Milestones total</span>
        <span className="font-semibold">{money(totalCents)}</span>
      </div>

      {difference !== null && difference !== 0 && (
        <p className={`mt-1.5 text-sm ${difference > 0 ? 'text-amber' : 'text-danger'}`}>
          {difference > 0
            ? `${money(difference)} of the budget is not covered by a milestone.`
            : `Milestones exceed the budget by ${money(-difference)}.`}
        </p>
      )}

      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
