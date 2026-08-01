import type { Metadata } from 'next';
import { Card, PageHeader } from '@/components/ui/card';
import { requireUser } from '@/server/auth';
import { AcceptInvite } from '@/components/team/accept-invite';

export const metadata: Metadata = { title: 'Accept an invitation' };

export default async function Accept({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await requireUser();
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Join a team"
        description="Accepting gives you the role the owner chose. It does not give you their password, and it does not move any money." />
      <Card className="p-5">
        <AcceptInvite token={token ?? ''} />
      </Card>
    </div>
  );
}
