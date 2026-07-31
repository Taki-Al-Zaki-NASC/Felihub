'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A labelled input that shows its own error.
 *
 * The error is wired with `aria-describedby` and `aria-invalid` rather than
 * only turning the border red — v1 announced nothing to a screen reader, so a
 * rejected form was silent for anyone not looking at it.
 */
export function Field({
  label, name, error, hint, className, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}) {
  const id = React.useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'mt-1.5 block min-h-[44px] w-full rounded-md border bg-surface px-3 text-sm',
          'placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal',
          error ? 'border-danger' : 'border-border-strong',
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label, name, error, hint, className, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}) {
  const id = React.useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'mt-1.5 block w-full rounded-md border bg-surface px-3 py-2.5 text-sm leading-relaxed',
          'placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal',
          error ? 'border-danger' : 'border-border-strong',
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** A form-level failure: wrong password, no database, gateway down. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5 text-sm text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
