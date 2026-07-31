import Link from 'next/link';
import { requireUser } from '@/server/auth';
import { signOutAction } from '@/server/actions/auth';

/**
 * The shell for accounts that exist but cannot act yet — onboarding and
 * verification.
 *
 * Deliberately separate from `(platform)`: that layout *redirects here* when
 * an account is unfinished, so hosting these pages inside it would be an
 * infinite redirect. Keeping them in their own group makes that impossible
 * rather than merely avoided.
 */
/** Per-account, so never prerendered — see the note in (platform)/layout.tsx. */
export const dynamic = 'force-dynamic';

export default async function GatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-strong">
              <span className="h-3 w-3 rounded-full border-[2.5px] border-canvas" />
            </span>
            <span className="font-serif text-lg font-semibold">Felicek</span>
          </Link>
          <span className="ml-auto hidden text-sm text-ink-muted sm:block">
            {user.email}
          </span>
          <form action={signOutAction}>
            <button type="submit"
              className="flex min-h-[40px] items-center rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-backdrop hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
