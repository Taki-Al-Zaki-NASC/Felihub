'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';

/**
 * Sends an already-signed-in visitor out of the auth pages.
 *
 * Without this, signing in "does nothing": onAuthStateChanged fires, the
 * session updates, and the form stays on screen because nothing navigates. It
 * reads as a dead button, which is exactly what was reported.
 *
 * Driven by session stage rather than by the submit handler, so it also covers
 * arriving at /signin with a live session, and a sign-in completing in another
 * tab.
 *
 * 'stalled' navigates too, on purpose. It used to be excluded on the theory
 * that a broken session shouldn't go anywhere — but /signin has no layout and
 * cannot render the stalled error state itself, so excluding it left a signed
 * -in-but-stuck account stranded on the sign-in form with no error, no
 * message, and no way out except knowing to type a URL by hand. /dashboard is
 * wrapped in <Gate>, which *does* render the stalled screen (with the reason
 * and a sign-out button) — sending 'stalled' there is what actually surfaces
 * the problem instead of hiding it.
 */
export function RedirectWhenSignedIn() {
  const { stage } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (stage === 'booting' || stage === 'signedOut') return;
    // Every other stage means authenticated (or stuck while authenticated).
    // The gate decides what they can actually see; this only gets them off
    // the auth form and somewhere that can explain what's happening.
    router.replace('/dashboard');
  }, [stage, router]);

  return null;
}
