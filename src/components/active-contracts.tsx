'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { Job, Proposal } from '@/lib/schema';
import { milestoneCents } from '@/lib/schema';
import { chatIdFor } from '@/lib/mutations';
import { Card, EmptyState, Pill, SectionLabel, money } from './ui';

/**
 * Work in flight.
 *
 * The dashboard reported "In progress: 2" and stopped there — a number nobody
 * can act on. An engagement is the unit this product actually runs on: money
 * is already committed, milestones are part-released, and both sides need to
 * see where it stands without hunting for the listing again.
 *
 * Everything here comes from documents already loaded for the metrics above,
 * so it costs no extra reads.
 */
export function ActiveContracts({ jobs, proposals, selfId, asClient }: {
  jobs: Job[];
  /** Accepted proposals — supplies the counterparty and the agreed amount. */
  proposals: Proposal[];
  selfId: string;
  asClient: boolean;
}) {
  const byJob = new Map(proposals.map((p) => [p.jobId, p]));
  const live = jobs.filter((j) => j.status === 'filled' && j.hiredFreelancerId);

  if (live.length === 0) {
    return (
      <section className="mt-9">
        <SectionLabel>Active contracts</SectionLabel>
        <div className="mt-3">
          <EmptyState
            title="Nothing in progress"
            message={asClient
              ? 'Hire someone and the engagement appears here — milestones, escrow and the thread in one place.'
              : 'Win a bid and the engagement appears here, with what is left to deliver.'}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-9">
      <SectionLabel>Active contracts</SectionLabel>
      <div className="mt-3 space-y-3">
        {live.map((job) => {
          const proposal = byJob.get(job.id);
          const milestones = job.milestones ?? [];
          const released = milestones.filter((m) => m.released).length;
          const total = milestones.length;
          const pct = total === 0 ? 0 : Math.round((released / total) * 100);
          const next = milestones.find((m) => !m.released);
          const counterparty = asClient
            ? (proposal?.freelancerName ?? 'Freelancer')
            : job.ownerName;
          const otherId = asClient ? job.hiredFreelancerId : job.ownerId;

          return (
            <Card key={job.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/jobs/${job.id}` as Route}
                    className="font-serif text-lg font-semibold hover:text-teal-deep">
                    {job.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {asClient ? 'Working with' : 'Client'} {counterparty}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-lg font-semibold text-teal-deep">
                    {money(job.escrowHeldCents ?? 0)}
                  </p>
                  <p className="text-[11px] text-ink-faint">in escrow</p>
                </div>
              </div>

              {total > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      {released} of {total} milestone{total === 1 ? '' : 's'} released
                    </span>
                    <span className="text-ink-faint">{pct}%</span>
                  </div>
                  {/* A bar rather than a count alone: partial progress is the
                      normal state of an engagement, and the shape of it is
                      what tells you whether this is nearly done. */}
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-backdrop"
                    role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-teal transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                  {next && proposal && (
                    <p className="mt-2 text-xs text-ink-muted">
                      Next: <strong>{next.label}</strong>
                      {' · '}
                      {money(milestoneCents(next, job, proposal))}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/jobs/${job.id}` as Route}
                  className="flex min-h-[40px] flex-1 items-center justify-center rounded-button border border-border-strong bg-surface px-4 text-sm font-bold hover:bg-backdrop">
                  {asClient ? 'Manage & release' : 'View contract'}
                </Link>
                {otherId && (
                  <Link href={`/messages/${chatIdFor(selfId, otherId, job.id)}` as Route}
                    className="flex min-h-[40px] flex-1 items-center justify-center rounded-button bg-ink-strong px-4 text-sm font-bold text-canvas hover:opacity-90">
                    Message
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/** The last few conversations, so messaging is one click from home. */
export function RecentThreads({ threads, selfId }: {
  threads: { id: string; participantIds?: string[]; participants?: Record<string, string>;
    jobTitle?: string | null; lastMessage?: string }[];
  selfId: string;
}) {
  if (threads.length === 0) return null;
  return (
    <section className="mt-9">
      <div className="flex items-center justify-between">
        <SectionLabel>Recent messages</SectionLabel>
        <Link href={'/messages' as Route} className="text-xs font-bold text-teal-deep">
          All messages
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {threads.slice(0, 3).map((t) => {
          const otherId = t.participantIds?.find((p) => p !== selfId) ?? '';
          const name = t.participants?.[otherId] ?? 'Felicek user';
          return (
            <Link key={t.id} href={`/messages/${t.id}` as Route} className="block">
              <Card className="transition hover:border-border-strong">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {t.lastMessage ?? 'No messages yet'}
                    </p>
                  </div>
                  {t.jobTitle && <Pill>{t.jobTitle}</Pill>}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
