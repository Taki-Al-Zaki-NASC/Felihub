# Felicek v2

Verified marketplace with three sides: hire someone, get hired, or back a
founder. Full-stack TypeScript on Next.js, deployed on Vercel's free tier.

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
file is generated from `prisma/schema.prisma` and creates all 17 tables with
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

A marketplace with both sides of it filled in:

| | |
| --- | --- |
| **5 verified clients** | a manufacturer, a mobile operator, a research group, an analytics platform, a fintech |
| **14 open jobs** | 6 applied AI/ML (PyTorch fine-tuning, RAG, speech, recommenders, MLOps), 3 data engineering, 3 AI research & evaluation, 2 analytics |
| **9 verified freelancers** | with headlines, skills, languages, rates and work history |
| **22 live bids** | so the board shows real proposal counts, not zeroes |
| **13 completed contracts** | each with a review, which is where the ratings and earnings come from |
| **3 founders raising** | 15 pledges from the sample clients and freelancers, so the progress bars are sums of real rows |

The data is in `prisma/seed-ai-jobs.ts`, `seed-freelancers.ts`,
`seed-history.ts` and `seed-startups.ts`; `seed.ts` is only the writer.

**Ratings are not declared, they are earned.** The profile page lists the
actual `Review` rows next to the average, so a rating with no rows behind it
would contradict itself on screen. Each completed contract therefore closes
its job, marks the winning proposal COMPLETED, funds and releases every
milestone through the same arithmetic `releaseMilestone` uses — gross, less
the 1% fee — and leaves one review. "$8,959.50 earned" on a profile is the sum
of those releases.

Re-running is safe. Everything is written against a deterministic key, so a
second run updates rather than duplicating, and it never deletes a row it did
not create. The denormalised counters — proposal counts, ratings, lifetime
earnings — are recomputed and *set*, never incremented, because a seed that is
only correct the first time is worse than no seed. Timestamps are the one
thing a re-run changes: postings are dated relative to now, so the board reads
"posted 3 days ago" instead of aging into a wall of eight-month-old work.

Seed accounts are prefixed `sample-` and named "(sample)", so a real
freelancer browsing the board can tell demonstration data from somebody's
actual budget. None of them can sign in — `passwordHash` is null, which
`signInAction` refuses outright.

The script validates itself before writing anything: every skill must exist in
`src/lib/categories.ts`, every job's milestones must sum to its budget, every
reference must resolve, and every freelancer must have either a bid or a
contract. A skill typo is otherwise invisible — the job saves and then matches
nobody, because the match score compares against the list freelancers pick
from.

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
- **Startup fundraising** — `/startups`, public. A verified founder publishes
  what they are building, what the money is for and a deadline; any verified
  account can pledge. All-or-nothing: pledges sit in the same escrow as job
  milestones and are refunded in full if the goal is missed. **No equity** —
  see below
- **Public job board** — `/browse` and `/browse/[id]`, readable with no
  account. Everything else in the product was behind the sign-in wall, which
  meant a visitor had to verify their identity before they could find out
  whether there was any work worth verifying for. It is also the only way
  these listings are ever indexed by a search engine. Only open jobs are
  served, and the Proposal table is never read on that path
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
- **Authorship** — every bio, brief and cover letter records whether it was
  typed or pasted, shown to reader and author alike (see below)

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

## Startup fundraising

The third side of the same marketplace: the same accounts, the same identity
checks and the same escrow, pointed at a founder who needs money rather than a
contractor. A client or a freelancer already here can back one.

```
founder publishes  →  people pledge  →  deadline
                                          ├─ goal met     → founder is paid, less 1%
                                          └─ goal missed  → every pledge refunded in full
```

**A pledge buys no equity.** No shares, no dividend, no revenue share, no claim
on the company, and nothing in `prisma/schema.prisma` is capable of
representing one. Selling a stake in a company to the public is a securities
offering — Reg CF and a registered funding portal in the US, an FCA-authorised
platform in the UK, BSEC's own regime in Bangladesh — and running one without
authorisation is a criminal offence in most of them. Doing equity properly
starts with a licence and a lawyer, not with a column called `equityPct`. The
constraint is stated on the listing, on every raise, and on the publish form,
because somebody about to send money should not have to infer it.

**All-or-nothing**, because partial funding is how a backer pays for a third of
a thing that then never gets built. The money leaves the backer's account when
they pledge rather than when the raise closes: a progress bar made of unfunded
promises tells a backer nothing.

Two details worth not undoing:

- **Pledges draw from the wallet first, then the posting balance.** Taking them
  from the wallet alone was a dead end — a client has no wallet balance until
  they have been paid for something, and clients are half the people this is
  for. `Pledge.fromPostingCents` records the split so a refund goes back where
  it came from; refunding a client's posting balance into their wallet would
  leave them unable to hire with their own money.
