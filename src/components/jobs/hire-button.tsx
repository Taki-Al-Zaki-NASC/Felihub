'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { hireAction } from '@/server/actions/jobs';
import type { FormResult } from '@/server/actions/profile';

/**
 * Hiring moves real money into escrow, so the button says the amount rather
 * than "Hire" — v1's 22px unlabelled control was the single most consequential
 * thing in the product and the easiest to press by accident.
 */
export function HireButton({ proposalId, amount, name }: {
  proposalId: string;
  amount: string;
  name: string;
}) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    hireAction, null,
  );

  if (state?.ok) {
    return (
      <p className="text-sm font-semibold text-teal-deep">
        Hired. Escrow is funded and a message thread is open.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <FormError>{state?.error}</FormError>
      <Submit amount={amount} name={name} />
    </form>
  );
}

function Submit({ amount, name }: { amount: string; name: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? 'Funding escrow…' : `Hire ${name} — fund ${amount}`}
    </Button>
  );
}
