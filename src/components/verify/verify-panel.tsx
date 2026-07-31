'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { BadgeCheck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { checkDocument, type DocumentKind } from '@/server/services/documents';
import {
  clearDepositAction, submitDocumentAction,
} from '@/server/actions/verification';
import type { FormResult } from '@/server/actions/profile';

/**
 * Verification, both steps on one screen so the account can see it is halfway
 * rather than wondering why it is still blocked.
 *
 * The document number is checked in the browser as it is typed *and* again on
 * the server. The browser copy exists to give instant feedback; the server copy
 * is the one that decides.
 */
export function VerifyPanel({
  idSubmitted, depositPaid, depositLabel, depositExplain, freeBeta,
}: {
  idSubmitted: boolean;
  depositPaid: boolean;
  depositLabel: string;
  depositExplain: string;
  freeBeta: boolean;
}) {
  return (
    <div className="space-y-4">
      <Step n={1} title="Your identity document" done={idSubmitted}>
        {idSubmitted
          ? <p className="text-sm text-ink-muted">Received. Nothing more to do here.</p>
          : <DocumentForm />}
      </Step>

      <Step n={2} title={depositLabel} done={depositPaid}>
        <p className="text-sm text-ink-muted">{depositExplain}</p>
        {depositPaid ? (
          <p className="mt-3 text-sm text-ink-muted">Cleared.</p>
        ) : freeBeta ? (
          <DepositForm enabled={idSubmitted} />
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            You will be sent to the payment provider to complete this.
          </p>
        )}
      </Step>
    </div>
  );
}

function Step({ n, title, done, children }: {
  n: number; title: string; done: boolean; children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border p-5 ${done ? 'border-teal/30 bg-teal-tint/40' : 'border-border bg-surface'}`}>
      <h2 className="flex items-center gap-2.5 font-serif text-base font-semibold">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
          ${done ? 'bg-teal text-white' : 'bg-ink-strong text-canvas'}`}>
          {done ? '✓' : n}
        </span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DocumentForm() {
  const [state, action] = useActionState<FormResult | null, FormData>(
    submitDocumentAction, null,
  );
  const [kind, setKind] = React.useState<DocumentKind>('NID');
  const [number, setNumber] = React.useState('');

  // Live feedback, but only once there is enough typed to judge — telling
  // someone their number is wrong after two characters is just noise.
  const live = number.trim().length >= 6 ? checkDocument(kind, number) : null;
  const serverError = state?.fieldErrors?.number;

  if (state?.ok) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-medium text-teal-deep">
        <CheckCircle2 className="h-4 w-4" /> Document received.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError>{state?.error}</FormError>

      <fieldset>
        <legend className="text-sm font-semibold">Document type</legend>
        <div className="mt-2 flex gap-2">
          {(['NID', 'PASSPORT'] as const).map((k) => (
            <label key={k}
              className={`flex min-h-[40px] cursor-pointer items-center rounded-md border px-4 text-sm font-medium
                ${kind === k
                  ? 'border-teal bg-teal-tint text-teal-deep'
                  : 'border-border-strong bg-surface hover:bg-backdrop'}`}>
              <input type="radio" name="kind" value={k} checked={kind === k}
                onChange={() => setKind(k)} className="sr-only" />
              {k === 'NID' ? 'National ID' : 'Passport'}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Full name as printed" name="fullName" autoComplete="name"
        error={state?.fieldErrors?.fullName} />

      <div>
        <Field
          label={kind === 'NID' ? 'NID number' : 'Passport number'}
          name="number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode={kind === 'NID' ? 'numeric' : 'text'}
          placeholder={kind === 'NID' ? '1990 1234 5678 90123' : 'L898902C3'}
          hint={kind === 'NID'
            ? '10, 13 or 17 digits.'
            : 'From the bottom line of the photo page, including the check digit if you have it.'}
          error={serverError ?? (live && !live.ok ? live.reason : undefined)}
        />
        {live?.ok && !serverError && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-teal-deep">
            <BadgeCheck className="h-3.5 w-3.5" />
            {live.notes?.[0] ?? 'Number format checks out.'}
          </p>
        )}
      </div>

      <Submit idle="Submit document" busy="Submitting…"
        disabled={Boolean(live && !live.ok)} />
    </form>
  );
}

function DepositForm({ enabled }: { enabled: boolean }) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    clearDepositAction, null,
  );
  return (
    <form action={action} className="mt-4 space-y-3">
      <FormError>{state?.error}</FormError>
      <p className="flex items-center gap-2 rounded-md border border-teal/30 bg-teal-tint px-3 py-2.5 text-sm text-teal-deep">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Free while Felicek is in beta — no card needed.
      </p>
      <Submit idle="Complete verification" busy="Finishing…" disabled={!enabled} />
      {!enabled && (
        <p className="text-xs text-ink-muted">Submit your document first.</p>
      )}
    </form>
  );
}

function Submit({ idle, busy, disabled }: {
  idle: string; busy: string; disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending || disabled}>
      {pending ? busy : idle}
    </Button>
  );
}
