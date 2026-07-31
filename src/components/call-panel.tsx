'use client';

import { useEffect, useRef, useState } from 'react';
import {
  answerCall, declineCall, placeCall, watchIncomingCalls,
  type CallHandle, type CallKind, type CallSession, type CallStatus,
} from '@/lib/calls';
import { useSession } from '@/lib/session';
import { ErrorState } from './ui';

/**
 * Call UI: the buttons that start one, and the overlay that runs it.
 *
 * Kept in one component because a call has exactly one live handle at a time
 * and splitting placing, answering and hanging up across components makes it
 * easy to leak a peer connection — or worse, a camera that stays on.
 */
export function CallButtons({ otherId, otherName, chatId }: {
  otherId: string; otherName: string; chatId?: string | null;
}) {
  const { user } = useSession();
  const [handle, setHandle] = useState<CallHandle | null>(null);
  const [status, setStatus] = useState<CallStatus>('ringing');
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [kind, setKind] = useState<CallKind>('audio');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(k: CallKind) {
    if (!user || busy || handle) return;
    setBusy(true); setError(null); setKind(k); setStatus('ringing');
    try {
      const h = await placeCall({
        callerId: user.uid, callerName: user.displayName,
        calleeId: otherId, calleeName: otherName,
        kind: k, chatId,
        onRemoteStream: setRemote,
        onStatus: setStatus,
      });
      setHandle(h);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function hangUp() {
    await handle?.stop();
    setHandle(null); setRemote(null);
  }

  if (!user) return null;

  return (
    <>
      <div className="flex gap-1.5">
        <button onClick={() => void start('audio')} disabled={busy || Boolean(handle)}
          aria-label={`Call ${otherName}`}
          className="flex min-h-[36px] items-center rounded-[9px] px-2.5 text-ink-muted transition hover:bg-backdrop disabled:opacity-40">
          <IconPhone />
        </button>
        <button onClick={() => void start('video')} disabled={busy || Boolean(handle)}
          aria-label={`Video call ${otherName}`}
          className="flex min-h-[36px] items-center rounded-[9px] px-2.5 text-ink-muted transition hover:bg-backdrop disabled:opacity-40">
          <IconVideo />
        </button>
      </div>

      {error && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm md:bottom-8">
          <ErrorState message={error} retry={() => setError(null)} />
        </div>
      )}

      {handle && (
        <CallStage
          title={otherName}
          kind={kind}
          status={status}
          local={handle.localStream}
          remote={remote}
          onHangUp={() => void hangUp()}
        />
      )}
    </>
  );
}

/**
 * Listens for calls to this account and offers to answer.
 *
 * Mounted once in the app layout rather than per-page: a call should ring
 * wherever you are, not only inside the thread it came from.
 */
export function IncomingCallListener() {
  const { user } = useSession();
  const [incoming, setIncoming] = useState<CallSession | null>(null);
  const [handle, setHandle] = useState<CallHandle | null>(null);
  const [status, setStatus] = useState<CallStatus>('accepted');
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const stop = watchIncomingCalls(user.uid, (c) => {
      // Ignore the ring once it is the call already being handled.
      setIncoming((prev) => (handle && prev && c?.id === prev.id) ? prev : c);
    });
    return () => stop?.();
  }, [user, handle]);

  // A call the other side cancelled should stop ringing here too.
  useEffect(() => {
    if (handle && (status === 'ended' || status === 'cancelled' || status === 'failed')) {
      void handle.stop();
      setHandle(null); setRemote(null); setIncoming(null);
    }
  }, [status, handle]);

  if (!user) return null;

  async function accept() {
    if (!incoming) return;
    setError(null);
    try {
      const h = await answerCall({
        callId: incoming.id, selfId: user!.uid,
        onRemoteStream: setRemote, onStatus: setStatus,
      });
      setHandle(h);
    } catch (e) {
      setError((e as Error).message);
      setIncoming(null);
    }
  }

  async function decline() {
    if (!incoming) return;
    await declineCall(incoming.id, user!.uid);
    setIncoming(null);
  }

  async function hangUp() {
    await handle?.stop();
    setHandle(null); setRemote(null); setIncoming(null);
  }

  if (handle && incoming) {
    return (
      <CallStage
        title={incoming.callerName}
        kind={incoming.kind}
        status={status}
        local={handle.localStream}
        remote={remote}
        onHangUp={() => void hangUp()}
      />
    );
  }

  if (!incoming) {
    return error ? (
      <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm md:bottom-8">
        <ErrorState message={error} retry={() => setError(null)} />
      </div>
    ) : null;
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-sm px-4 md:bottom-6">
      <div className="rounded-card-lg border border-border-strong bg-surface p-4 shadow-lg">
        <p className="text-sm font-semibold">
          {incoming.callerName} is calling
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {incoming.kind === 'video' ? 'Video call' : 'Voice call'}
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => void decline()}
            className="min-h-[44px] flex-1 rounded-button border border-border-strong bg-surface text-sm font-bold hover:bg-backdrop">
            Decline
          </button>
          <button onClick={() => void accept()}
            className="min-h-[44px] flex-1 rounded-button bg-teal text-sm font-bold text-white hover:bg-teal-deep">
            Answer
          </button>
        </div>
      </div>
    </div>
  );
}

