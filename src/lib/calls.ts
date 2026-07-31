import {
  addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp,
  setDoc, updateDoc, where, type Unsubscribe,
} from 'firebase/firestore';
import { firebase } from './firebase.ts';

/**
 * Audio and video calling, signalled through Firestore.
 *
 * Media goes peer to peer; only the negotiation crosses the database —
 * `calls/{callId}` holds the offer and answer, and the two candidate
 * subcollections hold ICE. Same shape as the Android client's CallSession, so
 * the model does not have to be re-learned per surface.
 *
 * STUN only, no TURN. That is the honest limit: STUN is free and works for
 * most home and mobile networks, but two peers behind symmetric NAT (some
 * corporate and carrier-grade networks) cannot connect without a relay, and a
 * TURN server costs money to run because it carries the media. When the
 * connection fails for that reason the UI says so rather than spinning.
 */
export type CallKind = 'audio' | 'video';
export type CallStatus =
  | 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'missed'
  | 'ended' | 'failed';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  kind: CallKind;
  status: CallStatus;
  chatId?: string | null;
  offerSdp?: string | null;
  offerType?: string | null;
  answerSdp?: string | null;
  answerType?: string | null;
  endedBy?: string | null;
}

export const isCallActive = (s: CallStatus) => s === 'ringing' || s === 'accepted';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
    ],
  }],
};

export interface CallHandle {
  callId: string;
  pc: RTCPeerConnection;
  localStream: MediaStream;
  stop: () => Promise<void>;
}

/** Camera and microphone, with a message that names the actual refusal. */
export async function getLocalMedia(kind: CallKind): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    throw new Error('This browser cannot access the camera or microphone.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video' ? { width: 1280, height: 720 } : false,
    });
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === 'NotAllowedError') {
      throw new Error(
        'Permission was refused. Allow camera and microphone access for this '
        + 'site in your browser settings, then try again.');
    }
    if (name === 'NotFoundError') {
      throw new Error(kind === 'video'
        ? 'No camera was found on this device.'
        : 'No microphone was found on this device.');
    }
    if (name === 'NotReadableError') {
      throw new Error('The camera or microphone is already in use by another app.');
    }
    throw new Error('The camera or microphone could not be started.');
  }
}

/**
 * Places a call: creates the offer, then listens for the answer.
 *
 * Candidates are written as they are discovered rather than gathered first —
 * trickle ICE connects noticeably faster, and waiting for gathering to finish
 * can stall for seconds on some networks.
 */
