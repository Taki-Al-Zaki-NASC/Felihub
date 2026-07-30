import Link from 'next/link';
import type { Route } from 'next';
import { isFirebaseConfigured } from '@/lib/firebase';
import { MarketingHeader, MarketingFooter } from '@/components/marketing-chrome';

/**
 * Marketing landing page.
 *
 * Server-rendered with no client JavaScript, which is the whole reason this
 * app is Next.js rather than Flutter Web: this page has to be indexable.
 *
 * Structure follows Upwork — hero with a role split, category grid, how it
 * works, proof, and a closing call to action — while the visual language stays
 * Felicek's own tokens, warmed up with the neutral-tint card fill so sections
 * read as designed panels rather than bare white bands.
 */
export const metadata = {
  title: 'Felicek — Hire verified freelancers, or find verified work',
  description:
    'Every account is identity-verified and deposit-backed before it can post '
    + 'or bid. Escrow milestones, live skill challenges, and a flat 1% fee '
    + 'shown separately from processing.',
};

const CATEGORIES = [
  { name: 'Development & IT', blurb: 'Mobile, web, backend, DevOps', icon: <IconCode /> },
  { name: 'Design & Creative', blurb: 'Product, brand, illustration, motion', icon: <IconPalette /> },
  { name: 'Writing & Translation', blurb: 'Technical, editorial, localisation', icon: <IconPen /> },
  { name: 'Sales & Marketing', blurb: 'Growth, SEO, paid, lifecycle', icon: <IconMegaphone /> },
  { name: 'Finance & Accounting', blurb: 'Bookkeeping, modelling, audit prep', icon: <IconCalculator /> },
  { name: 'Admin & Support', blurb: 'Operations, research, assistance', icon: <IconHeadset /> },
];

const STEPS_CLIENT = [
  ['Post what you need', 'Scope, budget and milestones. Takes a few minutes.'],
  ['Compare verified bids', 'Every bidder has identity on file and a deposit behind them.'],
  ['Fund a milestone', 'Money sits in escrow, not with the freelancer.'],
  ['Release when satisfied', 'Approve a milestone and the funds move. Not before.'],
];

const STEPS_FREELANCER = [
  ['Verify once', 'Photo of your ID and a selfie, checked on your device.'],
  ['Bid on real work', 'No unverified clients, so no unpaid invoices to chase.'],
  ['Prove your skill', 'Optional challenges — your submission stays private to you.'],
  ['Get paid per milestone', 'Escrow-funded before you start, released as you deliver.'],
];

