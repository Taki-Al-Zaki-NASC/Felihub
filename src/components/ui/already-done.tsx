import Link from 'next/link';
import type { Route } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * "You have already done this" — shown instead of redirecting.
 *
 * Four pages used to bounce a signed-in visitor forward to the dashboard:
 * sign-in, sign-up, onboarding and verify. Each bounce is invisible until you
 * press the browser's back button, at which point the server redirects you
 * forward again — so back appears not to work, and three presses land on the
 * same page. Reaching the public home page took four.
 *
 * Rendering a real page breaks the loop: back goes back, every entry in the
 * history is somewhere you can actually stand, and the way onward is a link
 * rather than an automatic jump.
 */
export function AlreadyDone({ title, body, href, cta, children }: {
  title: string;
  body: string;
  href: Route;
  cta: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-teal-tint">
        <CheckCircle2 className="h-5 w-5 text-teal-deep" />
      </span>
      <h1 className="mt-4 font-serif text-xl font-semibold">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{body}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild variant="primary">
          <Link href={href}>{cta}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>
      {children}
    </Card>
  );
}
