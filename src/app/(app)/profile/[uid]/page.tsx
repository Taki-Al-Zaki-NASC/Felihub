'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebase } from '@/lib/firebase';
import { useSession } from '@/lib/session';
import type { PublicProfile } from '@/lib/schema';
import { describeError, openThread } from '@/lib/mutations';
import { ProfileView } from '@/components/profile-view';
import { EmptyState, ErrorState, Loading } from '@/components/ui';

/**
 * Someone else's profile.
 *
 * `profiles/{uid}` is world-readable by rule, so this needs no special access.
 * The directory previously offered only a Message button — you could start a
 * conversation with someone whose work you had never actually looked at.
 */
export default function PublicProfilePage({ params }: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = use(params);
  const { user } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fb = firebase();
    if (!fb) { setState('error'); return; }
    return onSnapshot(
      doc(fb.db, 'profiles', uid),
      (snap) => {
        if (!snap.exists()) { setState('missing'); return; }
        setProfile({ id: snap.id, ...snap.data() } as PublicProfile);
        setState('ready');
      },
      () => setState('error'),
    );
  }, [uid]);

  if (state === 'loading') return <Loading />;
  if (state === 'error') {
    return <ErrorState message="That profile could not be loaded." />;
  }
  if (state === 'missing' || !profile) {
    return <EmptyState title="No such profile"
      message="This account may have been removed, or never completed setup." />;
  }

  // Viewing your own profile through a public link should not offer to open a
  // conversation with yourself.
  const isMe = user?.uid === uid;

  async function message() {
    if (!user || !profile || busy) return;
    setBusy(true); setError(null);
    try {
      const id = await openThread({
        meId: user.uid, meName: user.displayName,
        otherId: profile.uid || profile.id,
        otherName: profile.displayName ?? 'Felicek user',
      });
      router.push(`/messages/${id}` as Route);
    } catch (e) {
      setError(describeError(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ProfileView
        profile={profile}
        action={isMe ? undefined : (
          <button onClick={() => void message()} disabled={busy}
            className="flex min-h-[44px] items-center rounded-button bg-ink-strong px-5 text-sm font-bold text-canvas transition hover:opacity-90 disabled:opacity-50">
            {busy ? 'Opening…' : 'Message'}
          </button>
        )}
      />
      {error && <div className="mt-4"><ErrorState message={error} /></div>}
    </div>
  );
}
