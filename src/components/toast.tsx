'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

/**
 * Confirmation for things that worked.
 *
 * Every mutating action in this app reported failure and stayed silent on
 * success, which reads as a dead button: the spinner stops, nothing changes on
 * screen, and there is no way to tell "saved" from "did nothing". Failures had
 * a message; successes needed one too.
 *
 * Deliberately not a notification — those are records of something that
 * happened to you and live in Firestore. This is transient feedback about
 * something *you* just did, and it disappears.
 */
type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({
  show: () => {}, success: () => {}, error: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    // Date.now() alone collides when two fire in the same millisecond, which
    // duplicates React keys and drops one of them.
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (m: string) => show(m, 'success'),
    error: (m: string) => show(m, 'error'),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // Announced to screen readers, but politely — this is confirmation,
        // not an alarm that should interrupt what is being read.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t}
            onDone={() => setToasts((all) => all.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    // Errors linger: they usually need reading, and sometimes acting on.
    const ms = toast.tone === 'error' ? 6000 : 3200;
    const timer = setTimeout(onDone, ms);
    return () => clearTimeout(timer);
    // onDone is recreated each render; depending on it would reset the timer
    // on every parent render and the toast would never leave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, toast.tone]);

  const tone = {
    success: 'border-teal/40 bg-teal-tint text-ink',
    error: 'border-danger/40 bg-danger-tint text-danger',
    info: 'border-border-strong bg-surface text-ink',
  }[toast.tone];

  return (
    <div className={`pointer-events-auto w-full max-w-sm rounded-card border px-4 py-3 text-sm font-medium shadow-lg ${tone}`}>
      <span className="mr-1.5" aria-hidden>
        {toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'ℹ'}
      </span>
      {toast.message}
    </div>
  );
}
