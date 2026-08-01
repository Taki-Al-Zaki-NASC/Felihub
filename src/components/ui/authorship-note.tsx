import { Keyboard, ClipboardPaste, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StoredSignal } from '@/server/services/authorship';

/**
 * The note that sits next to a piece of writing.
 *
 * It says what was observed and then stops. There is no percentage, no
 * "AI-generated", no red, and no way to click through to a verdict — because
 * the underlying signal does not support one. A text that arrived by paste was
 * pasted; that is a fact, and most people draft somewhere else.
 *
 * `REVIEW` is the strongest thing this can say, and all it means is: pasted in
 * whole, and reads evenly enough to be worth reading closely. It is amber
 * rather than red on purpose. A client deciding to ask a follow-up question is
 * the intended outcome; a client dismissing somebody is not.
 *
 * `self` swaps the wording to the second person. Whoever wrote the text sees
 * the same assessment the reader does, which is the difference between context
 * and a secret file.
 */
export function AuthorshipNote({ signal, self = false, className }: {
  signal: StoredSignal | null;
  self?: boolean;
  className?: string;
}) {
  if (!signal) return null;

  const Icon = signal.band === 'TYPED' ? Keyboard
    : signal.band === 'REVIEW' ? Eye : ClipboardPaste;

  const tones = {
    teal: 'border-teal/30 bg-teal-tint text-teal-deep',
    amber: 'border-amber/30 bg-amber-tint text-amber',
    neutral: 'border-border bg-neutral-tint text-ink-muted',
  } as const;

  return (
    <div className={cn('rounded-md border px-3 py-2', tones[signal.tone], className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {self ? `Shown to readers: ${signal.label.toLowerCase()}` : signal.label}
      </p>
      {signal.reasons.length > 0 && (
        <p className="mt-1 text-xs opacity-90">{signal.reasons.join(' ')}</p>
      )}
      {signal.band === 'REVIEW' && (
        <p className="mt-1 text-xs opacity-80">
          {self
            ? 'This is not a penalty and it changes nothing about how your '
              + 'profile ranks. Writing it in the box yourself is what clears it.'
            : 'Not a judgement about the person — writing style is weak '
              + 'evidence, and it misreads second-language writing badly. Ask '
              + 'them about the work.'}
        </p>
      )}
    </div>
  );
}
