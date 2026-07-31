import Link from 'next/link';
import { BadgeCheck, Lock, Percent } from 'lucide-react';

/**
 * Two panes on a laptop, one on a phone. The right pane restates what the
 * account actually gets you — sign-up is where people abandon, and the reasons
 * they came are worth keeping on screen while they type.
 */
/** These pages redirect an already-signed-in visitor, which depends on their
 *  cookie — so they must be rendered per request, not baked at build time. */
export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[1fr_minmax(0,26rem)]">
      <div className="flex min-h-screen flex-col px-4 py-8 sm:px-6 lg:px-12">
        <Link href="/" className="flex w-fit items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-strong">
            <span className="h-3 w-3 rounded-full border-[2.5px] border-canvas" />
          </span>
          <span className="font-serif text-lg font-semibold">Felicek</span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <p className="text-center text-xs text-ink-faint">
          © Felicek ·{' '}
          <Link href="/pricing" className="underline hover:text-ink-muted">
            Fees
          </Link>
          {' · '}
          <Link href="/how-it-works" className="underline hover:text-ink-muted">
            How it works
          </Link>
        </p>
      </div>

      <aside className="hidden flex-col justify-center gap-7 bg-ink-strong px-10 py-12 text-canvas lg:flex">
        <h2 className="font-serif text-2xl font-semibold leading-snug">
          Everyone here has proved who they are.
        </h2>
        <Point icon={BadgeCheck} title="Verified on both sides">
          Identity and a deposit are required from freelancers and hirers alike
          before either can post, bid or message.
        </Point>
        <Point icon={Lock} title="Escrow before work starts">
          A milestone is funded up front and released only when it is approved.
          It never drains back on a timer.
        </Point>
        <Point icon={Percent} title="1%, itemised">
          The platform fee and the card processing charge are always separate
          lines. Bidding costs nothing, and there are no credits to buy.
        </Point>
      </aside>
    </div>
  );
}

function Point({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-teal">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-white/60">{children}</p>
      </div>
    </div>
  );
}
