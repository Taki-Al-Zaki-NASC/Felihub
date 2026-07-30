'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { MarketingHeader, MarketingFooter } from '@/components/marketing-chrome';
import { firebase, isFirebaseConfigured } from '@/lib/firebase';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const fb = firebase();
    if (!fb) {
      setError('This deployment has no Firebase configuration, so the form cannot send.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(fb.db, 'contactMessages'), {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setName(''); setEmail(''); setMessage('');
    } catch {
      setError('Could not send that. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Contact us</h1>
        <p className="mt-3 text-ink-muted">
          A question before you sign up, a bug, anything else — this goes
          straight through, no ticket number.
        </p>

        {sent ? (
          <div className="mt-10 rounded-card-lg border border-teal/30 bg-teal-tint p-6">
            <p className="font-semibold text-teal-deep">Sent — thanks.</p>
            <p className="mt-1 text-sm text-ink-muted">
              There&apos;s no auto-reply system yet, so expect a reply directly
              at the email you gave, when there is one to send.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-4">
            <Field label="Name" value={name} onChange={setName} type="text" />
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <label className="block">
              <span className="text-xs font-semibold text-ink-muted">Message</span>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 w-full rounded-field border border-border bg-surface px-3.5 py-3 text-base outline-none focus:border-teal sm:text-sm"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-field bg-danger-tint px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            {!isFirebaseConfigured && !error && (
              <p className="rounded-field border border-amber/30 bg-amber-tint px-3 py-2 text-sm">
                This deployment has no Firebase configuration yet, so sending
                will fail until it does.
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !name.trim() || !email.trim() || !message.trim()}
              className="w-full rounded-button bg-ink-strong px-5 py-3.5 text-sm font-bold text-canvas disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}

function Field({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-field border border-border bg-surface px-3.5 py-3 text-base outline-none focus:border-teal sm:text-sm"
      />
    </label>
  );
}
