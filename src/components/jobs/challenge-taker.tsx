'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, Clock, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError, TextArea } from '@/components/ui/field';
import { submitChallengeAction } from '@/server/actions/challenge';
import type { FormResult } from '@/server/actions/profile';

/**
 * Taking the challenge.
 *
 * Note what this component never receives: the answer key. The quiz is graded
 * on the server against a column that is not in the payload, so there is
 * nothing here to read out of the page source.
 */
export function ChallengeTaker({
  jobId, mode, prompt, questions, attemptsUsed, maxAttempts, timeLimitMins,
}: {
  jobId: string;
  mode: string;
  prompt: string | null;
  questions: { prompt: string; options: string[] }[];
  attemptsUsed: number;
  maxAttempts: number;
  timeLimitMins: number | null;
}) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    submitChallengeAction, null,
  );
  const [picks, setPicks] = React.useState<number[]>(
    () => Array.from({ length: questions.length }, () => -1),
  );

  const left = maxAttempts - attemptsUsed;

  if (left <= 0) {
    return (
      <div className="rounded-lg border border-border bg-neutral-tint p-5 text-sm">
        <p className="font-semibold">You have used all {maxAttempts} attempts.</p>
        <p className="mt-1 text-ink-muted">
          The client sees your best score. Nothing more to do here.
        </p>
      </div>
    );
  }

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-teal/30 bg-teal-tint p-5">
        <p className="flex items-center gap-2 font-semibold text-teal-deep">
          <CheckCircle2 className="h-4 w-4" /> Submitted.
        </p>
        <p className="mt-1 text-sm text-teal-deep/80">
          {left - 1 > 0
            ? `You have ${left - 1} attempt left if you want to improve on it.`
            : 'That was your last attempt.'}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="jobId" value={jobId} />
      {mode === 'QUIZ' && (
        <input type="hidden" name="picks" value={JSON.stringify(picks)} />
      )}

      <FormError>{state?.error}</FormError>

      <div className="flex flex-wrap gap-3 rounded-md border border-border bg-neutral-tint px-4 py-3 text-sm text-ink-muted">
        <span className="flex items-center gap-1.5">
          <EyeOff className="h-3.5 w-3.5" />
          {mode === 'QUIZ'
            ? 'The client sees your score, never your answers.'
            : 'The client sees a short preview, never your full answer.'}
        </span>
        {timeLimitMins && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Suggested {timeLimitMins} minutes
          </span>
        )}
        <span className="ml-auto font-medium">
          Attempt {attemptsUsed + 1} of {maxAttempts}
        </span>
      </div>

      {prompt && (
        <p className="whitespace-pre-wrap rounded-md border border-border bg-surface p-4 text-sm leading-relaxed">
          {prompt}
        </p>
      )}

      {mode === 'QUIZ' ? (
        <ol className="space-y-5">
          {questions.map((q, i) => (
            <li key={i} className="rounded-lg border border-border bg-surface p-4">
              <fieldset>
                <legend className="font-semibold">
                  {i + 1}. {q.prompt}
                </legend>
                <ul className="mt-3 space-y-2">
                  {q.options.map((opt, o) => (
                    <li key={o}>
                      <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border px-3 text-sm
                        ${picks[i] === o
                          ? 'border-teal bg-teal-tint'
                          : 'border-border-strong hover:bg-backdrop'}`}>
                        <input type="radio" name={`q${i}`} checked={picks[i] === o}
                          onChange={() => setPicks((p) =>
                            p.map((v, n) => (n === i ? o : v)))}
                          className="h-4 w-4 shrink-0 accent-teal" />
                        {opt}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            </li>
          ))}
        </ol>
      ) : (
        <TextArea label="Your answer" name="fullAnswer" rows={14}
          placeholder="Take your time. This is what convinces them."
          hint="At least a paragraph. Only a short preview reaches the client."
          error={state?.fieldErrors?.fullAnswer} />
      )}

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}>
      {pending ? 'Submitting…' : 'Submit attempt'}
    </Button>
  );
}
