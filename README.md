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
| `DATABASE_URL` | Pooled Postgres connection (Neon/Supabase free tier is fine) |
| `DIRECT_URL` | Direct connection, used by `prisma db push` / migrations |
| `AUTH_SECRET` | 32+ random characters — `openssl rand -base64 32` |

Then run `npx prisma db push` once against `DIRECT_URL` to create the tables.

Without them the marketing pages still build and serve; sign-up and sign-in
say plainly that the database is not connected rather than throwing.

## Status

The public site and the full signed-in product are built and working:

- **Marketing** — landing, how-it-works, pricing, about, 404 and error pages
- **Auth** — sign-up with role selection, sign-in, signed JWT session cookie,
  bcrypt password hashing
- **Onboarding** — profile, avatar (downscaled in the browser to a ~30 KB data
  URL, so no object storage to provision), then verification
- **Verification** — real ICAO 9303 check-digit and Bangladesh NID validation,
  free during the beta but still gated on both document *and* deposit
- **Hirers** — dashboard, talent directory, post a job, read bids, hire (which
  funds escrow in the same transaction), contracts, wallet with a top-up
- **Freelancers** — dashboard, job board with search, bid (free, no credits),
  contracts, wallet
- **Both** — messages with threads, notifications, public profiles, settings

Verified by driving the product end to end in a real browser against a real
Postgres: sign up → onboard → verify → post → bid → hire → escrow → message,
as both roles. That walk is what found the two dead ends fixed below.

Not built yet: WebRTC calls, skill challenges, milestone release, reviews,
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
