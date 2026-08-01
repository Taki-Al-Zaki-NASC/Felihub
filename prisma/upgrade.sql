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

-- ── Jobs advertise an expected duration ──────────────────────────────────
-- The client's calendar estimate, distinct from Proposal.timelineDays, which
-- is what a freelancer offers back.
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER;

-- ── Authorship signals: how a piece of writing arrived ───────────────────
-- Typed into the form, or pasted in from somewhere else. A separate table
-- because Profile, Job and Proposal all want the same fields.
--
-- Counts only — never keystrokes, never clipboard contents. `score` is the
-- stylometric model's output, stored for calibration and shown to nobody:
-- see src/lib/authorship/index.ts for the measurement that made displaying it
-- unacceptable.
CREATE TABLE IF NOT EXISTS "ContentSignal" (
  "id"        TEXT NOT NULL,
  "kind"      TEXT NOT NULL,
  "refId"     TEXT NOT NULL,
  "band"      TEXT NOT NULL,
  "score"     INTEGER NOT NULL DEFAULT 0,
  "reasons"   TEXT[],
  "typed"     INTEGER NOT NULL DEFAULT 0,
  "pasted"    INTEGER NOT NULL DEFAULT 0,
  "words"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentSignal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContentSignal_kind_refId_key"
  ON "ContentSignal"("kind", "refId");
CREATE INDEX IF NOT EXISTS "ContentSignal_band_idx" ON "ContentSignal"("band");

-- ── Startup fundraising ──────────────────────────────────────────────────
-- All-or-nothing raises, with pledges held in the same escrow that holds job
-- milestones. A pledge buys no equity — see src/server/services/raises.ts for
-- why that is a deliberate limit and not a missing feature.
DO $$ BEGIN
  ALTER TYPE "LedgerKind" ADD VALUE IF NOT EXISTS 'PLEDGE';
  ALTER TYPE "LedgerKind" ADD VALUE IF NOT EXISTS 'PLEDGE_RELEASE';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RaiseStatus" AS ENUM ('DRAFT','OPEN','FUNDED','EXPIRED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PledgeStatus" AS ENUM ('HELD','RELEASED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Raise" (
  "id"             TEXT NOT NULL,
  "founderId"      TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "summary"        TEXT NOT NULL,
  "category"       TEXT NOT NULL,
  "stage"          TEXT NOT NULL,
  "useOfFunds"     JSONB NOT NULL,
  "traction"       TEXT,
  "websiteUrl"     TEXT,
  "goalCents"      INTEGER NOT NULL,
  "raisedCents"    INTEGER NOT NULL DEFAULT 0,
  "backersCount"   INTEGER NOT NULL DEFAULT 0,
  "minPledgeCents" INTEGER NOT NULL DEFAULT 1000,
  "deadline"       TIMESTAMP(3) NOT NULL,
  "status"         "RaiseStatus" NOT NULL DEFAULT 'OPEN',
  "settledAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Raise_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Raise_status_deadline_idx" ON "Raise"("status","deadline");
CREATE INDEX IF NOT EXISTS "Raise_founderId_idx" ON "Raise"("founderId");
CREATE INDEX IF NOT EXISTS "Raise_category_status_idx" ON "Raise"("category","status");

CREATE TABLE IF NOT EXISTS "Pledge" (
  "id"          TEXT NOT NULL,
  "raiseId"     TEXT NOT NULL,
  "backerId"    TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status"      "PledgeStatus" NOT NULL DEFAULT 'HELD',
  "note"        TEXT,
  "anonymous"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt"   TIMESTAMP(3),
  CONSTRAINT "Pledge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Pledge_raiseId_backerId_key" ON "Pledge"("raiseId","backerId");
CREATE INDEX IF NOT EXISTS "Pledge_backerId_createdAt_idx" ON "Pledge"("backerId","createdAt");
CREATE INDEX IF NOT EXISTS "Pledge_raiseId_status_idx" ON "Pledge"("raiseId","status");

DO $$ BEGIN
  ALTER TABLE "Raise" ADD CONSTRAINT "Raise_founderId_fkey"
    FOREIGN KEY ("founderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_raiseId_fkey"
    FOREIGN KEY ("raiseId") REFERENCES "Raise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_backerId_fkey"
    FOREIGN KEY ("backerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
