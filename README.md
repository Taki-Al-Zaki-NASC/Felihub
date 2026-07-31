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
cp .env.example .env.local     # fill DATABASE_URL + DIRECT_URL
npm install
npx prisma db push
npm run dev
```

## Status — Step 1 of the rebuild

Built and verified (`npm run typecheck && npm run build` both clean):

- Folder structure and route groups: `(marketing)`, `(auth)`, `(platform)`
- Prisma schema — 14 models covering roles, KYC, escrow, milestones,
  owner-blind challenges, ledger, threads, reviews, notifications
- Root layout: fonts, viewport, Felicek tokens
- `AppShell` — fixed top bar, role-aware sidebar, mobile drawer
- `verification.ts` — the single definition of "may act"
- Prisma singleton, session loader

Not built yet: every page body, auth provider, Server Actions, realtime,
WebRTC. Those are Steps 2+.

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
