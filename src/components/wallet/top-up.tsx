'use client';

import { useActionState } from 'react';
import { CheckCircle2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { topUpAction } from '@/server/actions/wallet';
import type { FormResult } from '@/server/actions/profile';

const AMOUNTS = [
  [50000, '$500'], [100000, '$1,000'], [250000, '$2,500'],
] as const;

export function TopUp() {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(
    topUpAction, null,
  );

  return (
    <form action={action} className="space-y-3">
      <FormError>{state?.error}</FormError>

      {state?.ok && (
        <p role="status"
          className="flex items-center gap-2 rounded-md border border-teal/30 bg-teal-tint px-3 py-2.5 text-sm font-medium text-teal-deep">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Added to your posting balance.
        </p>
      )}

      <p className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber-tint px-3 py-2.5 text-sm text-amber">
        <Gift className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Free during the beta — no card is charged and nothing is owed. It is
          recorded on your ledger as a beta credit, not a payment.
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        {AMOUNTS.map(([cents, label]) => (
          <Button key={cents} type="submit" name="amountCents" value={cents}
            variant="outline" disabled={pending}>
            {pending ? '…' : `Add ${label}`}
          </Button>
        ))}
      </div>
    </form>
  );
}
