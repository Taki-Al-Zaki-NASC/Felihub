import { MarketingHeader, MarketingFooter } from '@/components/marketing-chrome';

export const metadata = {
  title: 'FAQ — Felicek',
  description: 'How identity screening, escrow, fees and deliverables actually work.',
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What does identity verification actually check?',
    a: (
      <>
        A photo of your ID document and a selfie, screened on your device for
        sharpness, exposure and resolution — the same checks a human reviewer
        would use to reject a photo before even looking at it closely. Being
        honest about the limit: this confirms the photos are legible, it does
        not and cannot confirm the document is genuine. No check running on
        the claimant&apos;s own phone ever could. Submitting a document that
        isn&apos;t yours costs you the account and the deposit.
      </>
    ),
  },
  {
    q: 'How is the fee 1% when other platforms charge 20%?',
    a: (
      <>
        Felicek&apos;s own fee is a flat 1% of each milestone, always shown
        separately from payment processing (roughly 2–3% depending on the
        rail). The two aren&apos;t blended into one bigger number — see
        Pricing for the exact rates, or the calculator for what a specific
        amount works out to.
      </>
    ),
  },
  {
    q: 'How does escrow actually protect a client’s money?',
    a: (
      <>
        A client funds a milestone before work starts. That money sits in
        escrow — not with the freelancer — until the client reviews the work
        and releases it. A freelancer is never paid on a promise, and a client
        never sends money directly to a freelancer&apos;s pocket outside the
        platform.
      </>
    ),
  },
  {
    q: 'Can a client see my full work before paying?',
    a: (
      <>
        Files sent through chat arrive to the client watermarked. The clean
        original is unreadable to them until the milestone it belongs to is
        released — enforced the same way the identity gate is, as a database
        rule, not a setting that could be toggled off.
      </>
    ),
  },
  {
    q: 'If I take a skill challenge, who sees my answer?',
    a: (
      <>
        Only you, before and after. The job owner sees a score and a short
        preview — never your full code or design. This is a database rule
        with no exception for the job owner, not an app-level permission.
      </>
    ),
  },
  {
    q: 'What isn’t built yet?',
    a: (
      <>
        Push notifications to a closed app, video watermarking, and the
        payment gateway webhook that lets a real deposit clear automatically —
        all three need a paid backend tier this project hasn&apos;t turned on
        yet. In-app notifications while the app is open work today; escrow and
        messaging are fully live.
      </>
    ),
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-ink-muted">
          Answered plainly, including where the honest answer is a limit.
        </p>

        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q}
              className="group rounded-card border border-border bg-neutral-tint open:bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold marker:content-none">
                {f.q}
                <span className="shrink-0 text-ink-faint transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
