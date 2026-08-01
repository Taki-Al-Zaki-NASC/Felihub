import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Scale, ShieldCheck } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { Card, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RaiseForm } from '@/components/startups/raise-form';

export const metadata: Metadata = { title: 'Raise for your startup' };

export default async function NewRaise() {
  const user = await requireUser();
  if (!user.isVerified) redirect('/verify');

  // One live raise at a time — the same rule the action enforces, checked here
  // only so the form is not offered to somebody whose submit would be refused.
  const running = await db.raise.findFirst({
    where: { founderId: user.id, status: 'OPEN' },
    select: { id: true, title: true },
  });

  if (running) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="You already have a raise running" />
        <Card className="p-5">
          <p className="text-sm text-ink-muted">
            “{running.title}” is still open. Two raises at once splits your own
            backers between them and makes both look like they are failing, so
            this waits until that one finishes.
          </p>
          <Button asChild className="mt-4">
            <Link href={`/startups/${running.id}`}>Open it</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Raise for your startup"
        description="All or nothing. Pledges sit in escrow and reach you only if you hit the goal." />

      <Card className="mb-4 flex items-start gap-3 p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" />
        <p className="text-sm text-ink-muted">
          Publishing is free. Felicek takes 1% of what you raise, and only if
          you raise it — the same 1% charged on job milestones, itemised
          separately from any card processing.
        </p>
      </Card>

      <Card className="mb-5 flex items-start gap-3 p-4">
        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
        <p className="text-sm text-ink-muted">
          <strong className="text-ink">You cannot offer equity here.</strong>{' '}
          Selling a stake in your company to the public is a regulated
          securities offering, and Felicek is not a licensed funding portal.
          Ask for support for a specific piece of work — do not promise shares,
          a share of revenue, or a return.
        </p>
      </Card>

      <RaiseForm />
    </div>
  );
}
