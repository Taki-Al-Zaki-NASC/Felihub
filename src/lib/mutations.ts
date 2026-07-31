import {
  addDoc, collection, doc, getDoc, increment, runTransaction,
  serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { firebase } from './firebase';
import { notify } from './notifications';
import type { Job, Milestone, Proposal } from './schema';
import type { CheckResult, DocumentType } from './identity-check';
import { DEPOSIT_CENTS, type UserRoleKey } from './types';

/** Turns any thrown value into a sentence. Never surfaces the raw exception. */
export function describeError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'permission-denied') {
    return 'The server refused that. Your account may not be verified, or the '
      + 'security rules have not been deployed for this project.';
  }
  if (code === 'unavailable') return 'No connection. Check your network and try again.';
  if (code === 'not-found') return 'That no longer exists.';
  if (code === 'failed-precondition') {
    return 'That could not be completed — something changed while you were working. '
      + 'Reload and try again.';
  }
  return 'That could not be completed. Please try again.';
}

/** Prefix terms for search, matching the app's denormalised searchTerms. */
function searchTerms(title: string, skills: string[]): string[] {
  const words = `${title} ${skills.join(' ')}`
    .toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  const out = new Set<string>();
  for (const w of words) {
    for (let i = 2; i <= Math.min(w.length, 12); i++) out.add(w.slice(0, i));
  }
  return [...out].slice(0, 200); // Firestore caps array-contains index entries
}

export async function postJob(input: {
  ownerId: string; ownerName: string;
  title: string; description: string; type: string; typeLabel: string;
  budget: string; budgetValue: number | null;
  skills: string[]; milestones: Milestone[];
}) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const ref = await addDoc(collection(fb.db, 'jobs'), {
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    typeLabel: input.typeLabel,
    budget: input.budget.trim(),
    budgetValue: input.budgetValue,
    skills: input.skills,
    milestones: input.milestones,
    status: 'open',
    proposalsCount: 0,
    shortlisted: 0,
    views: 0,
    escrowHeldCents: 0,
    searchTerms: searchTerms(input.title, input.skills),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setJobStatus(jobId: string, status: 'open' | 'closed') {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  await updateDoc(doc(fb.db, 'jobs', jobId), { status, updatedAt: serverTimestamp() });
}

/**
 * Submits a proposal.
 *
 * The document id is deterministic — `{jobId}__{uid}` — exactly as the app
 * builds it, so a double submit overwrites rather than creating a second
 * proposal for the same person on the same job.
 */
export async function submitProposal(input: {
  job: Job; freelancerId: string; freelancerName: string;
  bidAmountCents: number; note: string;
}) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const id = `${input.job.id}__${input.freelancerId}`;
  const ref = doc(fb.db, 'proposals', id);

  await runTransaction(fb.db, async (tx) => {
    const existing = await tx.get(ref);
    tx.set(ref, {
      jobId: input.job.id,
      jobTitle: input.job.title,
      // `jobOwnerId` is what the create rule cross-checks against the job
      // document, and what the read rule authorises the owner by. Writing
      // `ownerId` instead meant the rule read a key that was not there, which
      // is an evaluation error, so no bid could ever be submitted.
      jobOwnerId: input.job.ownerId,
      freelancerId: input.freelancerId,
      freelancerName: input.freelancerName,
      bidAmountCents: input.bidAmountCents,
      note: input.note.trim(),
      status: 'submitted',
      createdAt: serverTimestamp(),
    }, { merge: true });

    // Only count a genuinely new proposal, or a resubmit inflates the tally.
    // `proposalsCount` is the only spelling a non-owner is allowed to touch.
    if (!existing.exists()) {
      tx.update(doc(fb.db, 'jobs', input.job.id), { proposalsCount: increment(1) });
    }
  });

  void notify({
    toUid: input.job.ownerId,
    kind: 'proposal',
    title: 'New proposal',
    body: `${input.freelancerName} bid on "${input.job.title}".`,
    jobId: input.job.id,
    proposalId: id,
    actorId: input.freelancerId,
    actorName: input.freelancerName,
  });

  return id;
}

export async function withdrawProposal(proposalId: string) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  await updateDoc(doc(fb.db, 'proposals', proposalId), {
    status: 'withdrawn', updatedAt: serverTimestamp(),
  });
}

export async function shortlistProposal(proposalId: string, on: boolean) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  await updateDoc(doc(fb.db, 'proposals', proposalId), {
    status: on ? 'shortlisted' : 'submitted', updatedAt: serverTimestamp(),
  });
}

/**
 * Whether this account already has a proposal on this job.
 *
 * `permission-denied` here means "no proposal", not "cannot tell", and that
 * needs justifying because normally they are different answers.
 *
 * The id is deterministic — `${jobId}__${uid}` — and the create rule enforces
 * that shape, so the only document this can ever address is one whose
 * `freelancerId` is this account. The read rule allows the bidder, so if it
 * existed it would be readable. It is refused only because the rule
 * dereferences `resource.data` on a document that is not there.
 *
 * Reporting that as unknown hid the bid form from everyone who had not yet
 * applied — which is exactly the people it exists for.
 */
