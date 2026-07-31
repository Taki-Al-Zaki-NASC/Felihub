'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { FREE_VERIFICATION } from '@/server/services/verification';
import { money } from '@/lib/money';
import type { FormResult } from '@/server/actions/profile';

/**
 * Topping up the posting balance.
 *
 * Escrow is funded out of the posting balance, so without a way to add to it a
 * hirer is capped at their opening deposit and can never hire on anything
 * larger. That is a dead end, and walking the product as a client is how it
 * surfaced.
 *
 * The payment gateway is not wired yet, so during the beta this credits the
 * balance directly and says so on the ledger — "beta credit", not "payment".
 * When the gateway lands, this action becomes the thing that *starts* a
 * PaymentIntent, and the webhook credits the balance instead. The escrow
 * mechanics either side of it do not change.
 */
const schema = z.object({
  amountCents: z.number().int()
    .min(1000, 'The smallest top-up is $10.')
    .max(500000, 'The largest top-up is $5,000.'),
});

export async function topUpAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();

  if (user.role === 'FREELANCER') {
    return { error: 'Freelancer accounts do not have a posting balance.' };
  }
  if (!user.isVerified) {
    return { error: 'Finish verification first.' };
  }
  if (!FREE_VERIFICATION) {
    return {
      error: 'Top-ups go through the payment gateway. This action only runs '
        + 'during the beta.',
    };
  }

  const parsed = schema.safeParse({
    amountCents: Number(form.get('amountCents')),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { amountCents } = parsed.data;

  await db.$transaction(async (tx) => {
    const intent = await tx.paymentIntent.create({
      data: {
        userId: user.id,
        purpose: 'TOPUP',
        amountCents: 0,
        status: 'PAID',
        paidAt: new Date(),
        gatewayRef: `beta-credit:${user.id}:${Date.now()}`,
      },
      select: { id: true },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { postingBalanceCents: { increment: amountCents } },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: user.id,
        kind: 'DEPOSIT',
        amountCents,
        label: `Beta credit — ${money(amountCents)} added free, no payment taken `
          + `(intent ${intent.id})`,
      },
    });
  });

  revalidatePath('/wallet');
  revalidatePath('/dashboard');
  return { ok: true };
}
