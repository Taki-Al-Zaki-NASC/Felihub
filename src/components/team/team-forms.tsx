'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/card';
import { Field, FormError } from '@/components/ui/field';
import {
  inviteMemberAction, removeMemberAction, setMemberRoleAction,
} from '@/server/actions/team';
import type { FormResult } from '@/server/actions/profile';

const ROLES = ['VIEWER', 'MANAGER', 'ADMIN'] as const;

export function InviteForm() {
  const [state, action] = useActionState<FormResult | null, FormData>(
    inviteMemberAction, null,
  );

  return (
    <form action={action} className="space-y-4">
      <FormError>{state?.error}</FormError>

      <div className="flex flex-wrap gap-3">
        <Field label="Their email" name="email" type="email"
          className="min-w-[14rem] flex-1"
          placeholder="cofounder@example.com" />
        <div>
          <label htmlFor="role" className="block text-sm font-semibold">Role</label>
          <select id="role" name="role" defaultValue="VIEWER"
            className="mt-1.5 min-h-[44px] rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
            {ROLES.map((r) => (
              <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <Invite />

      {/* There is no mail sender wired up yet, so this link is the delivery.
          Saying so beats an "invitation sent" that never arrives. */}
      {state?.ok && state.message && <InviteLink path={state.message} />}
    </form>
  );
}

function Invite() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating the invitation…' : 'Invite'}
    </Button>
  );
}

function InviteLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? path : `${window.location.origin}${path}`;

  return (
    <div className="rounded-md border border-teal/30 bg-teal-tint p-3">
      <p className="text-sm font-semibold text-teal-deep">
        Invitation created — send them this link
      </p>
      <p className="mt-1 text-xs text-teal-deep/80">
        Felicek does not send email yet, so nothing was posted on your behalf.
        The link works once and expires in 14 days. It is shown here only now.
      </p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={url} aria-label="Invitation link"
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-[36px] min-w-0 flex-1 rounded border border-teal/30 bg-surface px-2 text-xs" />
        <button type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded bg-teal px-3 text-xs font-semibold text-white">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function MemberRow({ member }: {
  member: {
    id: string; email: string; role: string; status: string;
    name: string | null; since: string;
  };
}) {
  const [roleState, setRole] = useActionState<FormResult | null, FormData>(
    setMemberRoleAction, null,
  );
  const [removeState, remove] = useActionState<FormResult | null, FormData>(
    removeMemberAction, null,
  );

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {member.name ?? member.email}
        </p>
        <p className="truncate text-xs text-ink-muted">
          {member.name ? `${member.email} · ` : ''}{member.since}
        </p>
        {(roleState?.error || removeState?.error) && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {roleState?.error ?? removeState?.error}
          </p>
        )}
      </div>

      {member.status === 'INVITED' && <Badge tone="amber">invited</Badge>}

      <form action={setRole} className="shrink-0">
        <input type="hidden" name="memberId" value={member.id} />
        <label htmlFor={`role-${member.id}`} className="sr-only">
          Role for {member.email}
        </label>
        <select id={`role-${member.id}`} name="role" defaultValue={member.role}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="min-h-[36px] rounded-md border border-border-strong bg-surface px-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal">
          {ROLES.map((r) => (
            <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </form>

      <form action={remove} className="shrink-0">
        <input type="hidden" name="memberId" value={member.id} />
        <button type="submit" aria-label={`Remove ${member.email}`}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-faint hover:bg-danger-tint hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
    </li>
  );
}
