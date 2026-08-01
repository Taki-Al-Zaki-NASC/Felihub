-- Supabase Realtime authorisation for Felicek.
--
-- Paste into Supabase → SQL Editor → New query, once, after the tables exist.
--
-- ── Why this file exists ────────────────────────────────────────────────
--
-- The anon key ships to every browser. On a *public* Realtime channel that is
-- all anyone needs to subscribe, so anybody who could guess a thread id would
-- receive that conversation's messages as they were sent. Felicek therefore
-- only ever joins channels with `private: true`, and Supabase applies the
-- policies below to those.
--
-- The token a browser presents is minted by /api/realtime/token, which checks
-- against this application's own database that the account is a member of the
-- thread before signing anything. The policy here is the second half of that:
-- it pins the token to the one channel it was issued for, so a token for one
-- conversation cannot be replayed against another.
--
-- Requires SUPABASE_JWT_SECRET to be set on the deployment — Supabase →
-- Project Settings → API → JWT Secret.

-- Realtime's own table for channel authorisation.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Read: may this connection receive traffic on this channel?
DROP POLICY IF EXISTS "felicek thread read" ON realtime.messages;
CREATE POLICY "felicek thread read"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- The channel is named thread:<id>, and the token carries the thread it
    -- was issued for. Equal, or no traffic.
    realtime.topic() = 'thread:' || coalesce(
      (current_setting('request.jwt.claims', true)::json ->> 'thread'), ''
    )
  );

-- Write: may this connection broadcast on this channel?
DROP POLICY IF EXISTS "felicek thread write" ON realtime.messages;
CREATE POLICY "felicek thread write"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() = 'thread:' || coalesce(
      (current_setting('request.jwt.claims', true)::json ->> 'thread'), ''
    )
  );
