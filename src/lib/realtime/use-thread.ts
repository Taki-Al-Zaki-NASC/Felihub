'use client';

import * as React from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { authorise, realtime } from './client';
import { threadChannel, type RealtimeEvent } from './config';

/**
 * A subscription to one conversation.
 *
 * Returns a `send` that broadcasts, and calls `onEvent` for everything that
 * arrives from anybody else. Returns `connected: false` and a no-op `send`
 * when Realtime is not configured — every caller has to keep working without
 * it, because the ordinary request/response path is what runs in development
 * and on a deployment that has not set the keys.
 *
 * Broadcast, not Postgres changes: the message row is already written by the
 * Server Action, and listening to replication would mean waiting for the write
 * to land and come back. Broadcasting from the sender's browser the moment the
 * action succeeds is one hop instead of three.
 */
export function useThreadChannel(
  threadId: string,
  selfId: string,
  onEvent: (event: RealtimeEvent) => void,
) {
  const [connected, setConnected] = React.useState(false);
  const channelRef = React.useRef<RealtimeChannel | null>(null);

  // Kept in a ref so re-rendering with a new handler does not tear the
  // subscription down and put it back up — which drops whatever arrives in
  // between.
  const handler = React.useRef(onEvent);
  React.useEffect(() => { handler.current = onEvent; }, [onEvent]);

  React.useEffect(() => {
    let cancelled = false;
    const supabase = realtime();
    if (!supabase) return undefined;

    (async () => {
      const allowed = await authorise(threadId);
      if (!allowed || cancelled) return;

      const channel = supabase
        .channel(threadChannel(threadId), { config: { private: true } })
        .on('broadcast', { event: 'thread' }, ({ payload }) => {
          const event = payload as RealtimeEvent;
          // Own traffic comes back on the channel; the sender has already
          // rendered it optimistically and does not want it twice.
          if ('senderId' in event && event.senderId === selfId) return;
          if ('from' in event && event.from === selfId) return;
          handler.current(event);
        })
        .subscribe((status) => {
          if (!cancelled) setConnected(status === 'SUBSCRIBED');
        });

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      const channel = channelRef.current;
      channelRef.current = null;
      setConnected(false);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [threadId, selfId]);

  const send = React.useCallback((event: RealtimeEvent) => {
    const channel = channelRef.current;
    if (!channel) return;
    void channel.send({ type: 'broadcast', event: 'thread', payload: event });
  }, []);

  return { connected, send };
}
