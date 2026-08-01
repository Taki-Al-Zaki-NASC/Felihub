'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { pairDeviceAction, revokeDeviceAction } from '@/server/actions/tracker';
import type { FormResult } from '@/server/actions/profile';

export function PairDevice() {
  const [state, action] = useActionState<FormResult | null, FormData>(
    pairDeviceAction, null,
  );

  return (
    <form action={action} className="space-y-4">
      <FormError>{state?.error}</FormError>

      <div className="flex flex-wrap gap-3">
        <Field label="Device name" name="name" className="min-w-[12rem] flex-1"
          placeholder="Work laptop" />
        <div>
          <label htmlFor="platform" className="block text-sm font-semibold">
            Platform
          </label>
          <select id="platform" name="platform" defaultValue="windows"
            className="mt-1.5 min-h-[44px] rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
            <option value="windows">Windows</option>
            <option value="macos">macOS</option>
            <option value="linux">Linux</option>
          </select>
        </div>
      </div>

      <Pair />
      {state?.ok && state.message && <Token value={state.message} />}
    </form>
  );
}

function Pair() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Pairing…' : 'Pair a device'}
    </Button>
  );
}

/** Shown once. There is no way to read it back — it is stored hashed, which is
 *  the only reason it is safe to have a long-lived credential on a laptop. */
function Token({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-amber/30 bg-amber-tint p-3">
      <p className="text-sm font-semibold text-amber">
        Paste this into the desktop app now
      </p>
      <p className="mt-1 text-xs text-amber/90">
        It is stored hashed, so this is the only time it can be shown. Lost it?
        Revoke the device and pair again — that costs nothing.
      </p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={value} aria-label="Device token"
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-[36px] min-w-0 flex-1 rounded border border-amber/30 bg-surface px-2 font-mono text-xs" />
        <button type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded bg-ink-strong px-3 text-xs font-semibold text-canvas">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function RevokeDevice({ id, name }: { id: string; name: string }) {
  const [, action] = useActionState<FormResult | null, FormData>(
    revokeDeviceAction, null,
  );
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="deviceId" value={id} />
      <button type="submit" aria-label={`Revoke ${name}`}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-faint hover:bg-danger-tint hover:text-danger">
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
