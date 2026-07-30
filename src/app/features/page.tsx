import type { Route } from 'next';
import Link from 'next/link';
import { MarketingHeader, MarketingFooter } from '@/components/marketing-chrome';

export const metadata = {
  title: 'Features — Felicek',
  description: 'Identity screening, escrow milestones, private skill challenges, and watermarked deliverables — what is actually built.',
};

const FEATURES: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: 'Identity screening before anyone can act',
    body: 'A photo of an ID document and a selfie, checked on your device for sharpness, exposure and resolution before anything uploads. No account can post a job or submit a bid until this clears — enforced by the database, not a setting.',
    icon: <IconShield />,
  },
  {
    title: 'Escrow, funded before work starts',
    body: 'Clients fund a milestone into escrow before a freelancer begins. The money sits there — not with the freelancer, not with Felicek — until the client releases it. There is no "trust me, I\'ll pay after."',
    icon: <IconVault />,
  },
  {
    title: 'Skill challenges, owner-blind grading',
    body: 'A job can attach a quiz or a live interview instead of a written proposal. The job owner sees a score and a short preview; your full submission is readable only by you, before and after the decision.',
    icon: <IconCode />,
  },
  {
    title: 'Messaging with watermarked attachments',
    body: 'Work sent through chat arrives watermarked to the recipient. The clean, original file stays unreadable to them until the milestone it belongs to is released — the preview is what you see, the release is what unlocks it.',
    icon: <IconStamp />,
  },
  {
    title: 'Deposit-backed accounts, both sides',
    body: 'Freelancers put down a refundable trust bond; clients fund a posting balance that gets spent into escrow. Both exist so an account has something behind it beyond an email address.',
    icon: <IconWallet />,
  },
  {
    title: 'Built-in calling',
    body: 'Audio and video calls run peer-to-peer (WebRTC) without leaving the app — no separate scheduling link, no third-party account required on either side.',
    icon: <IconPhone />,
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">What&apos;s actually built</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Everything below is live, not roadmap. For what isn&apos;t built yet,
          see the FAQ.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-card border border-border bg-neutral-tint p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface text-teal-deep">
                {f.icon}
              </span>
              <h2 className="mt-4 font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start gap-3 rounded-card-lg border border-border-strong bg-ink-strong p-8 text-canvas sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold">See the fee structure</h2>
            <p className="mt-1 text-sm text-white/70">Flat 1%, itemised separately from processing.</p>
          </div>
          <Link href={'/offer' as Route}
            className="rounded-button bg-teal px-5 py-3 text-sm font-bold text-white hover:bg-teal-deep">
            View pricing →
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

const S = 'h-5 w-5';
function IconShield() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconVault() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 9.5V8M14.5 12H16" strokeLinecap="round" />
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
function IconStamp() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M8 20h8M9 16v-2a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" strokeLinecap="round" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <circle cx="16" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg className={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5c0 8.3 6.7 15 15 15l2-3.6-5.2-2-1.8 1.8a12 12 0 0 1-6.2-6.2l1.8-1.8-2-5.2z" strokeLinejoin="round" />
    </svg>
  );
}
