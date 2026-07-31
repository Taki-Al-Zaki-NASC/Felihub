'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { checkDocument } from '@/server/services/documents';
import { FREE_VERIFICATION, depositFor } from '@/server/services/verification';
import type { FormResult } from '@/server/actions/profile';

const schema = z.object({
  kind: z.enum(['PASSPORT', 'NID']),
  number: z.string().trim().min(4).max(40),
  fullName: z.string().trim().min(2, 'Enter your name exactly as printed.').max(120),
});

/**
 * Step one of verification: the document.
 *
 * Sets `idSubmitted` and moves the stage to ID_SUBMITTED. It deliberately does
 * not touch `depositPaid` — that is a separate fact, cleared by a separate
 * path, and the account is not verified until both are true. Keeping them
 * apart is what makes `isVerified` meaningful.
 */
export async function submitDocumentAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    kind: form.get('kind'),
    number: form.get('number'),
    fullName: form.get('fullName'),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? 'form')] ??= issue.message;
    }
    return { fieldErrors };
  }

  const { kind, number, fullName } = parsed.data;

  // The real check. A number that cannot exist is refused here rather than
  // sitting in a review queue.
  const result = checkDocument(kind, number);
  if (!result.ok) return { fieldErrors: { number: result.reason! } };

  await db.user.update({
    where: { id: user.id },
    data: {
      idSubmitted: true,
      kycStage: 'ID_SUBMITTED',
      displayName: user.displayName || fullName,
    },
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Step two: the deposit.
 *
 * During the beta the amount is zero, so this records a completed
 * zero-value intent and a ledger row rather than sending anyone to a gateway.
 * The important part is that the *account* still does not decide it has paid:
 * this action writes a PaymentIntent as the platform, exactly where the
 * gateway webhook will write one later, and only that record flips
 * `depositPaid`.
 */
export async function clearDepositAction(
  _prev: FormResult | null,
  _form: FormData,
): Promise<FormResult> {
  const user = await requireUser();

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { idSubmitted: true, depositPaid: true, role: true },
  });
  if (!record) return { error: 'Account not found.' };
  if (!record.idSubmitted) {
    return { error: 'Submit your document first — verification is both steps.' };
  }
  if (record.depositPaid) redirect('/dashboard');

  if (!FREE_VERIFICATION) {
    return {
      error: 'Paid verification is handled by the payment gateway; this action '
        + 'is only for the free beta.',
    };
  }

  const deposit = depositFor(record.role);

  await db.$transaction(async (tx) => {
    const intent = await tx.paymentIntent.create({
      data: {
        userId: user.id,
        purpose: 'DEPOSIT',
        amountCents: 0,
        status: 'PAID',
        paidAt: new Date(),
        gatewayRef: `beta-free:${user.id}`,
      },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        depositPaid: true,
        depositCents: 0,
        depositKind: deposit.kind,
        kycStage: 'VERIFIED',
        // A hirer's posting balance is the deposit; during the beta they are
        // granted the same balance they would have paid for, so escrow can
        // actually be funded and the flow is testable end to end.
        postingBalanceCents: record.role === 'FREELANCER' ? 0 : deposit.cents,
      },
    });

    await tx.profile.updateMany({
      where: { userId: user.id },
      data: { verified: true },
    });

    await tx.ledgerEntry.create({
      data: {
        userId: user.id,
        kind: 'DEPOSIT',
        amountCents: record.role === 'FREELANCER' ? 0 : deposit.cents,
        label: `${deposit.label} — free during beta (intent ${intent.id})`,
      },
    });
  });

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
