import { redirect } from 'next/navigation';
import { openThreadAction } from '@/server/actions/messages';

/**
 * A redirect target, not a page: `/messages/new?to=username` opens or reuses
 * the thread and sends the user straight to it. Keeping it as a route means
 * "Message" can be an ordinary link from anywhere — talent cards, profiles,
 * proposal lists — instead of every one of them needing a form and an action.
 */
export default async function NewThread({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  if (!to) redirect('/messages');
  await openThreadAction(to);
}
