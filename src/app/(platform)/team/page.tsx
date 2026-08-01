import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import { hasApp } from '@/server/services/apps';
import { ago } from '@/lib/money';
import { Badge, Card, CardHeader, Empty, PageHeader } from '@/components/ui/card';
import { AppOff } from '@/components/settings/app-off';
import { InviteForm, MemberRow } from '@/components/team/team-forms';

export const metadata: Metadata = { title: 'Team' };

const WHAT_A_ROLE_CAN_DO = {
  VIEWER: 'Read work logs, boards and contracts.',
  MANAGER: 'That, plus approve tracked time and release milestones.',
  ADMIN: 'That, plus invite and remove people.',
} as const;

export default async function Team() {
  const user = await requireUser();
  if (!hasApp(user, 'TEAM_MANAGER')) return <AppOff app="TEAM_MANAGER" />;

  const [members, memberOf] = await Promise.all([
    db.teamMember.findMany({
      where: { ownerId: user.id, status: { not: 'REMOVED' } },
      orderBy: { invitedAt: 'desc' },
      select: {
        id: true, email: true, role: true, status: true, invitedAt: true,
        acceptedAt: true,
        member: { select: { displayName: true, username: true } },
      },
    }),
    db.teamMember.findMany({
      where: { memberId: user.id, status: 'ACTIVE' },
      select: {
        id: true, role: true, acceptedAt: true,
        owner: { select: { displayName: true, username: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Team"
        description="Co-founders and managers who help run this account. Each one gets a role rather than your password." />

      <Card className="mb-6">
        <CardHeader title="Invite somebody"
          description="They get a link. If they already have a Felicek account it also lands in their notifications." />
        <div className="p-5">
          <InviteForm />
          <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-xs text-ink-muted">
            {Object.entries(WHAT_A_ROLE_CAN_DO).map(([role, can]) => (
              <div key={role} className="flex gap-2">
                <dt className="w-20 shrink-0 font-semibold uppercase">{role}</dt>
                <dd>{can}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title={`${members.length} on your team`} />
        {members.length === 0 ? (
          <div className="p-5">
            <Empty icon={Users} title="Nobody yet"
              body="Invite a co-founder or a manager above. You stay the owner either way." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <MemberRow key={m.id} member={{
                id: m.id,
                email: m.email,
                role: m.role,
                status: m.status,
                name: m.member?.displayName ?? null,
                since: m.acceptedAt ? `joined ${ago(m.acceptedAt)}` : `invited ${ago(m.invitedAt)}`,
              }} />
            ))}
          </ul>
        )}
      </Card>

      {memberOf.length > 0 && (
        <Card>
          <CardHeader title="Accounts you help run"
            description="Somebody invited you to theirs." />
          <ul className="divide-y divide-border">
            {memberOf.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                <span className="text-sm font-semibold">{m.owner.displayName}</span>
                <Badge tone="teal">{m.role.toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
