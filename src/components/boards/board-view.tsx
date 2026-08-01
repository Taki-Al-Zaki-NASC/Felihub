'use client';

import * as React from 'react';
import { Plus, Link2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addCardAction, deleteCardAction, moveCardAction } from '@/server/actions/boards';

/**
 * The board.
 *
 * Native HTML5 drag and drop rather than a library: this needs one gesture,
 * and the smallest sensible dependency for it is about 40 KB of JavaScript on
 * a page that currently ships none of its own.
 *
 * The move is optimistic. The card lands where it was dropped immediately and
 * the Server Action follows; the alternative is a card that jumps back to its
 * old column for the length of a round trip, which reads as the drop having
 * failed. If the write does fail the page revalidates and the truth returns.
 *
 * Keyboard users are not left with a mouse-only feature: every card carries
 * "move to" buttons, which do the same thing the drop does.
 */
export interface CardRow {
  id: string;
  title: string;
  columnId: string;
  position: number;
  milestoneId: string | null;
}

export interface ColumnRow {
  id: string;
  title: string;
  position: number;
}

export function BoardView({ boardId, columns, cards, canEdit }: {
  boardId: string;
  columns: ColumnRow[];
  cards: CardRow[];
  canEdit: boolean;
}) {
  const [rows, setRows] = React.useState(cards);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);

  // The server is the source of truth; this resyncs after a revalidation.
  React.useEffect(() => setRows(cards), [cards]);

  const inColumn = (columnId: string) =>
    rows.filter((c) => c.columnId === columnId).sort((a, b) => a.position - b.position);

  const move = (cardId: string, columnId: string, index: number) => {
    const target = inColumn(columnId).filter((c) => c.id !== cardId);
    const before = target[index - 1];
    const after = target[index];

    setRows((cur) => cur.map((c) => (c.id === cardId
      ? {
        ...c,
        columnId,
        position: before && after ? (before.position + after.position) / 2
          : before ? before.position + 1024
            : after ? after.position - 1024 : 1024,
      }
      : c)));

    const data = new FormData();
    data.set('cardId', cardId);
    data.set('columnId', columnId);
    if (before) data.set('before', before.id);
    if (after) data.set('after', after.id);
    void moveCardAction(null, data);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.sort((a, b) => a.position - b.position).map((column) => {
        const list = inColumn(column.id);
        return (
          <section
            key={column.id}
            aria-label={column.title}
            onDragOver={(e) => { e.preventDefault(); setOver(column.id); }}
            onDragLeave={() => setOver((c) => (c === column.id ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              if (dragging) move(dragging, column.id, list.length);
              setDragging(null);
            }}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-lg border bg-neutral-tint p-3 transition',
              over === column.id ? 'border-teal bg-teal-tint' : 'border-border',
            )}>
            <h2 className="flex items-baseline justify-between px-1 pb-2 text-sm font-semibold">
              {column.title}
              <span className="text-xs font-normal tabular-nums text-ink-muted">
                {list.length}
              </span>
            </h2>

            <ul className="flex-1 space-y-2">
              {list.map((card, i) => (
                <li key={card.id}>
                  <div
                    draggable={canEdit}
                    onDragStart={() => setDragging(card.id)}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setOver(null);
                      if (dragging && dragging !== card.id) move(dragging, column.id, i);
                      setDragging(null);
                    }}
                    className={cn(
                      'rounded-md border border-border bg-surface p-3 text-sm',
                      canEdit && 'cursor-grab active:cursor-grabbing',
                      dragging === card.id && 'opacity-40',
                    )}>
                    <p className="font-medium">{card.title}</p>

                    {card.milestoneId && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-violet">
                        <Link2 className="h-3 w-3" /> a milestone on this job
                      </p>
                    )}

                    {canEdit && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {/* Drag is a mouse gesture. These are the same move,
                            reachable from a keyboard. */}
                        {columns
                          .filter((c) => c.id !== column.id)
                          .map((c) => (
                            <button key={c.id} type="button"
                              onClick={() => move(card.id, c.id, Number.MAX_SAFE_INTEGER)}
                              className="min-h-[28px] rounded border border-border px-2 text-xs text-ink-muted hover:border-teal hover:text-teal-deep">
                              → {c.title}
                            </button>
                          ))}
                        {!card.milestoneId && (
                          <DeleteCard id={card.id}
                            onDone={() => setRows((cur) => cur.filter((r) => r.id !== card.id))} />
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {canEdit && <AddCard boardId={boardId} columnId={column.id} />}
          </section>
        );
      })}
    </div>
  );
}

function AddCard({ boardId, columnId }: { boardId: string; columnId: string }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-2 flex min-h-[36px] w-full items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink">
        <Plus className="h-4 w-4" /> Add a card
      </button>
    );
  }

  const submit = async () => {
    if (title.trim().length < 2) { setError('A card needs a title.'); return; }
    setBusy(true);
    const data = new FormData();
    data.set('boardId', boardId);
    data.set('columnId', columnId);
    data.set('title', title.trim());
    const result = await addCardAction(null, data);
    setBusy(false);
    if (result?.error) { setError(result.error); return; }
    setTitle('');
    setError(undefined);
    setOpen(false);
  };

  return (
    <div className="mt-2">
      <label htmlFor={`add-${columnId}`} className="sr-only">New card title</label>
      <textarea
        id={`add-${columnId}`}
        autoFocus
        rows={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="What needs doing?"
        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <div className="mt-1.5 flex gap-2">
        <button type="button" onClick={submit} disabled={busy}
          className="min-h-[32px] rounded bg-ink-strong px-3 text-xs font-semibold text-canvas disabled:opacity-50">
          {busy ? 'Adding…' : 'Add'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(undefined); }}
          className="min-h-[32px] rounded px-3 text-xs font-semibold text-ink-muted hover:bg-surface">
          Cancel
        </button>
      </div>
    </div>
  );
}

function DeleteCard({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button type="button" disabled={busy}
      aria-label="Delete this card"
      onClick={async () => {
        setBusy(true);
        const data = new FormData();
        data.set('cardId', id);
        const result = await deleteCardAction(null, data);
        setBusy(false);
        if (!result?.error) onDone();
      }}
      className="ml-auto flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-danger-tint hover:text-danger">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
