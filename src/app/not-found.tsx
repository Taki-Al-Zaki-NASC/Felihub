import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Replaces Next's default 404, which is an unstyled sentence on a white page
 * and reads as a broken deployment rather than a wrong address.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-strong">
          <span className="h-3.5 w-3.5 rounded-full border-[2.5px] border-canvas" />
        </span>
        <span className="font-serif text-xl font-semibold">Felicek</span>
      </Link>

      <p className="mt-10 font-serif text-5xl font-semibold text-ink-faint">404</p>
      <h1 className="mt-3 font-serif text-2xl font-semibold">
        That page isn&rsquo;t here.
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The address may be mistyped, or the page may have moved.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">Back to the home page</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/how-it-works">How Felicek works</Link>
        </Button>
      </div>
    </main>
  );
}
