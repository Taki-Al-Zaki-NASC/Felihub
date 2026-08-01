'use client';

import * as React from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { realtimeConfigured, type RealtimeEvent } from '@/lib/realtime/config';
import { useThreadChannel } from '@/lib/realtime/use-thread';

/**
 * Voice and video, peer to peer.
 *
 * The media never reaches a server of ours — WebRTC negotiates a direct
 * connection and the audio and video travel between the two browsers. What
 * goes over Supabase Realtime is only the negotiation: an offer, an answer,
 * and the ICE candidates that let the two sides find each other. That is the
 * whole reason Realtime is enough for this and Socket.io was not needed;
 * signalling is a handful of small messages, not a stream.
 *
 * STUN only, no TURN. Two peers behind symmetric NAT will fail to connect, and
 * the UI says so rather than sitting on "connecting" forever — TURN means
 * relaying media through a server somebody pays for, which is a decision with
 * a bill attached rather than a line of code.
 */
const ICE: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};

type Phase = 'idle' | 'ringing' | 'incoming' | 'connecting' | 'live' | 'failed';

export function CallPanel({ threadId, selfId, otherName }: {
  threadId: string;
  selfId: string;
  otherName: string;
}) {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [withVideo, setWithVideo] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [cameraOff, setCameraOff] = React.useState(false);
  const [problem, setProblem] = React.useState<string>();

  const pc = React.useRef<RTCPeerConnection | null>(null);
  const localStream = React.useRef<MediaStream | null>(null);
  const pendingIce = React.useRef<RTCIceCandidateInit[]>([]);
  const localVideo = React.useRef<HTMLVideoElement>(null);
  const remoteVideo = React.useRef<HTMLVideoElement>(null);
  const remoteAudio = React.useRef<HTMLAudioElement>(null);

  const sendRef = React.useRef<(e: RealtimeEvent) => void>(() => {});

  const hangUp = React.useCallback((tell = true) => {
    if (tell) sendRef.current({ type: 'call-end', from: selfId });
    pc.current?.close();
    pc.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    pendingIce.current = [];
    setPhase('idle');
    setMuted(false);
    setCameraOff(false);
  }, [selfId]);

  /** Builds the connection and wires both directions of media. */
  const peer = React.useCallback(async (video: boolean) => {
    const connection = new RTCPeerConnection(ICE);
    pc.current = connection;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true, video,
    });
    localStream.current = stream;
    stream.getTracks().forEach((t) => connection.addTrack(t, stream));
    if (localVideo.current && video) localVideo.current.srcObject = stream;

    connection.ontrack = (e) => {
      const [remote] = e.streams;
      if (remoteVideo.current) remoteVideo.current.srcObject = remote;
      if (remoteAudio.current) remoteAudio.current.srcObject = remote;
    };
    connection.onicecandidate = (e) => {
      if (e.candidate) {
        sendRef.current({ type: 'call-ice', from: selfId, candidate: e.candidate.toJSON() });
      }
    };
    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      if (state === 'connected') setPhase('live');
      if (state === 'failed') {
        // Almost always both peers behind symmetric NAT, which STUN cannot
        // traverse. Saying so beats "connecting…" forever.
        setProblem(
          'The two sides could not reach each other directly. That usually '
          + 'means a restrictive network on one end; a relay server would fix '
          + 'it and there is not one configured.',
        );
        setPhase('failed');
      }
      if (state === 'disconnected' || state === 'closed') hangUp(false);
    };
    return connection;
  }, [selfId, hangUp]);

  const onEvent = React.useCallback(async (event: RealtimeEvent) => {
    try {
      if (event.type === 'call-offer') {
        setWithVideo(event.video);
        setPhase('incoming');
        // The offer is held until it is answered — accepting is a decision,
        // and opening the microphone before somebody makes it is not on.
        (window as unknown as { __felicekOffer?: string }).__felicekOffer = event.sdp;
        return;
      }
      if (event.type === 'call-answer') {
        await pc.current?.setRemoteDescription({ type: 'answer', sdp: event.sdp });
        for (const c of pendingIce.current) await pc.current?.addIceCandidate(c);
        pendingIce.current = [];
        setPhase('connecting');
        return;
      }
      if (event.type === 'call-ice') {
        const candidate = event.candidate as RTCIceCandidateInit;
        // Candidates can arrive before the answer is applied; hold them rather
        // than throwing them away, which is what makes a call connect on a
        // slow network instead of failing.
        if (pc.current?.remoteDescription) await pc.current.addIceCandidate(candidate);
        else pendingIce.current.push(candidate);
        return;
      }
      if (event.type === 'call-end') hangUp(false);
    } catch {
      setProblem('The call could not be set up.');
      setPhase('failed');
    }
  }, [hangUp]);

  const { connected, send } = useThreadChannel(threadId, selfId, onEvent);
  React.useEffect(() => { sendRef.current = send; }, [send]);

  const start = async (video: boolean) => {
    setProblem(undefined);
    setWithVideo(video);
    setPhase('ringing');
    try {
      const connection = await peer(video);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      send({ type: 'call-offer', from: selfId, sdp: offer.sdp ?? '', video });
    } catch {
      setProblem('Could not use your microphone or camera. Check the browser’s permission.');
      setPhase('failed');
    }
  };

  const accept = async () => {
    setProblem(undefined);
    setPhase('connecting');
    try {
      const connection = await peer(withVideo);
      const sdp = (window as unknown as { __felicekOffer?: string }).__felicekOffer ?? '';
      await connection.setRemoteDescription({ type: 'offer', sdp });
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      send({ type: 'call-answer', from: selfId, sdp: answer.sdp ?? '' });
      for (const c of pendingIce.current) await connection.addIceCandidate(c);
      pendingIce.current = [];
    } catch {
      setProblem('Could not use your microphone or camera. Check the browser’s permission.');
      setPhase('failed');
    }
  };

  React.useEffect(() => () => hangUp(false), [hangUp]);

  if (!realtimeConfigured) {
    return (
      <span className="text-xs text-ink-faint" title="Calls need Supabase Realtime configured">
        Calls off
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={() => start(false)}
        disabled={!connected || phase !== 'idle'}
        aria-label={`Voice call ${otherName}`}
        className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-backdrop disabled:opacity-40">
        <Phone className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => start(true)}
        disabled={!connected || phase !== 'idle'}
        aria-label={`Video call ${otherName}`}
        className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-backdrop disabled:opacity-40">
        <Video className="h-4 w-4" />
      </button>

      {phase !== 'idle' && (
        <div role="dialog" aria-label="Call"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-ink-strong p-4 text-canvas sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-80 sm:rounded-xl sm:border">
          <p className="text-sm font-semibold">
            {phase === 'ringing' && `Calling ${otherName}…`}
            {phase === 'incoming' && `${otherName} is calling`}
            {phase === 'connecting' && 'Connecting…'}
            {phase === 'live' && `On a call with ${otherName}`}
            {phase === 'failed' && 'The call did not connect'}
          </p>
          {problem && <p className="mt-1 text-xs text-white/70">{problem}</p>}

          {withVideo && (phase === 'live' || phase === 'connecting') && (
            <div className="relative mt-3 overflow-hidden rounded-lg bg-black">
              <video ref={remoteVideo} autoPlay playsInline
                className="aspect-video w-full object-cover" />
              <video ref={localVideo} autoPlay playsInline muted
                className="absolute bottom-2 right-2 w-24 rounded border border-white/20" />
            </div>
          )}
          <audio ref={remoteAudio} autoPlay />

          <div className="mt-3 flex flex-wrap gap-2">
            {phase === 'incoming' && (
              <button type="button" onClick={accept}
                className="min-h-[36px] flex-1 rounded-md bg-teal px-3 text-sm font-semibold">
                Answer
              </button>
            )}
            {(phase === 'live' || phase === 'connecting') && (
              <>
                <button type="button"
                  onClick={() => {
                    const track = localStream.current?.getAudioTracks()[0];
                    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); }
                  }}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
                  {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                {withVideo && (
                  <button type="button"
                    onClick={() => {
                      const track = localStream.current?.getVideoTracks()[0];
                      if (track) { track.enabled = !track.enabled; setCameraOff(!track.enabled); }
                    }}
                    aria-label={cameraOff ? 'Turn the camera on' : 'Turn the camera off'}
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
                    {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </button>
                )}
              </>
            )}
            <button type="button" onClick={() => hangUp()}
              aria-label="End the call"
              className="ml-auto flex h-9 items-center gap-1.5 rounded-md bg-danger px-3 text-sm font-semibold">
              <PhoneOff className="h-4 w-4" /> {phase === 'incoming' ? 'Decline' : 'End'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