export async function myProposalFor(jobId: string, uid: string): Promise<Proposal | null> {
  const fb = firebase();
  if (!fb) return null;
  try {
    const snap = await getDoc(doc(fb.db, 'proposals', `${jobId}__${uid}`));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Proposal) : null;
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') return null;
    throw e;  // anything else really is unknown, and must stay unknown
  }
}

/**
 * Deterministic thread id, matching ChatThread.idFor in the app.
 *
 * Sorted so both participants derive the same id regardless of who opens the
 * conversation, and scoped by job so the same pair can hold separate threads
 * for separate engagements. Without this, two people opening a chat at the
 * same moment fork it into two.
 */
export function chatIdFor(a: string, b: string, jobId?: string | null) {
  const pair = [a, b].sort().join('__');
  return jobId ? `${pair}__${jobId}` : pair;
}

export async function openThread(input: {
  meId: string; meName: string;
  otherId: string; otherName: string;
  jobId?: string | null; jobTitle?: string | null;
}) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const id = chatIdFor(input.meId, input.otherId, input.jobId);
  await setDoc(doc(fb.db, 'chats', id), {
    // `participantIds` is the array the rules test — both on this document
    // (`request.auth.uid in resource.data.participantIds`) and on every
    // message beneath it. It was previously written as `participants`, a name
    // nothing in the rules reads, so every chat read, write and message was
    // denied. `participants` is the {uid: name} map, a different shape.
    participantIds: [input.meId, input.otherId].sort(),
    participants: { [input.meId]: input.meName, [input.otherId]: input.otherName },
    jobId: input.jobId ?? null,
    jobTitle: input.jobTitle ?? null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return id;
}

/**
 * Sends a message and updates the thread preview in one batch-free pair.
 *
 * clientSentAt is set locally because an unresolved serverTimestamp reads as
 * null on the sending device, which would sort a pending message to the wrong
 * end of the list. The app orders on the same field for the same reason.
 */
export async function sendMessage(input: {
  chatId: string; senderId: string; senderName: string; text: string;
  /** Optional: who to notify. Omitted when the caller does not know it. */
  recipientId?: string | null;
}) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const body = input.text.trim();
  if (!body) return;

  await addDoc(collection(fb.db, 'chats', input.chatId, 'messages'), {
    senderId: input.senderId,
    senderName: input.senderName,
    text: body,
    sentAt: serverTimestamp(),
    clientSentAt: new Date(),
  });
  await updateDoc(doc(fb.db, 'chats', input.chatId), {
    lastMessage: body.length > 120 ? `${body.slice(0, 119)}\u2026` : body,
    lastMessageAt: serverTimestamp(),
  });

  if (input.recipientId) {
    void notify({
      toUid: input.recipientId,
      kind: 'message',
      title: input.senderName,
      body: body.length > 90 ? `${body.slice(0, 89)}\u2026` : body,
      chatId: input.chatId,
      actorId: input.senderId,
      actorName: input.senderName,
    });
  }
}

/**
 * Marks the thread read up to now.
 *
 * A chat-level watermark, not a flag per message — one write marks two hundred
 * messages read instead of two hundred writes. Same shape the app uses, so
 * both surfaces read each other's receipts.
 */
export async function markRead(chatId: string, uid: string) {
  const fb = firebase();
  if (!fb) return;
  await updateDoc(doc(fb.db, 'chats', chatId), {
    [`readUpTo.${uid}`]: serverTimestamp(),
  });
}

/**
 * Records an identity submission: the number, the captured images, and the
 * screening verdict.
 *
 * Images go to the owner-only `identity` subcollection, never onto the profile
 * document — the profile is streamed live, so a few hundred KB there would be
 * re-downloaded on every unrelated change.
 *
 * A passing screen sets stage to verified because on the free tier there is no
 * server running a review queue, and an account that has paid a real deposit
 * should not block behind a review nobody performs. Documented in
 * docs/VERIFICATION.md; it is the first thing a real provider replaces.
 */