export async function placeCall(input: {
  callerId: string; callerName: string;
  calleeId: string; calleeName: string;
  kind: CallKind; chatId?: string | null;
  onRemoteStream: (s: MediaStream) => void;
  onStatus: (s: CallStatus) => void;
}): Promise<CallHandle> {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');

  const localStream = await getLocalMedia(input.kind);
  const pc = new RTCPeerConnection(RTC_CONFIG);
  for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

  const remote = new MediaStream();
  pc.ontrack = (e) => {
    for (const t of e.streams[0]?.getTracks() ?? []) remote.addTrack(t);
    input.onRemoteStream(remote);
  };

  const callRef = doc(collection(fb.db, 'calls'));
  const callerCandidates = collection(callRef, 'callerCandidates');
  const calleeCandidates = collection(callRef, 'calleeCandidates');

  pc.onicecandidate = (e) => {
    if (e.candidate) void addDoc(callerCandidates, e.candidate.toJSON());
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await setDoc(callRef, {
    callerId: input.callerId,
    callerName: input.callerName,
    calleeId: input.calleeId,
    calleeName: input.calleeName,
    kind: input.kind,
    status: 'ringing',
    chatId: input.chatId ?? null,
    offerSdp: offer.sdp,
    offerType: offer.type,
    answerSdp: null,
    answerType: null,
    endedBy: null,
    createdAt: serverTimestamp(),
  });

  const stops: Unsubscribe[] = [];

  stops.push(onSnapshot(callRef, (snap) => {
    const data = snap.data();
    if (!data) return;
    input.onStatus(data.status as CallStatus);
    // Apply the answer once, and only once it exists.
    if (data.answerSdp && !pc.currentRemoteDescription) {
      void pc.setRemoteDescription(new RTCSessionDescription({
        sdp: data.answerSdp as string,
        type: (data.answerType as RTCSdpType) ?? 'answer',
      }));
    }
  }));

  stops.push(onSnapshot(calleeCandidates, (snap) => {
    for (const change of snap.docChanges()) {
      if (change.type === 'added') {
        void pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    }
  }));

  return {
    callId: callRef.id,
    pc,
    localStream,
    stop: async () => {
      for (const s of stops) s();
      await endCall(callRef.id, input.callerId, pc, localStream);
    },
  };
}

/** Answers a ringing call. */
export async function answerCall(input: {
  callId: string; selfId: string;
  onRemoteStream: (s: MediaStream) => void;
  onStatus: (s: CallStatus) => void;
}): Promise<CallHandle> {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');

  const callRef = doc(fb.db, 'calls', input.callId);
  const snap = await getDoc(callRef);
  const data = snap.data();
  if (!data) throw new Error('That call no longer exists.');
  if (!data.offerSdp) throw new Error('That call has no offer to answer.');

  const localStream = await getLocalMedia((data.kind as CallKind) ?? 'audio');
  const pc = new RTCPeerConnection(RTC_CONFIG);
  for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

  const remote = new MediaStream();
  pc.ontrack = (e) => {
    for (const t of e.streams[0]?.getTracks() ?? []) remote.addTrack(t);
    input.onRemoteStream(remote);
  };

  const callerCandidates = collection(callRef, 'callerCandidates');
  const calleeCandidates = collection(callRef, 'calleeCandidates');
  pc.onicecandidate = (e) => {
    if (e.candidate) void addDoc(calleeCandidates, e.candidate.toJSON());
  };

  await pc.setRemoteDescription(new RTCSessionDescription({
    sdp: data.offerSdp as string,
    type: (data.offerType as RTCSdpType) ?? 'offer',
  }));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await updateDoc(callRef, {
    answerSdp: answer.sdp,
    answerType: answer.type,
    status: 'accepted',
    acceptedAt: serverTimestamp(),
  });

  const stops: Unsubscribe[] = [];
  stops.push(onSnapshot(callRef, (s) => {
    const d = s.data();
    if (d) input.onStatus(d.status as CallStatus);
  }));
  stops.push(onSnapshot(callerCandidates, (s) => {
    for (const change of s.docChanges()) {
      if (change.type === 'added') {
        void pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    }
  }));

  return {
    callId: input.callId,
    pc,
    localStream,
    stop: async () => {
      for (const s of stops) s();
      await endCall(input.callId, input.selfId, pc, localStream);
    },
  };
}

export async function declineCall(callId: string, selfId: string) {
  const fb = firebase();
  if (!fb) return;
  await updateDoc(doc(fb.db, 'calls', callId), {
    status: 'declined', endedBy: selfId, endedAt: serverTimestamp(),
  });
}

/**
 * Hangs up and releases the hardware.
 *
 * Stopping the tracks is not optional: without it the camera light stays on
 * after the call ends, which people reasonably read as still being recorded.
 * It runs even if the status write fails, for the same reason.
 */
export async function endCall(
  callId: string, selfId: string,
  pc?: RTCPeerConnection, localStream?: MediaStream,
) {
  try {
    localStream?.getTracks().forEach((t) => t.stop());
    pc?.close();
  } finally {
    const fb = firebase();
    if (fb) {
      try {
        const ref = doc(fb.db, 'calls', callId);
        const snap = await getDoc(ref);
        const status = snap.data()?.status as CallStatus | undefined;
        // A call that never connected was cancelled, not ended — the
        // difference is what the other side's missed-call list shows.
        await updateDoc(ref, {
          status: status === 'ringing' ? 'cancelled' : 'ended',
          endedBy: selfId,
          endedAt: serverTimestamp(),
        });
      } catch {
        // The hardware is already released; a failed status write must not
        // leave the camera on.
      }
    }
  }
}

/** Watches for calls ringing this account. */
export function watchIncomingCalls(
  uid: string, onCall: (call: CallSession | null) => void,
): Unsubscribe | undefined {
  const fb = firebase();
  if (!fb) return undefined;
  // Constrained to calleeId, and that is not optional. The read rule allows a
  // participant, and rules are not filters: an unconstrained listen on the
  // whole collection cannot prove every document is readable, so Firestore
  // refuses the query outright rather than returning the subset.
  //
  // Status is filtered client-side so this stays a single equality filter,
  // which rides the automatic index and needs nothing deployed.
  return onSnapshot(
    query(collection(fb.db, 'calls'), where('calleeId', '==', uid)),
    (snap) => {
      for (const d of snap.docs) {
        const c = { id: d.id, ...d.data() } as CallSession;
        if (c.status === 'ringing') { onCall(c); return; }
      }
      onCall(null);
    },
    () => onCall(null),
  );
}
