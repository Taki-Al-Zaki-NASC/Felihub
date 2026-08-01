'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError, TextArea } from '@/components/ui/field';
import {
  CHALLENGE_MODES, MAX_QUESTIONS, OPTIONS_PER_QUESTION, modeLabel,
  type ChallengeMode,
} from '@/lib/challenge';
import { createChallengeAction } from '@/server/actions/challenge';
import type { FormResult } from '@/server/actions/profile';

interface Draft { prompt: string; options: string[]; correct: number }

const blank = (): Draft => ({
  prompt: '',
  options: Array.from({ length: OPTIONS_PER_QUESTION }, () => ''),
  correct: 0,
});

/**
 * Where a client sets the challenge for their own job.
 *
 * The correct answer is chosen here and travels to the server with the
 * questions, but is stored in a separate column and never returned to any page
 * an applicant can load.
 */
export function ChallengeBuilder({ jobId, existingMode }: {
  jobId: string;
  existingMode?: string;
}) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    createChallengeAction, null,
  );
  const [mode, setMode] = React.useState<ChallengeMode>(
    (existingMode as ChallengeMode) ?? 'QUIZ',
  );
  const [questions, setQuestions] = React.useState<Draft[]>([blank()]);

  const update = (i: number, patch: Partial<Draft>) =>
    setQuestions((q) => q.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  const setOption = (i: number, o: number, value: string) =>
    setQuestions((q) => q.map((row, n) => n === i
      ? { ...row, options: row.options.map((v, k) => (k === o ? value : v)) }
      : row));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      <FormError>{state?.error}</FormError>
      {state?.ok && (
        <p role="status"
          className="flex items-center gap-2 rounded-md border border-teal/30 bg-teal-tint px-3 py-2.5 text-sm font-medium text-teal-deep">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Challenge saved.
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-semibold">Kind of challenge</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CHALLENGE_MODES.map((m) => (
            <label key={m}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-medium
                ${mode === m
                  ? 'border-teal bg-teal-tint text-teal-deep ring-1 ring-teal'
                  : 'border-border-strong bg-surface hover:bg-backdrop'}`}>
              <input type="radio" name="mode" value={m} checked={mode === m}
                onChange={() => setMode(m)} className="sr-only" />
              {modeLabel(m)}
            </label>
          ))}
        </div>
      </fieldset>

      {mode === 'QUIZ' ? (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Questions</span>
            <span className="text-xs text-ink-faint">
              {questions.length} / {MAX_QUESTIONS}
            </span>
          </div>
          <ul className="mt-2 space-y-4">
            {questions.map((q, i) => (
              <li key={i} className="rounded-lg border border-border bg-neutral-tint p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Question {i + 1}
                  </span>
                  <button type="button" disabled={questions.length === 1}
                    onClick={() => setQuestions((qs) => qs.filter((_, n) => n !== i))}
                    aria-label={`Remove question ${i + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-danger-tint hover:text-danger disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input value={q.prompt}
                  onChange={(e) => update(i, { prompt: e.target.value })}
                  placeholder="What does `flutter build apk --split-per-abi` produce?"
                  aria-label={`Question ${i + 1}`}
                  className="mt-2 block min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal" />

                <p className="mt-3 text-xs font-semibold text-ink-muted">
                  Options — select the correct one
                </p>
                <ul className="mt-1.5 space-y-2">
                  {q.options.map((opt, o) => (
                    <li key={o} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${i}`} checked={q.correct === o}
                        onChange={() => update(i, { correct: o })}
                        aria-label={`Question ${i + 1}, option ${o + 1} is correct`}
                        className="h-4 w-4 shrink-0 accent-teal" />
                      <input value={opt}
                        onChange={(e) => setOption(i, o, e.target.value)}
                        placeholder={`Option ${o + 1}`}
                        aria-label={`Question ${i + 1}, option ${o + 1}`}
                        className="block min-h-[40px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-teal" />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {state?.fieldErrors?.questions && (
            <p className="mt-2 text-sm text-danger">{state.fieldErrors.questions}</p>
          )}
          <Button type="button" variant="outline" size="sm" className="mt-3"
            disabled={questions.length >= MAX_QUESTIONS}
            onClick={() => setQuestions((qs) => [...qs, blank()])}>
            <Plus className="h-3.5 w-3.5" /> Add question
          </Button>
        </div>
      ) : (
        <TextArea
          label={mode === 'LIVE' ? 'What you will ask about' : 'The brief'}
          name="prompt" rows={5}
          placeholder={mode === 'LIVE'
            ? 'The areas you want to cover in the interview.'
            : 'The problem to solve, and what a good answer contains.'}
          hint={mode === 'LIVE'
            ? 'Shown to applicants so they can prepare.'
            : 'Their full answer stays private to them; you see a short preview.'}
          error={state?.fieldErrors?.prompt} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="maxAttempts" className="block text-sm font-semibold">
            Attempts allowed
          </label>
          <select id="maxAttempts" name="maxAttempts" defaultValue="2"
            className="mt-1.5 min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
          <p className="mt-1.5 text-xs text-ink-muted">
            Two is the maximum. More and the score converges on the answer key.
          </p>
        </div>

        {mode === 'LIVE' ? (
          <div>
            <label htmlFor="scheduledAt" className="block text-sm font-semibold">
              Interview time
            </label>
            <input id="scheduledAt" name="scheduledAt" type="datetime-local"
              className="mt-1.5 block min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
            {state?.fieldErrors?.scheduledAt && (
              <p className="mt-1.5 text-sm text-danger">{state.fieldErrors.scheduledAt}</p>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="timeLimitMins" className="block text-sm font-semibold">
              Time limit <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <input id="timeLimitMins" name="timeLimitMins" type="number"
              min={5} max={240} placeholder="30"
              className="mt-1.5 block min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
            <p className="mt-1.5 text-xs text-ink-muted">Minutes.</p>
          </div>
        )}
      </div>

      <Save />
    </form>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save challenge'}
    </Button>
  );
}
