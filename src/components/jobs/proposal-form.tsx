'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextArea } from '@/components/ui/field';
import { submitProposalAction } from '@/server/actions/jobs';
import type { FormResult } from '@/server/actions/profile';

export function ProposalForm({
  jobId, existingBid, existingNote,
}: {
  jobId: string;
  existingBid?: string;
  existingNote?: string;
}) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    submitProposalAction, null,
  );
  const editing = Boolean(existingBid);

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
        hint="What you would charge for the whole job."
        error={state?.fieldErrors?.bid} />

      <TextArea label="Your approach" name="note" rows={6}
        defaultValue={existingNote}
        placeholder="How you would tackle it, what you have built like it, and how long you need."
        hint="The client reads this before your price."
        error={state?.fieldErrors?.note} />

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
