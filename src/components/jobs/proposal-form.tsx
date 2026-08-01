'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextArea } from '@/components/ui/field';
import { submitProposalAction } from '@/server/actions/jobs';
import type { FormResult } from '@/server/actions/profile';

export function ProposalForm({
  jobId, existingBid, existingNote, existingTimeline, existingAttachment,
  revisionsUsed = 0, maxRevisions = 2,
}: {
  jobId: string;
  existingBid?: string;
  existingNote?: string;
  existingTimeline?: number;
  existingAttachment?: string;
  revisionsUsed?: number;
  maxRevisions?: number;
}) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    submitProposalAction, null,
  );
  const editing = Boolean(existingBid);
  const left = maxRevisions - revisionsUsed;
  const locked = editing && left <= 0;

  if (locked) {
    return (
      <div className="rounded-md border border-border bg-neutral-tint p-4 text-sm">
        <p className="font-semibold">Your bid is final.</p>
        <p className="mt-1 text-ink-muted">
          You have used all {maxRevisions} revisions. Message the client if
          something material has changed.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="jobId" value={jobId} />
      <FormError>{state?.error}</FormError>

      {state?.ok && (
        <p role="status"
          className="flex items-center gap-2 rounded-md border border-teal/30 bg-teal-tint px-3 py-2.5 text-sm font-medium text-teal-deep">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {editing ? 'Your bid was updated.' : 'Your bid was sent.'}
        </p>
      )}

      <Field label="Your price" name="bid" inputMode="decimal"
        defaultValue={existingBid} placeholder="$1,000"
        hint="What you would charge for the whole job. Private to the client."
        error={state?.fieldErrors?.bid} />

      <TextArea label="Your approach" name="note" rows={6} authored
        defaultValue={existingNote}
        placeholder="How you would tackle it, and what you have built like it."
        hint="Only the client reads this. Other freelancers cannot see it."
        error={state?.fieldErrors?.note} />

      <Field label="Delivery time" name="timelineDays" inputMode="numeric"
        defaultValue={existingTimeline != null ? String(existingTimeline) : ''}
        placeholder="14"
        hint="Days from the first funded milestone. Optional."
        error={state?.fieldErrors?.timelineDays} />

      <Field label="Attachment" name="attachmentUrl" type="url"
        defaultValue={existingAttachment}
        placeholder="https://…"
        hint="A link to a relevant piece of work. Optional, and private to the client."
        error={state?.fieldErrors?.attachmentUrl} />

      {editing && (
        <p className="text-xs text-ink-muted">
          {left} {left === 1 ? 'revision' : 'revisions'} left.
        </p>
      )}

      <Submit editing={editing} />
    </form>
  );
}

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? 'Sending…' : editing ? 'Update bid' : 'Submit proposal'}
    </Button>
  );
}
