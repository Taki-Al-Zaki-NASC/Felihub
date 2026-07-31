import {
  addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch,
} from 'firebase/firestore';
import { firebase } from './firebase';

/**
 * In-app notifications.
 *
 * The rule lets any signed-in account drop a document into someone else's
 * feed, but only in one exact shape and only starting unread —
 * `keys().hasOnly([...])` means an extra field is a refusal, not an ignored
 * value. So this builder is the shape, and every field it can send is listed
 * here deliberately.
 *
 * Undefined is stripped before writing: Firestore rejects an undefined value
 * outright, and a key present-but-undefined would also fail hasOnly.
 *
 * These are read while the app is open. Waking a closed browser needs a push
 * service and a server to hold its credentials, which is the Blaze-tier work
 * documented on the app side — not something a client can do for itself.
 */
export type NotificationKind =
  | 'message' | 'proposal' | 'hire' | 'milestone' | 'shortlist';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  chatId?: string | null;
  jobId?: string | null;
  proposalId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  createdAt?: { seconds?: number };
}

export interface NotifyInput {
  toUid: string;
  kind: NotificationKind;
  title: string;
  body: string;
  chatId?: string | null;
  jobId?: string | null;
  proposalId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
}

/**
 * Best-effort by design.
 *
 * A notification is a courtesy attached to something that already happened —
 * a hire, a bid, a message. Letting its failure surface would roll back or
 * red-flag an action that genuinely succeeded, which is a worse lie than a
 * missing alert. Callers do not await a guarantee.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const fb = firebase();
  if (!fb) return;

  const payload: Record<string, unknown> = {
    kind: input.kind,
    title: input.title,
    body: input.body,
    read: false,               // the rule requires exactly this
    chatId: input.chatId ?? null,
    jobId: input.jobId ?? null,
    proposalId: input.proposalId ?? null,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(fb.db, 'users', input.toUid, 'notifications'), payload);
  } catch {
    // Swallowed on purpose — see above.
  }
}

export async function markNotificationRead(uid: string, id: string) {
  const fb = firebase();
  if (!fb) return;
  await updateDoc(doc(fb.db, 'users', uid, 'notifications', id), { read: true });
}

export async function markAllRead(uid: string, ids: string[]) {
  const fb = firebase();
  if (!fb || ids.length === 0) return;
  const batch = writeBatch(fb.db);
  for (const id of ids.slice(0, 400)) {   // Firestore caps a batch at 500
    batch.update(doc(fb.db, 'users', uid, 'notifications', id), { read: true });
  }
  await batch.commit();
}
