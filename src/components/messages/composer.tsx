'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { sendMessageAction } from '@/server/actions/messages';
import type { FormResult } from '@/server/actions/profile';

export function Composer({ threadId }: { threadId: string }) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    sendMessageAction, null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box once the server confirms, not on submit — an optimistic
  // clear loses the text when the send fails, which is the moment you most
  // want it back.
  useEffect(() => { if (state?.ok) formRef.current?.reset(); }, [state]);

  return (
    <form ref={formRef} action={action}
      className="border-t border-border bg-surface p-3">
      <input type="hidden" name="threadId" value={threadId} />
      {state?.error && <div className="mb-2"><FormError>{state.error}</FormError></div>}
      <div className="flex items-end gap-2">
        <textarea name="body" rows={2}
          aria-label="Message"
          placeholder="Write a message"
          className="min-h-[44px] flex-1 resize-y rounded-md border border-border-strong bg-canvas px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line — the convention every
            // chat app trained people on.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }} />
        <Send_ />
      </div>
      {state?.fieldErrors?.body && (
        <p className="mt-1.5 text-sm text-danger">{state.fieldErrors.body}</p>
      )}
    </form>
  );
}

function Send_() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="icon" disabled={pending}
      aria-label="Send message">
      <Send className="h-4 w-4" />
    </Button>
  );
}
