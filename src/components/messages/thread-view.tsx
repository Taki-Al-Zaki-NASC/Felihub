'use client';

import * as React from 'react';
import { Send, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { ago } from '@/lib/money';
import { useThreadChannel } from '@/lib/realtime/use-thread';
import { sendMessageAction } from '@/server/actions/messages';

export interface MessageRow {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  attachmentUrl: string | null;
  watermarked: boolean;
  releasedAt: string | null;
}

/**
 * The conversation, and the box you type into.
 *
 * ── Why this is a client component now ──────────────────────────────────
 *
 * It used to be a server-rendered list plus a form whose Server Action called
 * `revalidatePath`. Sending therefore cost: the action's own queries, then a
 * full re-render of the route — which re-ran the layout's session lookup and
 * every query on the page — then the new RSC payload over the wire. Ten or so
 * sequential round trips before your own message appeared. Against a database
 * in another region that is the six seconds.
 *
 * Now the message is appended the instant you press Enter and the write
 * happens behind it. If the write fails the message is marked as failed rather
 * than vanishing, because silently losing what somebody typed is worse than
 * showing them it did not go.
 *
 * The other side gets it over Realtime broadcast, one hop, no revalidation.
 * Where Realtime is not configured they get it on their next page load, which
 * is exactly what happened before — nothing regresses, it just stops being
 * instant.
 */
export function ThreadView({ threadId, selfId, initial }: {
  threadId: string;
  selfId: string;
  initial: MessageRow[];
}) {
  const [messages, setMessages] = React.useState<MessageRow[]>(initial);
  const [failed, setFailed] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string>();
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const bottom = React.useRef<HTMLDivElement>(null);

  const onEvent = React.useCallback((event: Parameters<
    Parameters<typeof useThreadChannel>[2]>[0]) => {
    if (event.type !== 'message') return;
    setMessages((cur) => (cur.some((m) => m.id === event.id) ? cur : [...cur, {
      id: event.id,
      body: event.body,
      senderId: event.senderId,
      createdAt: event.createdAt,
      attachmentUrl: null,
      watermarked: false,
      releasedAt: null,
    }]));
  }, []);

  const { connected, send } = useThreadChannel(threadId, selfId, onEvent);

  React.useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const submit = async () => {
    const text = body.trim();
    if (!text || sending) return;

    // Rendered before the network is touched. The id is temporary and is
    // replaced by the real one when the action answers.
    const tempId = `pending-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId, body: text, senderId: selfId,
      createdAt: new Date().toISOString(),
      attachmentUrl: null, watermarked: false, releasedAt: null,
    };
    setMessages((cur) => [...cur, optimistic]);
    setBody('');
    setError(undefined);
    setSending(true);

    const data = new FormData();
    data.set('threadId', threadId);
    data.set('body', text);
    const result = await sendMessageAction(null, data);
    setSending(false);

    if (result?.error || result?.fieldErrors?.body) {
      setFailed((cur) => new Set(cur).add(tempId));
      setError(result.error ?? result.fieldErrors?.body);
      // The text goes back in the box so it is not lost.
      setBody(text);
      return;
    }

    const realId = result?.message ?? tempId;
    setMessages((cur) => cur.map((m) => (m.id === tempId ? { ...m, id: realId } : m)));
    send({
      type: 'message', id: realId, senderId: selfId,
      body: text, createdAt: optimistic.createdAt,
    });
  };

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            No messages yet. Say hello.
          </p>
        ) : messages.map((m) => {
          const mine = m.senderId === selfId;
          const didNotSend = failed.has(m.id);
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-lg px-3.5 py-2.5 ${
                didNotSend ? 'border border-danger bg-danger-tint'
                  : mine ? 'bg-teal text-white' : 'border border-border bg-surface'
              }`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                {m.attachmentUrl && (
                  <p className={`mt-1.5 text-xs ${mine ? 'text-white/70' : 'text-ink-muted'}`}>
                    {m.releasedAt ? 'Attachment released'
                      : m.watermarked
                        ? 'Watermarked preview — the clean file unlocks when the milestone is released'
                        : 'Attachment'}
                  </p>
                )}
                <p className={`mt-1 text-[11px] ${
                  didNotSend ? 'text-danger' : mine ? 'text-white/60' : 'text-ink-faint'
                }`}>
                  {didNotSend ? 'Not sent'
                    : m.id.startsWith('pending-') ? 'Sending…'
                      : ago(new Date(m.createdAt))}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="border-t border-border bg-surface p-3">
        {error && <div className="mb-2"><FormError>{error}</FormError></div>}
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            aria-label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message"
            className="min-h-[44px] flex-1 resize-y rounded-md border border-border-strong bg-canvas px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line.
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); }
            }} />
          <Button type="button" variant="primary" size="icon"
            onClick={submit} disabled={sending || body.trim().length === 0}
            aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {connected && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-teal-deep">
            <Wifi className="h-3 w-3" /> Live — messages arrive without a refresh
          </p>
        )}
      </div>
    </>
  );
}
