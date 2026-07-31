'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebase } from '@/lib/firebase';
import { useSession } from '@/lib/session';
import type { PublicProfile } from '@/lib/schema';
import { ProfileView } from '@/components/profile-view';
import { ErrorState, Loading, SectionLabel } from '@/components/ui';

/**
 * Your own profile, as it appears to everyone else.
 *
 * The nav used to point at /profile/setup, which is the edit form — so
 * "Profile" opened a page of inputs rather than the thing being edited. This
 * is the view; the form is one click away.
 */
export default function MyProfile() {
  const { user } = useSession();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (!user) return;
    const fb = firebase();
    if (!fb) { setState('error'); return; }
    return onSnapshot(
      doc(fb.db, 'profiles', user.uid),
      (snap) => {
        if (!snap.exists()) { setState('missing'); return; }
        setProfile({ id: snap.id, ...snap.data() } as PublicProfile);
        setState('ready');
      },
      () => setState('error'),
    );
  }, [user]);

  if (!user || state === 'loading') return <Loading />;

  if (state === 'error') {
    return <ErrorState message="Your profile could not be loaded. Reload and try again." />;
  }

  if (state === 'missing' || !profile) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-2xl font-semibold">No profile yet</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Fill one in so clients and freelancers know who they are dealing with.
        </p>
        <Link href={'/profile/setup' as Route}
          className="mt-6 inline-block rounded-button bg-ink-strong px-5 py-3 text-sm font-bold text-canvas">
          Set up your profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionLabel>Your public profile</SectionLabel>
        <span className="text-xs text-ink-faint">This is what others see</span>
      </div>

      <ProfileView
        profile={profile}
        action={
          <Link href={'/profile/setup' as Route}
            className="flex min-h-[40px] items-center rounded-button border border-border-strong bg-surface px-4 text-sm font-bold hover:bg-backdrop">
            Edit
          </Link>
        }
      />

      <div className="mt-8 flex flex-wrap gap-4 border-t border-border pt-5 text-sm">
        <Link href={'/verify' as Route} className="font-bold text-teal-deep">
          Verification &amp; deposit →
        </Link>
        <Link href={'/notifications' as Route} className="font-bold text-teal-deep">
          Notifications →
        </Link>
      </div>
    </div>
  );
}