export async function submitIdentity(input: {
  uid: string;
  type: DocumentType;
  reference: string;
  documentBase64: string;
  selfieBase64: string;
  documentCheck: CheckResult;
  selfieCheck: CheckResult;
}) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');

  const images = collection(fb.db, 'users', input.uid, 'identity');
  await setDoc(doc(images, 'document'), {
    kind: 'document', documentType: input.type,
    imageBase64: input.documentBase64, capturedAt: serverTimestamp(),
  });
  await setDoc(doc(images, 'selfie'), {
    kind: 'selfie', imageBase64: input.selfieBase64, capturedAt: serverTimestamp(),
  });

  await setDoc(doc(fb.db, 'users', input.uid), {
    kyc: {
      idSubmitted: true,
      idDocumentType: input.type,
      idReference: input.reference.trim(),
      hasDocumentImage: true,
      hasSelfieImage: true,
      stage: 'verified',
      autoCheck: {
        checkedAt: new Date().toISOString(),
        method: 'web-screening-v1',
        document: summarise(input.documentCheck),
        selfie: summarise(input.selfieCheck),
      },
      submittedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Changes the account type, on its own.
 *
 * Separate from completeProfile deliberately. That function requires a name
 * and a bio before it will submit, so the role picker inside it was unusable
 * for anyone whose bio was short — the save button simply stayed disabled and
 * the role never moved. Switching sides of the marketplace should not be
 * gated behind writing an "about" paragraph.
 *
 * Writes both documents: `users/{uid}` drives what the app shows, and
 * `profiles/{uid}` is what the talent directory filters on, so a freelancer
 * who switches to client has to leave that directory too.
 */
export async function updateRole(uid: string, role: UserRoleKey, verified = false) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const batch = writeBatch(fb.db);
  batch.set(doc(fb.db, 'users', uid), {
    role,
    // Nested object, not a 'kyc.depositAmountCents' key. setDoc with merge
    // treats a dotted key as a literal field name — only updateDoc reads it
    // as a path — so that spelling would have created a field with a dot in
    // its name and left the real one untouched. merge deep-merges maps, so
    // depositPaid and the rest of kyc survive, which the rules require.
    kyc: { depositAmountCents: DEPOSIT_CENTS[role] },
    updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(doc(fb.db, 'profiles', uid), {
    // `uid` on every write, not just the first. A profile written only by
    // this function or by saveProfilePhoto had no uid field at all, and
    // anything reading profile.uid then got undefined — which Firestore
    // rejects outright when it reaches a where() clause, crashing the render.
    uid,
    role,
    verified,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

/**
 * Clears the deposit for a demo account, with no payment.
 *
 * This only succeeds for an address in `isDemoAccount()` in the rules — the
 * check is on `request.auth.token.email`, which Firebase Auth sets and a
 * client cannot forge. Calling it from any other account is refused
 * server-side, so the button being visible is not what grants anything.
 *
 * See src/lib/demo.ts for the standing warning about emptying the list before
 * real payments.
 */
export async function clearDepositAsDemo(uid: string, amountCents: number) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  await setDoc(doc(fb.db, 'users', uid), {
    kyc: {
      depositPaid: true,
      depositAmountCents: amountCents,
      // Tagged so these are findable later: audit for this value before
      // taking real payments, since none of them represent money received.
      paymentRef: 'free-open-beta',
      stage: 'verified',
      depositClearedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Stores the profile photo.
 *
 * Mandatory for individual freelancers: `isAccountVerified()` in the rules
 * refuses to treat a freelancer as verified without one, so without this the
 * web could take a freelancer through identity and deposit and still leave
 * them unable to bid.
 */
export async function saveProfilePhoto(uid: string, base64: string, verified = false) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const batch = writeBatch(fb.db);
  batch.set(doc(fb.db, 'users', uid), {
    profilePhotoBase64: base64, updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(doc(fb.db, 'profiles', uid), {
    uid,
    photoBase64: base64,
    // Always sent, never omitted. The rule compares this field, and on a
    // profile written before `verified` existed the comparison is against a
    // missing key — an evaluation error, not a false. Omitting it is what
    // made those profiles permanently unwritable.
    verified,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

const summarise = (c: CheckResult) => ({
  passed: c.passed,
  sharpness: Number(c.sharpness.toFixed(1)),
  brightness: Number(c.brightness.toFixed(1)),
  width: c.width, height: c.height,
});

/**
 * Completes the profile and clears the onboarding stage.
 *
 * Sets both `onboarded` and `profileComplete`, because SessionController and
 * the web gate both require the pair — setting one leaves the account stuck on
 * a screen it just finished.
 *
 * Writes profiles/{uid} too: that is the public half other people read, and a
 * name saved only on the private document leaves the person appearing as
 * "Felicek user" everywhere else.
 */
export async function completeProfile(input: {
  uid: string;
  displayName: string;
  title: string;
  bio: string;
  location: string;
  skills: string[];
  hourlyRate: number | null;
  role: string;
  languages?: string[];
  portfolioUrl?: string | null;
  experience?: unknown[];
  /** Current verification state — see the note in saveProfilePhoto. */
  verified?: boolean;
}) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');

  const name = input.displayName.trim();
  const shared = {
    displayName: name,
    title: input.title.trim(),
    bio: input.bio.trim(),
    location: input.location.trim(),
    skills: input.skills,
    hourlyRateCents: input.hourlyRate === null ? null : Math.round(input.hourlyRate * 100),
    languages: input.languages ?? [],
    portfolioUrl: input.portfolioUrl ?? null,
    experience: input.experience ?? [],
  };

  const batch = writeBatch(fb.db);
  batch.set(doc(fb.db, 'users', input.uid), {
    ...shared,
    onboarded: true,
    profileComplete: true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(doc(fb.db, 'profiles', input.uid), {
    uid: input.uid,
    role: input.role,
    ...shared,
    verified: input.verified ?? false,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}