const CLAIMS = [
  {
    icon: <IconShieldCheck />,
    title: 'No unverified account can act',
    body: 'Posting and bidding require identity on file and a cleared deposit. An account cannot mark its own payment as paid.',
  },
  {
    icon: <IconEyeOff />,
    title: 'Your work stays yours',
    body: 'Challenge submissions are readable only by their author. A client sees a score and a short preview — never your full code or design.',
  },
  {
    icon: <IconStamp />,
    title: 'Deliverables are held until paid',
    body: 'Files arrive watermarked. The clean original is unreadable to the client until the milestone is released.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-tint px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-deep">
                <IconCheck /> Every account verified before it can post or bid
              </span>
              <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Hire people who are
                <br className="hidden sm:block" /> actually who they say.
              </h1>
              <p className="mt-5 max-w-xl text-base text-ink-muted sm:text-lg">
                Identity checks and a refundable deposit are required to join —
                on both sides. Work is funded into escrow before it starts, and
                the fee is a flat 1%, itemised separately from card processing.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={'/signup' as Route}
                  className="rounded-button bg-ink-strong px-6 py-3.5 text-center text-sm font-bold text-canvas transition hover:-translate-y-0.5 hover:opacity-90">
                  Post a job
                </Link>
                <Link href={'/jobs' as Route}
                  className="rounded-button border border-border-strong bg-surface px-6 py-3.5 text-center text-sm font-bold transition hover:-translate-y-0.5 hover:bg-backdrop">
                  Find work
                </Link>
              </div>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-3 rounded-card-lg border border-border bg-neutral-tint p-5">
                {[['1%', 'flat platform fee'], ['$0', 'to browse or bid'], ['100%', 'accounts verified']]
                  .map(([big, small]) => (
                    <div key={small}>
                      <dt className="font-serif text-2xl font-semibold text-teal-deep">{big}</dt>
                      <dd className="mt-0.5 text-xs text-ink-muted">{small}</dd>
                    </div>
                  ))}
              </dl>
            </div>

            {/* Two doors, the way Upwork splits its audience. */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <RoleCard
                tone="teal"
                title="I need work done"
                points={[
                  'Bids only from verified freelancers',
                  '$50 posting balance, spent into escrow',
                  'Release milestone by milestone',
                ]}
                cta="Post a job"
              />
              <RoleCard
                tone="violet"
                title="I'm looking for work"
                points={[
                  'No unverified clients to chase',
                  '$20 refundable trust bond to join',
                  'Your challenge submissions stay private',
                ]}
                cta="Find work"
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            Browse by category
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <Link key={c.name} href={'/jobs' as Route}
                className="group flex items-start gap-3.5 rounded-card border border-border bg-neutral-tint p-5 transition hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal-tint">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface text-teal-deep transition group-hover:bg-teal group-hover:text-white">
                  {c.icon}
                </span>
                <span>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">{c.blurb}</p>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* What the product actually looks like once you're in.
            A marketplace landing page that only makes claims reads as
            vapourware — these are the real screens, with the real numbers the
            fee code produces. */}
        <section className="border-y border-border bg-surface py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Inside Felicek</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">
              Not mockups of a someday product — this is what is behind the
              sign-in, today.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <Screen
                step="01"
                title="Your dashboard"
                body="Role-aware. A client sees listings, proposals received and escrow held; a freelancer sees live bids and open work."
              >
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Open listings" value="3" tone="teal" />
                  <MiniStat label="Proposals" value="17" tone="blue" />
                  <MiniStat label="In escrow" value="$4,750" tone="violet" />
                </div>
                <div className="mt-3 space-y-2">
                  <MiniRow title="Android app — Compose UI" meta="8 proposals · $2,800" pill="Open" />
                  <MiniRow title="Brand identity refresh" meta="5 proposals · $1,200" pill="Filled" tone="teal" />
                </div>
              </Screen>

              <Screen
                step="02"
                title="Proposals, with the bid up front"
                body="Every bidder has identity on file and a deposit behind them. Shortlist, message, or hire straight from the list."
              >
                <div className="space-y-2">
                  <MiniProposal name="Rafiq H." bid="$2,650" status="Shortlisted" tone="teal" />
                  <MiniProposal name="Anika S." bid="$2,800" status="Submitted" />
                  <MiniProposal name="Tanvir M." bid="$3,100" status="Submitted" />
                </div>
              </Screen>

              <Screen
                step="03"
                title="Escrow, released per milestone"
                body="Funded before work starts. Every fee is itemised — the gateway's cut and Felicek's 1% never blended into one number."
              >
                <div className="rounded-[10px] border border-border bg-canvas p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Milestone 2 — Beta build</span>
                    <span>$1,400.00</span>
                  </div>
                  <dl className="mt-2.5 space-y-1.5 text-xs">
                    <FeeLine label="Payment processing (2%)" value="− $28.00" />
                    <FeeLine label="Felicek platform fee (1%)" value="− $14.00" />
                  </dl>
                  <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-sm">
                    <span className="font-medium">Freelancer receives</span>
                    <span className="font-serif text-lg font-semibold text-teal-deep">$1,358.00</span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-ink-faint">
                  Same arithmetic as the fee calculator — one function, both places.
                </p>
              </Screen>

              <Screen
                step="04"
                title="Messaging, and files that stay withheld"
                body="Deliverables arrive watermarked. The clean original is unreadable to the client until that milestone is released."
              >
                <div className="space-y-2">
                  <Bubble side="them" text="Beta build attached — preview is watermarked." />
                  <div className="ml-auto max-w-[85%] rounded-[10px] border border-dashed border-violet/50 bg-violet-tint p-2.5">
                    <p className="text-xs font-semibold">build-v2.zip</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      Clean copy locked · releases with milestone 2
                    </p>
                  </div>
                  <Bubble side="me" text="Reviewing now — releasing today." />
                </div>
              </Screen>
            </div>
          </div>
        </section>

        {/* How it works, per side */}
        <section className="border-y border-border bg-surface py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">How it works</h2>
            <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
              <Steps title="If you're hiring" steps={STEPS_CLIENT} tone="teal" />
              <Steps title="If you're freelancing" steps={STEPS_FREELANCER} tone="violet" />
            </div>
          </div>
        </section>

        {/* The three claims worth making, because they are enforced rather
            than promised — each maps to a rule in firestore.rules. */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            Enforced, not promised
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            These are security rules on the database, not settings in an admin
            panel. The app cannot bypass them, and neither can we.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {CLAIMS.map((claim) => (
              <div key={claim.title} className="rounded-card border border-border bg-neutral-tint p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface text-teal-deep">
                  {claim.icon}
                </span>
                <h3 className="mt-4 font-semibold">{claim.title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{claim.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Close */}
        <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
          <div className="rounded-card-lg border border-border-strong bg-ink-strong px-6 py-14 text-center text-canvas sm:px-12 sm:py-20">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
              Start with a verified account.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Browsing and bidding cost nothing. The deposit is yours — refundable
              for freelancers, spendable into escrow for clients.
            </p>
            <Link href={'/signup' as Route}
              className="mt-8 inline-block rounded-button bg-teal px-7 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-teal-deep">
              Create your account
            </Link>

            {!isFirebaseConfigured && (
              <p className="mx-auto mt-10 max-w-lg rounded-field border border-amber/30 bg-white/5 px-4 py-3 text-left text-sm text-white/80">
                This deployment has no Firebase configuration, so sign-in will not
                work. Copy <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env.example</code>{' '}
                to <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env.local</code>{' '}
                and fill it from the Web app registered in Firebase.
              </p>
            )}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

function RoleCard({ tone, title, points, cta }: {
  tone: 'teal' | 'violet'; title: string; points: string[]; cta: string;
}) {
  const accent = tone === 'teal'
    ? 'border-teal/30 bg-teal-tint'
    : 'border-violet/30 bg-violet-tint';
  const text = tone === 'teal' ? 'text-teal-deep' : 'text-violet';
  return (
    <div className={`rounded-card-lg border p-5 ${accent}`}>
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-sm">
            <span className={`mt-0.5 font-bold ${text}`} aria-hidden>✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link href={'/signup' as Route}
        className={`mt-4 inline-block text-sm font-bold ${text}`}>
        {cta} →
      </Link>
    </div>
  );
}

function Steps({ title, steps, tone }: {
  title: string; steps: string[][]; tone: 'teal' | 'violet';
}) {
  const chip = tone === 'teal' ? 'bg-teal text-white' : 'bg-violet text-white';
  return (
    <div>
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <ol className="mt-4 space-y-4">
        {steps.map(([label, detail], i) => (
          <li key={label} className="flex gap-3.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${chip}`}>
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold">{label}</span>
              <span className="mt-0.5 block text-sm text-ink-muted">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── "Inside Felicek" preview pieces ───────────────────────────────────────
   Static markup, no client JS: the landing page has to stay indexable, which
   is the whole reason this app is Next.js rather than Flutter Web. */

function Screen({ step, title, body, children }: {
  step: string; title: string; body: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-card-lg border border-border bg-neutral-tint p-5">
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-xs font-bold text-teal-deep">{step}</span>
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
      <div className="mt-4 rounded-card border border-border bg-surface p-3">
        {children}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: {
  label: string; value: string; tone: 'teal' | 'blue' | 'violet';
}) {
  const colour = { teal: 'text-teal-deep', blue: 'text-blue', violet: 'text-violet' }[tone];
  return (
    <div className="rounded-[10px] border border-border bg-canvas p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-0.5 font-serif text-lg font-semibold ${colour}`}>{value}</p>
    </div>
  );
}

function MiniRow({ title, meta, pill, tone = 'neutral' }: {
  title: string; meta: string; pill: string; tone?: 'neutral' | 'teal';
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-canvas px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] text-ink-muted">{meta}</p>
      </div>
      <span className={`shrink-0 rounded-[7px] px-2 py-0.5 text-[10px] font-semibold ${
        tone === 'teal' ? 'bg-teal-tint text-teal-deep' : 'bg-backdrop text-ink-muted'
      }`}>
        {pill}
      </span>
    </div>
  );
}

function MiniProposal({ name, bid, status, tone = 'neutral' }: {
  name: string; bid: string; status: string; tone?: 'neutral' | 'teal';
}) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-border bg-canvas px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-tint text-[11px] font-bold text-teal-deep">
        {name[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{name}</p>
        <p className="mt-0.5 text-[11px] text-ink-muted">Verified · deposit cleared</p>
      </div>
      <span className="shrink-0 text-xs font-semibold">{bid}</span>
      <span className={`shrink-0 rounded-[7px] px-2 py-0.5 text-[10px] font-semibold ${
        tone === 'teal' ? 'bg-teal-tint text-teal-deep' : 'bg-backdrop text-ink-muted'
      }`}>
        {status}
      </span>
    </div>
  );
}

function FeeLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink-muted">{value}</dd>
    </div>
  );
}

function Bubble({ side, text }: { side: 'me' | 'them'; text: string }) {
  return (
    <div className={`max-w-[85%] rounded-[10px] px-2.5 py-2 text-xs ${
      side === 'me' ? 'ml-auto bg-teal text-white' : 'bg-backdrop text-ink'
    }`}>
      {text}
    </div>
  );
}

/* Inline SVGs, matching components/nav.tsx's style (24x24, stroke currentColor,
   1.8 weight) rather than an icon package — a couple dozen glyphs used once
   each isn't worth a dependency. */
const S = 'h-5 w-5';
function IconCheck() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconShieldCheck() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c5 0 9 4 10 7-.4 1.2-1.2 2.5-2.3 3.6M6.3 6.3C4.2 7.6 2.6 9.6 2 12c1 3 5 7 10 7a9.9 9.9 0 0 0 3.6-.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconStamp() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M8 20h8M9 16v-2a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCode() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m9 8-4 4 4 4M15 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPalette() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2a4 4 0 0 0 4-4c0-4.4-4-7.4-9-7.4z" strokeLinejoin="round" />
      <circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconPen() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" strokeLinejoin="round" />
    </svg>
  );
}
function IconMegaphone() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11v2a2 2 0 0 0 2 2h1l2 5h2l-1.5-5H10l9 4V6l-9 4H5a2 2 0 0 0-2 2z" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalculator() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" strokeLinecap="round" />
    </svg>
  );
}
function IconHeadset() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
      <path d="M19.5 19v.5a3 3 0 0 1-3 3H14" strokeLinecap="round" />
    </svg>
  );
}
