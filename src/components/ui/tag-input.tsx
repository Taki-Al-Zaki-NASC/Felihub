'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Skills as chips, the way every marketplace does it.
 *
 * A comma-separated text field looks like it works and then quietly does not:
 * people type "Flutter and TypeScript", or trailing commas, or one 40-word
 * sentence — and it all becomes a "skill" that nobody can ever search for. A
 * chip commits on Enter, so what will be stored is visible before it is.
 *
 * The real value still submits as a comma-joined string in a hidden input, so
 * the Server Action's parsing is unchanged and the form degrades to a normal
 * POST if the component never hydrates.
 */
export function TagInput({
  label, name, defaultValue = [], placeholder, hint, error, max = 15, suggestions,
}: {
  label: string;
  name: string;
  defaultValue?: string[];
  placeholder?: string;
  hint?: string;
  error?: string;
  max?: number;
  suggestions?: readonly string[];
}) {
  const id = React.useId();
  const [tags, setTags] = React.useState<string[]>(defaultValue);
  const [draft, setDraft] = React.useState('');
  const [notice, setNotice] = React.useState<string>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    // Pasting "Flutter, Dart, Firebase" should produce three chips, not one.
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;

    setTags((current) => {
      const next = [...current];
      for (const part of parts) {
        const value = part.slice(0, 40);
        if (next.length >= max) { setNotice(`That is the maximum of ${max}.`); break; }
        if (next.some((t) => t.toLowerCase() === value.toLowerCase())) {
          setNotice(`“${value}” is already there.`);
          continue;
        }
        next.push(value);
        setNotice(undefined);
      }
      return next;
    });
    setDraft('');
  };

  const remove = (value: string) => {
    setTags((current) => current.filter((t) => t !== value));
    setNotice(undefined);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      // Enter inside a form submits it. Here it means "commit this chip".
      e.preventDefault();
      add(draft);
      return;
    }
    if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  };

  const unused = suggestions?.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  ).slice(0, 6);

  return (
    <div>
      {/* The real payload. The visible input is never named, so a stray draft
          cannot be submitted as if it were committed. */}
      <input type="hidden" name={name} value={tags.join(', ')} />

      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>

      <div className={cn(
        'mt-1.5 flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-md border bg-surface p-1.5',
        'focus-within:ring-2 focus-within:ring-teal',
        error ? 'border-danger' : 'border-border-strong',
      )}>
        {tags.map((tag) => (
          <span key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-teal-tint py-1 pl-2.5 pr-1 text-sm font-medium text-teal-deep">
            <span className="truncate">{tag}</span>
            <button type="button" onClick={() => remove(tag)}
              aria-label={`Remove ${tag}`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-teal/20">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          // Committing on blur too: people type a skill and click Save, and
          // losing it silently is worse than any keyboard convention.
          onBlur={() => add(draft)}
          placeholder={tags.length === 0 ? placeholder : 'Add another…'}
          aria-describedby={`${id}-hint`}
          className="min-w-[10ch] flex-1 border-0 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-ink-faint"
        />
      </div>

      {unused && unused.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="rounded-full border border-border-strong px-2.5 py-1 text-xs font-medium text-ink-muted hover:border-teal hover:bg-teal-tint hover:text-teal-deep">
              + {s}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {notice ?? hint ?? 'Type a skill and press Enter.'}
        </p>
      )}
    </div>
  );
}
