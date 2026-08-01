/**
 * Whether Supabase Realtime is configured, and what to call the channels.
 *
 * Everything that uses Realtime degrades when it is absent: chat still works
 * over the ordinary request/response path it always did, and calls are simply
 * not offered. A missing environment variable must never be an error page.
 */
export const REALTIME_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const REALTIME_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const realtimeConfigured = Boolean(REALTIME_URL && REALTIME_KEY);

/**
 * One channel per conversation, carrying both the chat and the call.
 *
 * The two share a channel on purpose: a call is negotiated between exactly the
 * people already in the thread, and a second channel would be a second thing
 * to authorise correctly.
 *
 * `private:` matters. Supabase only applies channel authorisation to private
 * channels — on a public one, anyone holding the anon key (which ships to
 * every browser) could subscribe to any channel name they can guess. See
 * `prisma/realtime.sql` for the policy that decides who may join.
 */
export const threadChannel = (threadId: string) => `thread:${threadId}`;

/** What travels on a thread channel. */
export type RealtimeEvent =
  | { type: 'message'; id: string; senderId: string; body: string; createdAt: string }
  | { type: 'typing'; senderId: string }
  | { type: 'call-offer'; from: string; sdp: string; video: boolean }
  | { type: 'call-answer'; from: string; sdp: string }
  | { type: 'call-ice'; from: string; candidate: unknown }
  | { type: 'call-end'; from: string };
