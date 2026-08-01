# Felicek v2

Verified freelance marketplace. Full-stack TypeScript on Next.js, deployed on
Vercel's free tier.

**v1 (Firebase + Firestore) is preserved on the `v1-firebase` branch** and is
still deployable. Nothing was lost in this rebuild.

## Stack

Next.js 15 App Router · React 19 · TypeScript · Tailwind + shadcn/ui (Radix,
Lucide) · PostgreSQL + Prisma · Server Actions · Zod · TanStack Query ·
Zustand · WebRTC.

## One decision still open

**Socket.io cannot run on Vercel.** Its functions are serverless and
short-lived; there is no persistent process to hold a WebSocket. Building on
it means chat works locally and silently fails in production.

The scaffold assumes **Supabase Realtime** (Postgres logical replication over
WebSocket) for chat, live notifications and WebRTC signalling — free tier, no
server to run, and it gives us Postgres too. Media still travels peer to peer;
only signalling changes.

If Socket.io is required, it needs a small always-on host (Railway/Fly), which
breaks "Vercel only". Say which and Step 2 wires it.

`prisma/schema.prisma` and `src/server/services/verification.ts` encode the
business model; read those first.

## Setup

```bash
cp .env.example .env.local     # DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm install
npx prisma db push
npm run dev
```

### Deploying to Vercel

Three environment variables, all required before accounts work:

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | **Pooled** connection. Supabase: "Transaction pooler", port 6543, and it **must** end with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | **Direct** connection. Supabase: port 5432. Used by `prisma db push` |
| `AUTH_SECRET` | 32+ random characters — `openssl rand -base64 32` |

If the database password contains `@ : / ? #`, URL-encode it — an unencoded
`@` splits the connection string in the wrong place and shows up as an
authentication failure.

**Then create the tables.** Setting the variables is not enough; a connected
database with no tables fails every sign-in. Either:

```bash
npx prisma db push        # needs the repo checked out locally
```

…or, with no local setup at all, paste **`prisma/init.sql`** into your
provider's SQL editor (Supabase → SQL Editor → New query) and run it. That
file is generated from `prisma/schema.prisma` and creates all 14 tables with
their enums, indexes and foreign keys.

### If the site feels slow

Check **`/api/health`** first — it reports `dbLatencyMs`, the round trip for one
query. Every signed-in page runs two or three, so this number is most of the
wait.

- **Under ~60 ms** — the database is not your problem.
- **200 ms or more** — the database is almost certainly in a different region
  from your functions. Every query pays that twice. Fix it in Vercel →
  Settings → Functions → **Function Region**, set to whichever is nearest your
  Supabase project's region. This is usually the single biggest win, and it
  costs nothing.
- **A long wait and then an error, on the first request after a quiet
  period** — Supabase pauses free-tier projects after a week of inactivity.
  The first request wakes it, which takes far longer than any request timeout
  allows. Open the Supabase dashboard once to resume it.

Two things the app itself does to stay quick, worth not undoing:

- **Avatars are never inlined.** They used to be base64 data URLs selected in
  the session lookup, so ~19 KB of image rode in the HTML of *every* page and
  the talent directory approached a megabyte before any content. They are now
  served from `/api/avatar/[username]` with an ETag, so the browser fetches
  each one once and revalidates with a 304.
- **Every signed-in route has a `loading.tsx`.** These pages are rendered on
  demand against the database, so there is always a wait; without a skeleton
  the browser holds the *previous* page for the whole of it and the click
  appears to have done nothing.

### Sample data

```bash
npm run db:seed
```

Three verified client accounts and eight job posts across Data Engineering,
AI Research & Evaluation and Data Science & Analytics — with real milestone
breakdowns, durations and budgets, so the board, the category filter and the
match score have something to work against.

It is idempotent: run it twice and nothing changes, and it never deletes a row
it did not create. Seed accounts are prefixed `sample-` and named "(sample)",
so a real freelancer browsing the board can tell demonstration data from
somebody's actual budget.

The script validates itself before writing anything: every skill must exist in
`src/lib/categories.ts`, and every job's milestones must sum to its budget. A
skill typo is otherwise invisible — the job saves and then matches nobody,
because the match score compares against the list freelancers pick from.

### Upgrading an existing database

`prisma/init.sql` builds a database from nothing. When the schema changes, an
*existing* database needs **`prisma/upgrade.sql`** instead — paste it into the
same SQL editor. It is idempotent, so running it twice, or on a database that
is already current, does nothing and errors on nothing.

Skipping it looks like "Something broke" on whichever page reads a column the
database does not have yet. `/api/health` names the missing columns.

`npx prisma db push` does the same thing if you have the repo locally.

### Is this deployment actually working?

**`/api/health`** answers it in one request — no log-diving:

```json
{ "ok": true, "checks": { "databaseUrlSet": true, "authSecretSet": true,
  "databaseReachable": true, "tablesPresent": true, "users": 0 } }
```

When something is wrong it names the cause and the fix, e.g. *"The database is
connected, but its tables have not been created yet. Run `npx prisma db push`
against DIRECT_URL."* It never returns connection strings, host names or
credentials.

