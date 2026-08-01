-- Felicek v2 — bring an existing database up to the current schema.
--
-- Run this if you created your tables from prisma/init.sql before milestones,
-- public bids, skill challenges and category matching were added. Symptom: the
-- site shows "Something broke" on pages that read the new columns, because the
-- code selects a column the database does not have.
--
-- Open your provider's SQL editor (Supabase → SQL Editor → New query), paste
-- the whole file, run it. Every statement is idempotent — running it twice, or
-- on a database that is already current, does nothing and errors on nothing.
--
-- `npx prisma db push` does the same thing if you have the repo locally.

-- ── Freelancers and clients pick a category ───────────────────────────────
-- Used by the job board's match score, which is why a missing column here
-- breaks /jobs rather than just hiding a field.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "category" TEXT;
CREATE INDEX IF NOT EXISTS "Profile_category_idx" ON "Profile"("category");

-- ── Bids may be revised twice, and the count has to live somewhere ────────
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "revisions" INTEGER NOT NULL DEFAULT 0;

-- ── Milestones: funded and released are two separate facts ───────────────
-- Money enters escrow when a milestone is funded and leaves when it is
-- released. A single "paid" flag could not tell those apart, which is the
-- distinction escrow exists for.
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "funded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "fundedAt" TIMESTAMP(3);

-- Existing rows predate the flag. Anything already released was necessarily
-- funded first, so backfill rather than leaving a released-but-unfunded row
-- that no code path can produce.
UPDATE "Milestone" SET "funded" = true WHERE "released" = true AND "funded" = false;

-- ── Challenges: attempts, time limits, and live interviews ───────────────
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "timeLimitMins" INTEGER;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);

-- ── Challenge answers are one row per attempt ────────────────────────────
ALTER TABLE "ChallengeAnswer" ADD COLUMN IF NOT EXISTS "attempt" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ChallengeAnswer" ADD COLUMN IF NOT EXISTS "scorePct" INTEGER;

-- The old constraint allowed one answer per proposal, which is exactly what a
-- second attempt needs to violate. Uniqueness moves to the pair.
DROP INDEX IF EXISTS "ChallengeAnswer_proposalId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeAnswer_proposalId_attempt_key"
  ON "ChallengeAnswer"("proposalId", "attempt");
CREATE INDEX IF NOT EXISTS "ChallengeAnswer_challengeId_idx"
  ON "ChallengeAnswer"("challengeId");

-- ── Proposal privacy: the fields only the bidder and the job owner may read ─
-- Added with the privacy work. `note` (the cover letter) and `bidCents`
-- already existed; these complete the private set.
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "timelineDays" INTEGER;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
