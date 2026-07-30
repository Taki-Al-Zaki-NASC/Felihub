'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebase } from './firebase';
import type { AppUser } from './types';

type Stage = 'booting' | 'signedOut' | 'onboarding' | 'verification' | 'ready' | 'stalled';

interface Session {
  stage: Stage;
  user: AppUser | null;
  error: string | null;
}

const SessionContext = createContext<Session>({
  stage: 'booting', user: null, error: null,
});

export const useSession = () => useContext(SessionContext);

/**
 * Owns "who is signed in and what should they see".
 *
 * The watchdog is not optional. On Android, a signed-in account whose profile
 * document never arrived (rules not deployed, offline) left the app on a
 * splash screen permanently — Firestore streams stay *silent* rather than
 * erroring when a read is denied. Same failure mode here, same fix.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({
    stage: 'booting', user: null, error: null,
  });

  useEffect(() => {
    const fb = firebase();
    if (!fb) {
      setSession({ stage: 'stalled', user: null,
        error: 'Firebase is not configured for this build.' });
      return;
    }

    let stopProfile: (() => void) | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    const stopAuth = onAuthStateChanged(fb.auth, (fbUser: User | null) => {
      stopProfile?.();
      clearTimeout(watchdog);

      if (!fbUser) {
        setSession({ stage: 'signedOut', user: null, error: null });
        return;
      }

      watchdog = setTimeout(() => {
        setSession((s) => s.user ? s : {
          stage: 'stalled', user: null,
          error: 'Signed in, but your profile did not load. The Firestore '
            + 'rules may not be deployed for this project.',
        });
      }, 12_000);

      stopProfile = onSnapshot(
        doc(fb.db, 'users', fbUser.uid),
        (snap) => {
          clearTimeout(watchdog);
          if (!snap.exists()) return; // watchdog handles a doc that never lands
          const user = { uid: snap.id, ...snap.data() } as AppUser;
          setSession({ stage: stageFor(user), user, error: null });
        },
        (e) => {
          clearTimeout(watchdog);
          setSession({ stage: 'stalled', user: null, error: describeReadFailure(e) });
        },
      );
    });

    return () => { stopAuth(); stopProfile?.(); clearTimeout(watchdog); };
  }, []);

  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}

/**
 * Turns a failed profile read into a sentence that says what to do.
 *
 * This used to be `e.message`, which put Firestore's raw "Missing or
 * insufficient permissions." on screen — accurate, and useless. That string
 * has exactly one cause here: `users/{uid}`'s read rule is `isSelf(uid)`, so a
 * signed-in account reading its own record cannot be refused by the rules in
 * this repo. Being refused anyway means the rules being enforced are not these
 * rules — either the database is still in locked mode, or
 * `firebase deploy --only firestore:rules` has not been run for this project.
 */
function describeReadFailure(e: { code?: string; message?: string }): string {
  if (e.code === 'permission-denied') {
    return 'Firestore refused to read your account. The security rules have '
      + 'not been deployed to this Firebase project yet — run '
      + '`firebase deploy --only firestore:rules,firestore:indexes` from the '
      + 'firebase/ directory. (A database left in locked mode denies every '
      + 'read, including your own profile.)';
  }
  if (e.code === 'unavailable') {
    return 'Could not reach the database. Check your connection and try again.';
  }
  return 'Your account could not be loaded. Please try again.';
}

function stageFor(u: AppUser): Stage {
  if (!u.onboarded || !u.profileComplete) return 'onboarding';
  if (!(u.kyc.stage === 'verified' && u.kyc.depositPaid)) return 'verification';
  return 'ready';
}
