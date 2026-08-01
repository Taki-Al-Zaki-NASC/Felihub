'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FormError } from '@/components/ui/field';
import { createBoardAction } from '@/server/actions/boards';
import type { FormResult } from '@/server/actions/profile';

export function NewBoard({ jobs }: { jobs: { id: string; title: string }[] }) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    createBoardAction, null,
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New board
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <form action={action} className="space-y-4">
        <FormError>{state?.error}</FormError>
        <Field label="Board name" name="title" placeholder="Q3 delivery" autoFocus />

        <div>
          <label htmlFor="jobId" className="block text-sm font-semibold">
            Attach to a job
          </label>
          <select id="jobId" name="jobId" defaultValue=""
            className="mt-1.5 min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
            <option value="">Standalone — not tied to a job</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-ink-muted">
            Attaching brings that job&rsquo;s milestones onto the board and lets
            the freelancer working on it see the board too.
          </p>
        </div>

        <div className="flex gap-2">
          <Create />
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Create() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create board'}
    </Button>
  );
}
