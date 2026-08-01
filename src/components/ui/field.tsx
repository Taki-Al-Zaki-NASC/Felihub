'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { provenanceField } from '@/lib/authorship/field';

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
  label, name, error, hint, className, authored, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  /**
   * Record how the text got here — typed, or pasted from somewhere else.
   *
   * "This arrived in one paste" is an observation about an event and can be
   * stated plainly to whoever reads the text. "This reads like a machine"
   * is a guess about a style and cannot. See src/lib/authorship/index.ts.
   */
  authored?: boolean;
}) {
  const id = React.useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Refs, not state: none of this should re-render anything as it changes.
  const stats = React.useRef({
    typed: 0, pasted: 0, largestPaste: 0, pastes: 0, corrections: 0,
    firstAt: 0, lastAt: 0,
  });
  const [provenance, setProvenance] = React.useState('');
  // Baseline for the length delta below. Starts at whatever is already in the
  // box: an existing bio being edited was not typed just now.
  const seen = React.useRef(String(props.defaultValue ?? '').length);

  const touch = () => {
    const now = Date.now();
    if (!stats.current.firstAt) stats.current.firstAt = now;
    stats.current.lastAt = now;
  };

  // Flushed on blur rather than per keystroke: the hidden input only has to be
  // right at submit time, and writing state on every character would make this
  // the most expensive component on the page.
  const flush = () => {
    const s = stats.current;
    setProvenance(JSON.stringify({
      typed: s.typed, pasted: s.pasted, largestPaste: s.largestPaste,
      pastes: s.pastes, corrections: s.corrections,
      activeMs: s.firstAt ? Math.max(0, s.lastAt - s.firstAt) : 0,
    }));
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Length only. What is on the clipboard is not read.
    const n = e.clipboardData.getData('text').length;
    if (n === 0) return;
    touch();
    stats.current.pasted += n;
    stats.current.pastes += 1;
    stats.current.largestPaste = Math.max(stats.current.largestPaste, n);
    // The pasted text has not landed in the field yet; keep the baseline in
    // step so the next input event does not read the paste as typing.
    seen.current += n;
    flush();
  };

  /**
   * The native `input` event, not React's `onBeforeInput`.
   *
   * React polyfills `onBeforeInput`, and what arrives is a `TextEvent` with no
   * `inputType` at all — so the first version of this counted every keystroke
   * as neither an insert nor a delete and reported `typed: 0` for text that had
   * been typed out by hand. The native `input` event carries a real
   * `InputEvent` with the field populated.
   *
   * The length delta is the fallback, and it is what actually does the work on
   * any browser where `inputType` is missing. It also keeps the count honest
   * for a multi-character insert like an autocomplete accept.
   */
  const onInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const native = e.nativeEvent as InputEvent;
    const type = native.inputType ?? '';
    const length = e.currentTarget.value.length;
    const delta = length - seen.current;
    seen.current = length;

    // Pastes and drops are counted in onPaste, where the size is known exactly.
    if (type.startsWith('insertFromPaste') || type === 'insertFromDrop') return;
    touch();
    if (delta < 0 || type.startsWith('delete')) stats.current.corrections += 1;
    else if (delta > 0) stats.current.typed += delta;
  };

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
        {...(authored ? { onPaste, onInput, onBlur: flush } : {})}
        {...props}
      />
      {authored && (
        <input type="hidden" name={provenanceField(name)} value={provenance} />
      )}
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