Without any of the three variables the marketing pages still build and serve;
sign-up and sign-in say plainly what is missing rather than throwing.

## Status

The public site and the full signed-in product are built and working:

- **Marketing** — landing, how-it-works, pricing, about, 404 and error pages
- **Auth** — sign-up with role selection, sign-in, signed JWT session cookie,
  bcrypt password hashing
- **Onboarding** — profile, avatar (downscaled in the browser to a ~30 KB data
  URL, so no object storage to provision), then verification
- **Verification** — real ICAO 9303 check-digit and Bangladesh NID validation,
  free during the beta but still gated on both document *and* deposit
- **Hirers** — dashboard, talent directory, post a job with mandatory
  milestones, read public bids, hire (which funds the first milestone into
  escrow), fund and release each milestone, contracts, wallet with a top-up
- **Freelancers** — dashboard, job board filtered to 95% matches on category
  and skills, bid free with two revisions, skill challenges, contracts, wallet
- **Both** — messages with threads, notifications, public profiles, settings

Verified by driving the product end to end in a real browser against a real
Postgres: sign up → onboard → verify → post → bid → hire → escrow → message,
as both roles. That walk is what found the two dead ends fixed below.

Not built yet: WebRTC calls (blocked on the transport decision above), reviews,
deliverable watermarking, and the payment gateway. The schema carries all of
them.

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

- **Build, as Vercel does** — `npm ci && typecheck && build` with *no*
  environment variables set, then asserts the build produced real routes. The
  first v2 deploy 404'd on every path because the App Router had no `page.tsx`
  anywhere and the build still exited zero; this guard fails that build.
- **Walk the product** — `e2e/walk.mjs` against a real Postgres service
  container: sign up, onboard, verify, post, bid, hire, fund escrow, message,
  sign out, sign back in, as both a client and a freelancer. Any 5xx, uncaught
  exception or console error anywhere in that walk fails the run.

Run the walk locally against a database:

```bash
npm run build && npm start &
BASE=http://localhost:3000 npm run test:e2e
```

CI does **not** touch your production database. It creates a throwaway
Postgres inside the runner, uses it, and destroys it.

## One decision still open

**Socket.io cannot run on Vercel** — see the top of this file. Messaging works
today on ordinary request/response; live delivery needs that decision.

## Proposal privacy

`src/server/services/proposals.ts` is the only module that reads the Proposal
table. Everything about a bid except who sent it is commercially sensitive —
amount, cover letter, delivery estimate, attachment — because a competitor who
can read them undercuts the best bid to the cent and reuses its pitch.

| Viewer | Sees |
| --- | --- |
| Anyone signed in | Proposal count, who applied, their public profile, status |
| The bidder | All of that, plus their own amount, letter, timeline, attachment |
| The job's owner | Every field of every proposal on their job, plus challenge scores |

The enforcement is structural. `PUBLIC_SELECT` and `PRIVATE_SELECT` are
separate Prisma selects, so the sensitive columns are never *fetched* for a
viewer who may not see them — not fetched and then stripped. Nothing in memory
holds a secret a stray serialisation could leak, and the two return types have
different shapes, so rendering an amount you were not given does not compile.

Milestone amounts are gated the same way: once someone is hired they sum to
exactly the accepted bid, so they are shown only to the client and the person
working on the job.

**Why not RLS.** Prisma connects as one pooled application role, so `auth.uid()`
is null and every request looks identical to Postgres. Carrying the viewer in a
session variable would mean `SET LOCAL` inside a transaction on every query,
which transaction-mode pooling makes unsafe. If the browser ever talks to
Supabase directly, add RLS *as well* — a second layer, not a replacement.

The walk signs up a third freelancer whose only job is to try to read a rival's
bid, and checks the rendered text *and* the raw HTML payload for canary strings
planted in the cover letter and attachment URL.

## Two dead ends found by using the product

Both were invisible from the code and obvious within a minute of driving it.

**A verified freelancer could not bid.** `meetsMandatoryRequirements` requires a
profile photo, and there was nowhere in the product to upload one — so the
account was permanently stuck one step from its first bid. Fixed by adding the
avatar upload to onboarding *and* refusing to save a freelancer profile without
one, so the wall is hit where it can be cleared rather than at bid time.

**A verified client could not hire.** Escrow is funded from the posting
balance, the beta grants $50, and no top-up existed — so any job worth more
than $50 could never be filled. Fixed by adding a top-up on the Wallet page,
labelled on the ledger as a beta credit rather than a payment.

## Two v1 bugs this structure prevents by construction

**Verification drift.** v1 kept a client-side `isVerified` that omitted
`idSubmitted` while the security rules required it, so an account that paid
before submitting documents was verified in the UI and refused by the
database — the app unlocked posting, took a full listing, and failed the write
at the end. There is now one definition, on the server, in
`services/verification.ts`. Components receive the result; they never derive
it.

**Owner-blind challenges by schema.** The answer key lives on `Challenge`, the
freelancer's full answer on `ChallengeAnswer`, and the owner-visible summary on
`Proposal`. Separate tables, so showing a client someone else's work requires a
join nobody has a reason to write — rather than remembering to strip a field.
