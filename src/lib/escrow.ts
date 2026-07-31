import {
  collection, doc, increment, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { firebase } from './firebase';
import { milestoneCents, type Job, type Proposal } from './schema';
import { LOCAL, gatewayCharge, PLATFORM_RATE } from './fees';
import { chatIdFor, openThread } from './mutations';
import { notify } from './notifications';

/** Thrown when the client cannot cover the bid. Carries a usable sentence. */
export class InsufficientPostingBalance extends Error {}

/**
 * Hires a freelancer and funds escrow, ported from EngagementRepository.hire.
 *
 * One transaction: debit the client's posting balance, accept the proposal,
 * mark the job filled and hold the escrow. All of it or none — a double-tapped
 * Hire must not debit twice, and a partial write would leave a job marked
 * filled with nothing behind it.
 *
 * The balance is read *inside* the transaction, so two hires racing against
 * the same balance cannot both pass the check.
 */
export async function hire(job: Job, proposal: Proposal, meName: string) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');

  const bid = proposal.bidAmountCents ?? 0;
  if (bid <= 0) throw new Error('That proposal has no bid amount.');

  const chatId = await openThread({
    meId: job.ownerId, meName,
    otherId: proposal.freelancerId, otherName: proposal.freelancerName,
    jobId: job.id, jobTitle: job.title,
  });

  await runTransaction(fb.db, async (tx) => {
    const clientRef = doc(fb.db, 'users', job.ownerId);
    const snap = await tx.get(clientRef);
    const posting = Number(snap.data()?.postingBalanceCents ?? 0);

    if (posting < bid) {
      throw new InsufficientPostingBalance(
        `Your posting balance is $${(posting / 100).toFixed(2)} — top it up to `
        + `$${(bid / 100).toFixed(2)} before hiring.`,
      );
    }

    tx.update(clientRef, {
      postingBalanceCents: posting - bid,
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(fb.db, 'proposals', proposal.id), {
      status: 'accepted', chatId, updatedAt: serverTimestamp(),
    }, { merge: true });
    tx.set(doc(fb.db, 'jobs', job.id), {
      status: 'filled',
      hiredProposalId: proposal.id,
      hiredFreelancerId: proposal.freelancerId,
      escrowHeldCents: bid,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  void notify({
    toUid: proposal.freelancerId,
    kind: 'hire',
    title: 'You have been hired',
    body: `${meName} hired you for "${job.title}". Escrow is funded.`,
    jobId: job.id,
    proposalId: proposal.id,
    chatId,
    actorId: job.ownerId,
    actorName: meName,
  });

  return chatId;
}

/**
 * Releases one milestone, ported from EngagementRepository.releaseMilestone.
 *
 * Credits the freelancer net of fees, writes both ledger lines (the credit and
 * the fee, as separate rows so a statement reconciles), and decrements escrow.
 *
 * On the final milestone the engagement completes: the job closes, the
 * freelancer's job count moves, and their trust bond unlocks. That last part
 * is the promise the deposit screen makes, so it happens in the same
 * transaction rather than being left to a manual step that might not happen.
 */
export async function releaseMilestone(
  job: Job, proposal: Proposal, milestoneIndex: number,
) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');

  const milestones = job.milestones ?? [];
  const milestone = milestones[milestoneIndex];
  if (!milestone) throw new Error('That milestone no longer exists.');
  if (milestone.released) return;

  const amountCents = milestoneCents(milestone, job, proposal);
  // Fee split matches the app: the gateway's charge plus Felicek's 1%.
  const feeCents = gatewayCharge(LOCAL, amountCents)
    + Math.round(amountCents * PLATFORM_RATE);
  const netCents = Math.max(0, amountCents - feeCents);

  const updated = milestones.map((m, i) =>
    i === milestoneIndex ? { ...m, released: true } : m);
  const isFinal = updated.every((m) => m.released);

  const freelancerRef = doc(fb.db, 'users', proposal.freelancerId);
  const ledger = collection(fb.db, 'users', proposal.freelancerId, 'transactions');
  const creditRef = doc(ledger);
  const feeRef = doc(ledger);

  await runTransaction(fb.db, async (tx) => {
    const snap = await tx.get(freelancerRef);
    const data = snap.data() ?? {};
    const balance = Number(data.walletBalanceCents ?? 0);
    const earned = Number(data.totalEarnedCents ?? 0);
    const jobsDone = Number(data.jobsDone ?? 0);
    const kyc = (data.kyc ?? {}) as Record<string, unknown>;

    const update: Record<string, unknown> = {
      walletBalanceCents: balance + netCents,
      totalEarnedCents: earned + amountCents,
      updatedAt: serverTimestamp(),
    };
    if (isFinal) {
      update.jobsDone = jobsDone + 1;
      if (kyc.depositReleased !== true) update.kyc = { depositReleased: true };
    }
    tx.set(freelancerRef, update, { merge: true });

    tx.set(creditRef, {
      id: creditRef.id,
      label: `Escrow release — ${milestone.label}`,
      amountCents,
      kind: 'escrowRelease',
      jobId: job.id,
      createdAt: serverTimestamp(),
    });

    if (feeCents > 0) {
      tx.set(feeRef, {
        id: feeRef.id,
        label: 'Processing and platform fee',
        amountCents: -feeCents,
        kind: 'platformFee',
        jobId: job.id,
        createdAt: serverTimestamp(),
      });
    }

    tx.set(doc(fb.db, 'jobs', job.id), {
      milestones: updated,
      escrowHeldCents: increment(-amountCents),
      ...(isFinal ? { status: 'closed', completedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (isFinal) {
      tx.set(doc(fb.db, 'proposals', proposal.id), {
        status: 'completed', updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  });

  // Hand over the clean, un-watermarked deliverables now that this is paid.
  //
  // This only succeeds when the caller is the sender of those files — the
  // rule is `isSelf(request.resource.data.senderId)`, and the person
  // releasing a milestone is the client, not the freelancer who uploaded
  // them. So from a client's browser this is expected to fail, and it is
  // caught rather than allowed to unwind a payment that already completed.
  //
  // Letting the recipient flip `released` themselves is not the fix: that is
  // exactly the "take the file without paying" hole the flag exists to close.
  // The real fix is a Cloud Function releasing it with the Admin SDK, which
  // needs the Blaze plan — the same server that has to exist for the payment
  // webhook anyway. Until then the freelancer's own client releases on next
  // open, since they are the sender and may write.
  try {
    const { releaseDeliverables } = await import('./deliverables');
    await releaseDeliverables(chatIdFor(job.ownerId, proposal.freelancerId, job.id));
  } catch {
    // Expected from the client side. The money moved regardless.
  }

  void notify({
    toUid: proposal.freelancerId,
    kind: 'milestone',
    title: isFinal ? 'Final milestone released' : 'Milestone released',
    body: `${milestone.label} — ${(netCents / 100).toFixed(2)} paid to you after fees.`,
    jobId: job.id,
    proposalId: proposal.id,
  });

  return { amountCents, feeCents, netCents, isFinal };
}
