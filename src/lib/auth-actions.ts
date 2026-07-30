import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, setPersistence,
  browserLocalPersistence, browserSessionPersistence,
  signOut as fbSignOut, type UserCredential,
} from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firebase } from './firebase';
import { DEPOSIT_CENTS, type UserRoleKey } from './types';

/**
 * Maps Firebase's error codes to sentences.
 *
 * Never `e.message` — that is how CONFIGURATION_NOT_FOUND reached a user's
 * screen on Android looking like a network fault. Every code gets a sentence
 * or an honest fallback.
 */
export function describeAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email': return 'That email address is not valid.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Email or password is incorrect.';
    case 'auth/email-already-in-use': return 'An account already exists for that email.';
    case 'auth/weak-password': return 'Choose a stronger password — at least 8 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a minute and try again.';
    case 'auth/network-request-failed': return 'No connection. Check your network.';
    case 'auth/operation-not-allowed': return 'Email sign-in is not enabled for this project yet.';
    case 'auth/configuration-not-found':
      return 'This site is not connected to a working backend yet '
        + '(Authentication is not set up for this Firebase project). '
        + 'This is a setup issue, not your connection.';
    default: return 'Could not complete that. Please try again.';
  }
}

/** Where the last-used email is kept, so the field can be prefilled. */
const REMEMBERED_EMAIL = 'felicek.rememberedEmail';

export function rememberedEmail(): string {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(REMEMBERED_EMAIL) ?? ''; }
  catch { return ''; }        // Safari private mode throws on localStorage
}

/**
 * Signs in, choosing how long the session outlives the tab.
 *
 * `remember` picks the Firebase persistence mode, and the distinction is real:
 * local keeps the session in localStorage so closing the browser does not sign
 * you out; session keeps it in sessionStorage, so the tab closing ends it.
 * That second mode is the one that matters on a shared or public machine, so
 * the checkbox has to actually change behaviour rather than only prefill a
 * field.
 *
 * Persistence is set *before* the sign-in call, because it decides where the
 * resulting credential is written.
 */
export async function signIn(email: string, password: string, remember = true) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const trimmed = email.trim();

  await setPersistence(
    fb.auth, remember ? browserLocalPersistence : browserSessionPersistence);
  await signInWithEmailAndPassword(fb.auth, trimmed, password);

  try {
    if (remember) window.localStorage.setItem(REMEMBERED_EMAIL, trimmed);
    else window.localStorage.removeItem(REMEMBERED_EMAIL);
  } catch {
    // Storage unavailable. The session still works; only the prefill is lost.
  }
}

/**
 * Rebuilds the Firestore records for an account that has none.
 *
 * Sign-up creates the Auth user first and the two documents second. If the
 * batch fails — a rule refusal, a dropped connection — the result is an
 * account that can sign in and has nothing behind it. Deleting and
 * re-registering is not available to the person it happened to, because the
 * email is already taken by the Auth user.
 *
 * The rules allow exactly this: `isSelf(uid)`, the email must match the token,
 * and the deposit must start unpaid. So the repair cannot be used to
 * fabricate a verified account — it can only put back the same empty record
 * sign-up would have written.
 */
export async function repairAccountRecord(role: UserRoleKey, displayName?: string) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const u = fb.auth.currentUser;
  if (!u) throw new Error('You are not signed in.');

  const name = (displayName ?? '').trim()
    || u.displayName?.trim()
    || (u.email ?? 'felicek').split('@')[0];

  const batch = writeBatch(fb.db);
  batch.set(doc(fb.db, 'users', u.uid), {
    email: u.email,
    displayName: name,
    role,
    onboarded: false,
    profileComplete: false,
    kyc: {
      idSubmitted: false,
      depositPaid: false,      // the rule refuses any other starting value
      stage: 'none',
      depositAmountCents: DEPOSIT_CENTS[role],
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(fb.db, 'profiles', u.uid), {
    uid: u.uid,
    displayName: name,
    role,
    verified: false,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function resetPassword(email: string) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  await sendPasswordResetEmail(fb.auth, email.trim());
}

export async function signOut() {
  const fb = firebase();
  if (fb) await fbSignOut(fb.auth);
}

/**
 * Creates the account and its profile documents together.
 *
 * The shape has to match what the Android app writes, because both read the
 * same documents — and it has to satisfy firestore.rules, which requires the
 * email to match the token and the deposit to start unpaid.
 */
export async function signUp(
  email: string, password: string, displayName: string, role: UserRoleKey,
) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');

  const cred: UserCredential =
    await createUserWithEmailAndPassword(fb.auth, email.trim(), password);
  const uid = cred.user.uid;
  const name = displayName.trim() || email.split('@')[0];

  const batch = writeBatch(fb.db);
  batch.set(doc(fb.db, 'users', uid), {
    email: cred.user.email,
    displayName: name,
    role,
    onboarded: false,
    profileComplete: false,
    kyc: {
      idSubmitted: false,
      depositPaid: false,       // rules reject any other starting value
      stage: 'none',
      depositAmountCents: DEPOSIT_CENTS[role],
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(fb.db, 'profiles', uid), {
    uid,
    displayName: name,
    role,
    // Required by the rule (`verified == false` on create), not optional.
    // Firestore rules raise an evaluation error on a missing key rather than
    // reading it as undefined, so omitting this denied the whole batch — and
    // because it shares a batch with users/{uid}, no web sign-up could write
    // either document.
    verified: false,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}
