import Link from 'next/link';
import { EyeOff, Lock, Paperclip } from 'lucide-react';
import { ago, money } from '@/lib/money';
import { Badge } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { HireButton } from '@/components/jobs/hire-button';
import type { VisibleProposal } from '@/server/services/proposals';
import type { StoredSignal } from '@/server/services/authorship';
import { AuthorshipNote } from '@/components/ui/authorship-note';

/**
 * The bid list.
 *
 * A row either carries the sensitive fields or does not — `visible` is a
 * discriminant on the type, not a flag on a fully-populated object, so this
 * component cannot render an amount it was not given and TypeScript will not
 * let anyone add the attempt.
 */
export function ProposalList({
  proposals, isOwner, jobOpen, viewerUsername, firstMilestoneCents, signals,
}: {
  proposals: VisibleProposal[];
  isOwner: boolean;
  jobOpen: boolean;
  viewerUsername: string;
  firstMilestoneCents: number | null;
  /**
   * How each cover letter arrived, by proposal id. Only ever populated for
   * rows this viewer may read in full — a note saying "pasted" next to a bid
   * whose contents are hidden would leak something about a bid nobody is
   * entitled to know anything about.
   */
  signals?: Map<string, StoredSignal>;
}) {
  return (
    <ul className="divide-y divide-border">
      {proposals.map((p) => {
        const isMine = p.freelancer.username === viewerUsername;
        return (
          <li key={p.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <Avatar username={p.freelancer.username}
                  name={p.freelancer.displayName} size={40} />
                <div className="min-w-0">
                  <Link href={`/profile/${p.freelancer.username}`}
                    className="font-semibold hover:underline">
                    {p.freelancer.displayName}{isMine && ' (you)'}
                  </Link>
                  <p className="text-sm text-ink-muted">
                    {p.freelancer.profile?.headline}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Applied {ago(p.createdAt)}
                    {p.visible && p.revisions > 0 && ` · revised ${p.revisions}×`}
                    {p.freelancer.profile?.ratingCount
                      ? ` · ★ ${p.freelancer.profile.ratingAvg?.toFixed(1)} (${p.freelancer.profile.ratingCount})`
                      : ' · no reviews yet'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {p.visible ? (
                  <p className="font-serif text-lg font-semibold">
                    {money(p.bidCents)}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-ink-faint">
                    <Lock className="h-3.5 w-3.5" /> Private
                  </p>
                )}
                <Badge tone={
                  p.status === 'ACCEPTED' || p.status === 'COMPLETED' ? 'teal'
                    : p.status === 'DECLINED' ? 'danger' : 'neutral'
                }>
                  {p.status.toLowerCase()}
                </Badge>
              </div>
            </div>

            {p.visible ? (
              <>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink-muted">
                  {p.note}
                </p>
                <AuthorshipNote signal={signals?.get(p.id) ?? null}
                  self={isMine} className="mt-3" />
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                  {p.timelineDays != null && (
                    <span>Delivery in {p.timelineDays} days</span>
                  )}
                  {p.attachmentUrl && (
                    <a href={p.attachmentUrl} target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex min-h-[28px] items-center gap-1.5 font-semibold text-teal-deep hover:underline">
                      <Paperclip className="h-3.5 w-3.5" /> Attachment
                    </a>
                  )}
                </p>
              </>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-xs text-ink-faint">
                <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Their proposal, price and delivery estimate are visible only to
                them and to the client. Yours is private in the same way.
              </p>
            )}

            {isOwner && p.visible && p.score != null && (
              <div className="mt-3 rounded-md border border-border bg-neutral-tint p-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-3.5 w-3.5 text-ink-faint" />
                  Challenge score: {p.score}%
                </p>
                {p.answerPreview && (
                  <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                    {p.answerPreview}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-ink-faint">
                  Only you can see this. Their full submission stays with them.
                </p>
              </div>
            )}

            {isOwner && (
              <div className="mt-4 flex flex-wrap gap-2">
                {jobOpen && p.status !== 'DECLINED' && p.visible && (
                  <HireButton proposalId={p.id}
                    amount={money(firstMilestoneCents ?? p.bidCents)}
                    name={p.freelancer.displayName.split(' ')[0]} />
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/messages/new?to=${p.freelancer.username}`}>
                    Message
                  </Link>
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