/** The in-call overlay. */
function CallStage({ title, kind, status, local, remote, onHangUp }: {
  title: string; kind: CallKind; status: CallStatus;
  local: MediaStream; remote: MediaStream | null;
  onHangUp: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = local;
  }, [local]);
  useEffect(() => {
    if (remoteRef.current && remote) remoteRef.current.srcObject = remote;
  }, [remote]);

  const label = status === 'ringing' ? 'Ringing…'
    : status === 'accepted' ? (remote ? 'Connected' : 'Connecting…')
      : status === 'declined' ? 'Declined'
        : status === 'failed' ? 'Connection failed'
          : 'Call ended';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-strong">
      <div className="flex items-center justify-between px-5 py-4 text-canvas">
        <div>
          <p className="font-serif text-lg font-semibold">{title}</p>
          <p className="text-xs text-white/60">{label}</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-white/50">
          {kind === 'video' ? 'Video' : 'Voice'}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {kind === 'video' ? (
          <>
            <video ref={remoteRef} autoPlay playsInline
              className="h-full w-full bg-black object-cover" />
            <video ref={localRef} autoPlay playsInline muted
              className="absolute bottom-4 right-4 h-32 w-24 rounded-card border border-white/20 object-cover sm:h-40 sm:w-28" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 font-serif text-3xl font-semibold text-canvas">
              {title[0]?.toUpperCase() ?? '?'}
            </span>
            {/* Audio still needs an element to play through. */}
            <video ref={remoteRef} autoPlay playsInline className="hidden" />
          </div>
        )}
        {status === 'failed' && (
          <p className="absolute inset-x-4 bottom-20 mx-auto max-w-sm rounded-field bg-danger-tint px-3 py-2 text-center text-xs text-danger">
            The two devices could not reach each other. This happens on some
            corporate and mobile networks, which need a relay server Felicek
            does not run yet.
          </p>
        )}
      </div>

      <div className="flex justify-center px-5 pb-8 pt-4">
        <button onClick={onHangUp}
          className="min-h-[52px] rounded-full bg-danger px-10 text-sm font-bold text-white transition hover:opacity-90">
          Hang up
        </button>
      </div>
    </div>
  );
}

const S = 'h-5 w-5';
function IconPhone() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5c0 8.3 6.7 15 15 15l2-3.6-5.2-2-1.8 1.8a12 12 0 0 1-6.2-6.2l1.8-1.8-2-5.2z" strokeLinejoin="round" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="m15 11 6-3v8l-6-3z" strokeLinejoin="round" />
    </svg>
  );
}
