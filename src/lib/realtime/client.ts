'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { REALTIME_KEY, REALTIME_URL, realtimeConfigured } from './config';

/**
 * One Supabase client per browser tab.
 *
 * Realtime holds a WebSocket, and a second client means a second socket and a
 * second set of subscriptions — which is how a chat window starts showing
 * every message twice.
 *
 * No auth, no database access: this client exists only to carry Realtime
 * traffic. Reads and writes go through this app's own Server Actions against
 * Prisma, which is where the authorisation rules live.
 */
let client: SupabaseClient | null = null;

export function realtime(): SupabaseClient | null {
  if (!realtimeConfigured) return null;
  client ??= createClient(REALTIME_URL, REALTIME_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}

/**
 * Authorise this browser for private channels.
 *
 * The token is minted by `/api/realtime/token`, which checks — with this app's
 * own session — that the account is actually a member of the thread before it
 * signs anything. Without this a private channel refuses the subscription,
 * which is the point: the anon key alone gets you nothing.
 */
export async function authorise(threadId: string): Promise<boolean> {
  const supabase = realtime();
  if (!supabase) return false;
  try {
    const res = await fetch(`/api/realtime/token?thread=${encodeURIComponent(threadId)}`);
    if (!res.ok) return false;
    const { token } = (await res.json()) as { token?: string };
    if (!token) return false;
    await supabase.realtime.setAuth(token);
    return true;
  } catch {
    return false;
  }
}
