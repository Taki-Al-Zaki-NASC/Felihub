'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { cancelRaiseAction } from '@/server/actions/raises';
import type { FormResult } from '@/server/actions/profile';

/**
 * Withdrawing a raise.
 *
 * Two steps, because it refunds every backer and cannot be undone — and the
 * confirmation says what will happen rather than asking "are you sure?", which
 * is a question nobody reads.
 */
export function CancelRaise({ raiseId }: { raiseId: string }) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    cancelRaiseAction, null,
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <>
        <FormError>{state?.error}</FormError>
        <Button variant="ghost" className="mt-3 w-full"
          onClick={() => setConfirming(true)}>
          Withdraw this raise
        </Button>
      </>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="raiseId" value={raiseId} />
      <FormError>{state?.error}</FormError>
      <p className="rounded-md border border-amber/30 bg-amber-tint px-3 py-2 text-sm text-amber">
        Every backer is refunded in full and the raise closes for good. You can
        publish a new one afterwards, starting from zero.
      </p>
      <Confirm />
      <Button type="button" variant="ghost" className="w-full"
        onClick={() => setConfirming(false)}>
        Keep it running
      </Button>
    </form>
  );
}

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" className="w-full" disabled={pending}>
      {pending ? 'Refunding backers…' : 'Withdraw and refund everyone'}
    </Button>
  );
}
