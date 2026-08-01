'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Briefcase, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { saveExperienceAction } from '@/server/actions/profile';
import type { FormResult } from '@/server/actions/profile';
import type { ExperienceEntry } from '@/lib/experience';

const EMPTY: ExperienceEntry = { title: '', organisation: '', period: '', summary: '' };

/**
 * Work history.
 *
 * The profile page has always rendered this section; there was simply nowhere
 * to fill it in, so it was invisible on every profile. Same shape of mistake
 * as the profile photo: a field the product reads and never writes.
 */
export function ExperienceEditor({ initial }: { initial: ExperienceEntry[] }) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    saveExperienceAction, null,
  );
  const [rows, setRows] = React.useState<ExperienceEntry[]>(
    initial.length ? initial : [],
  );

  const update = (i: number, patch: Partial<ExperienceEntry>) =>
    setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  return (
    <form action={action} className="space-y-4">
      {/* Serialised once, on submit — the individual inputs are unnamed so a
          half-typed row cannot arrive as a separate field. */}
      <input type="hidden" name="experience" value={JSON.stringify(rows)} />

      <FormError>{state?.error}</FormError>

      {state?.ok && (
        <p role="status"
          className="flex items-center gap-2 rounded-md border border-teal/30 bg-teal-tint px-3 py-2.5 text-sm font-medium text-teal-deep">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Experience saved.
        </p>
      )}

      {rows.length === 0 && (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong px-6 py-8 text-center">
          <Briefcase className="h-5 w-5 text-ink-faint" />
          <p className="mt-3 text-sm text-ink-muted">
            Nothing here yet. Past roles are the fastest way to convince a
            client you have done this before.
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {rows.map((row, i) => (
          <li key={i} className="rounded-lg border border-border bg-neutral-tint p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Role {i + 1}
              </p>
              <button type="button" onClick={() => setRows((r) => r.filter((_, n) => n !== i))}
                aria-label={`Remove role ${i + 1}`}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-danger-tint hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Cell label="Job title" value={row.title}
                onChange={(v) => update(i, { title: v })}
                placeholder="Senior Flutter Developer" />
              <Cell label="Company or client" value={row.organisation}
                onChange={(v) => update(i, { organisation: v })}
                placeholder="Acme Logistics" />
            </div>

            <div className="mt-3">
              <Cell label="Period" value={row.period ?? ''}
                onChange={(v) => update(i, { period: v })}
                placeholder="2023 — 2025, or Mar 2024 — present" />
            </div>

            <div className="mt-3">
              <Summary value={row.summary ?? ''}
                onChange={(v) => update(i, { summary: v })} />
            </div>

            {state?.fieldErrors?.[String(i)] && (
              <p className="mt-2 text-sm text-danger">{state.fieldErrors[String(i)]}</p>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline"
          onClick={() => setRows((r) => [...r, { ...EMPTY }])}>
          <Plus className="h-4 w-4" /> Add a role
        </Button>
        <Save disabled={rows.length === 0 && initial.length === 0} />
      </div>
    </form>
  );
}

/** Its own component so `useId` can tie the label to the textarea — written
 *  inline it had no association at all, which left it unlabelled for anyone
 *  using a screen reader. */
function Summary({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  const id = React.useId();
  return (
    <>
      <label htmlFor={id} className="block text-sm font-semibold">
        What you did
        <span className="ml-1 font-normal text-ink-faint">(optional)</span>
      </label>
      <textarea id={id} rows={3} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="The problem, what you built, and what changed because of it."
        className="mt-1.5 block w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm leading-relaxed placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal" />
    </>
  );
}

function Cell({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <input id={id} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal" />
    </div>
  );
}

function Save({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending || disabled}>
      {pending ? 'Saving…' : 'Save experience'}
    </Button>
  );
}
