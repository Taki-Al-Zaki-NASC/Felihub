'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { acceptInviteAction } from '@/server/actions/team';
import type { FormResult } from '@/server/actions/profile';

export function AcceptInvite({ token }: { token: string }) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    acceptInviteAction, null,
  );

  if (!token) {
    return (
      <p className="text-sm text-ink-muted">
        This link is missing its token. Ask whoever invited you to send it
        again — the whole link matters, not just the address.
      </p>
    );
  }

  if (state?.ok) {
    return (
      <div>
        <p className="flex items-start gap-2 text-sm font-semibold text-teal-deep">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> You are on the team.
        </p>
        <Button asChild className="mt-4">
          <Link href="/team">Open Team</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormError>{state?.error}</FormError>
      <p className="text-sm text-ink-muted">
        Accepting links this Felicek account to the team. The invitation works
        once and then stops.
      </p>
      <Accept />
    </form>
  );
}

function Accept() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Joining…' : 'Accept the invitation'}
    </Button>
  );
}
