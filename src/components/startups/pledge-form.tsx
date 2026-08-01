'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextArea } from '@/components/ui/field';
import { money } from '@/lib/money';
import { pledgeAction } from '@/server/actions/raises';
import type { FormResult } from '@/server/actions/profile';

/**
 * Backing a raise.
 *
 * The amount leaves the wallet the moment this is submitted and sits in
 * escrow. That is deliberate and it is said on the button: a progress bar made
 * of unfunded promises tells a backer nothing, and "pledged" meaning "might
 * pay later" is how crowdfunding totals stop meaning anything.
 */
export function PledgeForm({
  raiseId, minPledgeCents, existingCents, verified, availableCents,
}: {
  raiseId: string;
  minPledgeCents: number;
  existingCents: number | null;
  verified: boolean;
  /** Wallet plus posting balance — both can fund a pledge, and a client whose
   *  money is all in the posting balance should not have to discover that from
   *  a rejection. */
  availableCents: number;
}) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    pledgeAction, null,
  );

  if (!verified) {
    return (
      <div className="rounded-md border border-border bg-neutral-tint p-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Lock className="h-4 w-4 text-ink-faint" /> Verification first
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Backing needs an identity-verified account, the same as posting and
          bidding. It is what makes the founder able to trust the money and you
          able to trust the founder.
        </p>
        <Button asChild variant="outline" className="mt-3 w-full">
          <Link href="/verify">Finish verification</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="raiseId" value={raiseId} />
      <FormError>{state?.error}</FormError>

      {state?.ok && (
        <p className="flex items-start gap-2 rounded-md border border-teal/30 bg-teal-tint px-3 py-2.5 text-sm text-teal-deep">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Pledged. It is held in escrow until the deadline, and comes straight
          back if the goal is missed.
        </p>
      )}

      {existingCents !== null && (
        <p className="rounded-md border border-border bg-neutral-tint px-3 py-2 text-sm text-ink-muted">
          You have already pledged <strong className="text-ink">{money(existingCents)}</strong>.
          Entering a larger amount increases it by the difference.
        </p>
      )}

      <Field label="Your pledge" name="amount" inputMode="decimal"
        placeholder={money(Math.max(minPledgeCents, 2500))}
        hint={`You have ${money(availableCents)} available. Taken now and `
          + 'refunded in full if the goal is missed.'} />

      <TextArea label="A note to the founder" name="note" rows={3} authored
        placeholder="Optional. Why you are backing this, or what you would want to know."
        hint="Only the founder reads this. It is never shown on the page." />

      {/* The row is the target, not the 16px box — same pattern as the
          "remember my email" control on the sign-in form. */}
      <label className="flex min-h-[40px] cursor-pointer items-start gap-2.5 py-1 text-sm">
        <input type="checkbox" name="anonymous"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong accent-teal" />
        <span className="text-ink-muted">
          Back anonymously — the amount still shows, your name does not.
        </span>
      </label>

      <Pledge existing={existingCents !== null} />
    </form>
  );
}

function Pledge({ existing }: { existing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" className="w-full" disabled={pending}>
      {pending ? 'Holding the funds…' : existing ? 'Increase my pledge' : 'Back this startup'}
    </Button>
  );
}