- **Raises settle when somebody reads the page.** There is no cron on Vercel's
  free tier, and a backer's money must not sit in escrow because a scheduled
  job nobody set up did not run. `settleDueRaises` is idempotent and only ever
  moves rows out of `OPEN`.

## Authorship: how a piece of writing got here

`src/lib/authorship/` records whether a bio, a job description or a cover
letter was **typed into the form or pasted in from somewhere else**, and shows
that next to the text. Read `src/lib/authorship/index.ts` before changing any
of it; the summary is below.

### What it does not do

It does not tell you whether AI wrote something. Nothing can. OpenAI withdrew
its own classifier in 2023 over exactly this, and a percentage next to
somebody's writing is a number, not a measurement.

The stylometric model is built, tested and **switched off**, and the reason is
in the repository rather than in an argument. `npm run authorship:eval` scores
hand-labelled samples:

```
                 flagged   not flagged
  assisted            5             0
  human               4             5

  Second-language writers, human-written: 4 samples, 4 flagged (100%)
```

Every human sample written in second-language English was flagged — scoring
95–97, above a genuinely machine-written sample at 85. Feature by feature,
nothing separates careful second-language writing from model output:

| | native | assisted | second-language |
| --- | --- | --- | --- |
| contractions / 1000 words | 31–98 | 0 | 0 |
| informality / 1000 words | 0–21 | 0 | 0 |
| burstiness | .28–.91 | .18–.44 | .08–.30 |

The two features that separate anything separate *native speakers* from
everyone else. That is the result Liang et al. reported in *Patterns* (2023):
seven GPT detectors called over half of non-native TOEFL essays
machine-generated and almost none of the native-written ones. Most of this
marketplace writes English as a second language, so shipping that would mean
quietly marking the people it exists to serve as cheats — and they would never
find out why they stopped getting hired.

So `STYLE_FLAGGING_ENABLED` is `false`, and `npm run authorship:eval` runs in
CI as the gate: it fails the build if the flag is ever turned on while the
model still fails the fairness check.

### What it does do

Provenance. The browser counts characters typed, characters pasted, the size
of the largest paste, corrections, and how long the field was worked on — six
integers, in a hidden input you can read. Never keystrokes, never the contents
of your clipboard, never the text you deleted.

| Band | Means |
| --- | --- |
| **Typed here** | Composed in the form |
| **Pasted from elsewhere** | Arrived by paste. A statement of fact — most people draft in a notes app |
| **Not recorded** | Written before this existed, or scripting turned off. Shown to nobody |

"This arrived in one paste" is an observation about an event. "This reads like
a model" is an inference about a style. Only the first is fair to put next to
someone's name.

Four rules hold everywhere:

- **Nothing is blocked, ranked or rejected.** No band affects matching,
  ordering, verification or eligibility to bid.
- **The author sees exactly what the reader sees**, worded in the second
  person. A score kept from the person it describes is a file, not context.
- **A note is only shown beside text the viewer may already read**, so it
  cannot leak anything about a bid whose contents are hidden.
- **No telemetry means "not recorded"**, never suspicion.

## Proposal privacy

`src/server/services/proposals.ts` is the only module that reads the Proposal
table. Everything about a bid except who sent it is commercially sensitive —
amount, cover letter, delivery estimate, attachment — because a competitor who
can read them undercuts the best bid to the cent and reuses its pitch.

| Viewer | Sees |
| --- | --- |
| A logged-out visitor on `/browse` | The posting and the proposal *count*. Nothing else — that page never reads the Proposal table at all |
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
planted in the cover letter and attachment URL. It does the same again from a
browser with no cookies at all against `/browse`, where the seeded bids are
real rows and none of them may reach a page anyone on the internet can read.

## Four dead ends found by using the product

All invisible from the code and obvious within a minute of driving it.

**An uploaded profile photo did not appear.** The letter placeholder was served
from the same URL as the real avatar with `max-age=300,
stale-while-revalidate=86400` — so anyone who had opened a profile before the
photo existed kept being shown the initial for five minutes, and could keep
being shown it for a day. The upload had worked the whole time. Both responses
now carry an ETag and `no-cache`, which costs one 304 and is always right.

**The talent directory scrolled sideways on a phone.** Every card was about
395px wide on a 390px screen, because a grid item's default minimum size is its
content's min-content width and a long display name would not let it shrink.
The page audit had reported this clean for weeks — because `/talent` had nobody
in it, so there were no cards to overflow. An empty page passes every layout
check there is.

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
