'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useSession } from '@/lib/session';
import {
  checkReference, DOCUMENT_LABELS, PRIMARY_DOCUMENTS, type DocumentType,
} from '@/lib/identity-check';
import type { CheckResult } from '@/lib/identity-check';
import { prepareDocument } from '@/lib/image-web';
import {
  clearDepositAsDemo, describeError, saveProfilePhoto, submitIdentity,
} from '@/lib/mutations';
import { DEPOSIT_CENTS, REQUIRES_PHOTO } from '@/lib/types';
import { isDemoAccount } from '@/lib/demo';
import { validateTd3Line2 } from '@/lib/document-validation';
import { Button, Card, ErrorState, Pill, SectionLabel, money } from '@/components/ui';

/**
 * Identity verification and the deposit gate.
 *
 * Screening runs in the browser before anything uploads, and names the fix for
 * each failure — the person is still holding the document, so "rest it on a
 * flat surface" now beats a rejection three days later.
 *
 * It is screening, not proofing: it cannot tell you a document is genuine, and
 * nothing running in the claimant's own browser could. The page says so.
 */
export default function Verify() {
  const { user } = useSession();
  const [type, setType] = useState<DocumentType>('nationalId');
  const [reference, setReference] = useState('');
  const [refError, setRefError] = useState<string | null>(null);
  const [docShot, setDocShot] = useState<{ b64: string; check: CheckResult } | null>(null);
  const [selfie, setSelfie] = useState<{ b64: string; check: CheckResult } | null>(null);
  const [failed, setFailed] = useState<Record<string, CheckResult>>({});
  const [mrz, setMrz] = useState('');
  const [mrzNote, setMrzNote] = useState<string | null>(null);
  const [mrzOk, setMrzOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const done = user.kyc.idSubmitted;
  const ready = Boolean(docShot && selfie) && checkReference(type, reference) === null;
  const demo = isDemoAccount(user.email);
  const needsPhoto = REQUIRES_PHOTO[user.role];
  const hasPhoto = Boolean(user.profilePhotoBase64);
  // Mirrors isAccountVerified() in the rules, photo requirement included —
  // so this screen agrees with what the server will actually allow.
  const allClear = done && Boolean(user.kyc.depositPaid)
    && user.kyc.stage === 'verified' && (!needsPhoto || hasPhoto);

  function verifyMrz(line: string) {
    setMrz(line);
    if (!line.trim()) { setMrzNote(null); setMrzOk(false); return; }
    const r = validateTd3Line2(line);
    setMrzOk(r.valid);
    setMrzNote(r.valid
      ? `Check digits verified. Passport ${r.documentNumber}.`
      : r.problem ?? 'That MRZ could not be verified.');
    // A verified MRZ carries the passport number, so fill it in rather than
    // asking for the same characters twice.
    if (r.valid && r.documentNumber) {
      setReference(r.documentNumber.replace(/</g, ''));
      setRefError(null);
    }
  }

  async function capturePhoto(file: File | undefined) {
    if (!file || !user) return;
    setBusy(true); setError(null);
    try {
      const { check, base64 } = await prepareDocument(file, true);
      if (!check.passed || !base64) {
        setFailed((f) => ({ ...f, photo: check }));
        return;
      }
      setFailed((f) => { const n = { ...f }; delete n.photo; return n; });
      await saveProfilePhoto(user.uid, base64);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function clearDeposit() {
    if (!user) return;
    setBusy(true); setError(null);
    try {
      await clearDepositAsDemo(user.uid, DEPOSIT_CENTS[user.role]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function capture(file: File | undefined, isFace: boolean) {
    if (!file) return;
    setBusy(true);
    try {
      const { check, base64 } = await prepareDocument(file, isFace);
      const key = isFace ? 'selfie' : 'document';
      if (!check.passed || !base64) {
        setFailed((f) => ({ ...f, [key]: check }));
        if (isFace) setSelfie(null); else setDocShot(null);
        return;
      }
      setFailed((f) => { const n = { ...f }; delete n[key]; return n; });
      if (isFace) setSelfie({ b64: base64, check });
      else setDocShot({ b64: base64, check });
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const refIssue = checkReference(type, reference);
    if (refIssue) { setRefError(refIssue); return; }
    if (!ready || !user || !docShot || !selfie) return;
    setBusy(true); setError(null);
    try {
      await submitIdentity({
        uid: user.uid, type, reference,
        documentBase64: docShot.b64, selfieBase64: selfie.b64,
        documentCheck: docShot.check, selfieCheck: selfie.check,
      });
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Verification</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Every Felicek account needs identity on file and a cleared deposit
        before it can post or bid. There is no skip.
      </p>

      {/* The whole gate on one line. The photo requirement in particular is
          invisible until a bid is refused, because it lives in the security
          rules rather than on this screen — so it is listed here instead. */}
      <div className="mt-6 rounded-card-lg border border-border bg-neutral-tint p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {allClear ? 'Account ready' : 'What is left'}
          </p>
          {allClear && <Pill tone="teal">✓ Verified</Pill>}
        </div>
        <ul className="mt-3 space-y-2">
          <Requirement done={done} label="Identity documents" />
          {needsPhoto && (
            <Requirement done={hasPhoto} label="Profile photo"
              note="Required for freelancers by the security rules." />
          )}
          <Requirement done={Boolean(user.kyc.depositPaid)}
            label={`Deposit — ${money(DEPOSIT_CENTS[user.role])}`} />
        </ul>
        {allClear && (
          <Link href={'/dashboard' as Route}
            className="mt-4 inline-block rounded-button bg-ink-strong px-4 py-2.5 text-sm font-bold text-canvas">
            Go to your dashboard →
          </Link>
        )}
      </div>

      <section className="mt-8">
        <SectionLabel>Identity</SectionLabel>
        {done ? (
          <Card className="mt-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">
                {DOCUMENT_LABELS[(user.kyc.idDocumentType as DocumentType) ?? 'nationalId']} on file
              </span>
              {/* The screening already ran, on this device, before anything
                  uploaded — so the verdict is known the moment it is stored.
                  Showing "Submitted" implied a queue that does not exist. */}
              <Pill tone="teal">
                {user.kyc.stage === 'verified' ? '✓ Verified' : 'Submitted'}
              </Pill>
            </div>
            {user.kyc.stage === 'verified' && (
              <p className="mt-2 text-xs text-ink-muted">
                Checked and cleared instantly on this device. No review queue,
                no waiting.
              </p>
            )}
          </Card>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRIMARY_DOCUMENTS.map((t) => (
                <button key={t} onClick={() => setType(t)} aria-pressed={type === t}
                  className={`rounded-[9px] px-3 py-1.5 text-xs font-semibold transition ${
                    type === t ? 'bg-teal text-white' : 'bg-backdrop text-ink-muted'
                  }`}>
                  {DOCUMENT_LABELS[t]}
                </button>
              ))}
            </div>

            {type === 'passport' && (
              <label className="mt-4 block">
                <span className="text-xs font-semibold text-ink-muted">
                  Machine-readable zone — second line (optional)
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-faint">
                  The lower of the two {'<<<'} lines at the bottom of the photo
                  page, 44 characters. Its check digits are verified here, which
                  is a real arithmetic check a made-up number cannot pass.
                </span>
                <input value={mrz} onChange={(e) => verifyMrz(e.target.value)}
                  spellCheck={false} autoCapitalize="characters"
                  placeholder="L898902C36UTO7408122F1204159ZE184226B<<<<<10"
                  className={`mt-1.5 w-full rounded-field border bg-surface px-3.5 py-3 font-mono text-sm outline-none ${
                    mrz && mrzOk ? 'border-teal' : mrz ? 'border-danger' : 'border-border focus:border-teal'
                  }`} />
                {mrzNote && (
                  <span className={`mt-1 block text-xs ${mrzOk ? 'text-teal-deep' : 'text-danger'}`}>
                    {mrzOk ? '✓ ' : '• '}{mrzNote}
                  </span>
                )}
              </label>
            )}

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-ink-muted">
                {type === 'nationalId' ? 'National ID number' : 'Document number'}
              </span>
              {type === 'nationalId' && (
                <span className="mt-0.5 block text-[11px] text-ink-faint">
                  10, 13 or 17 digits. A 17-digit number starts with your birth
                  year, and that is checked.
                </span>
              )}
              <input value={reference}
                inputMode={type === 'nationalId' ? 'numeric' : 'text'}
                onChange={(e) => { setReference(e.target.value); setRefError(null); }}
                className="mt-1.5 w-full rounded-field border border-border bg-surface px-3.5 py-3 text-base outline-none focus:border-teal sm:text-sm" />
              {refError && <span className="mt-1 block text-xs text-danger">{refError}</span>}
            </label>

            <Capture label="Photo of the document"
              hint="Flat surface, all four corners in frame."
              captured={Boolean(docShot)} result={failed.document}
              onFile={(f) => void capture(f, false)} busy={busy} />

            <Capture label="Selfie" hint="Face the camera in good light."
              captured={Boolean(selfie)} result={failed.selfie}
              onFile={(f) => void capture(f, true)} busy={busy} capture="user" />

            {error && <div className="mt-4"><ErrorState message={error} /></div>}

            <Button className="mt-5 w-full" busy={busy} disabled={!ready} onClick={submit}>
              Verify now — instant
            </Button>
            <p className="mt-3 text-xs text-ink-faint">
              Checks run on this device and confirm the photos are legible — they
              do not confirm the document is genuine. Submitting a document that
              is not yours costs you the account and the deposit.
            </p>
          </>
        )}
      </section>

      {needsPhoto && (
        <section className="mt-10">
          <SectionLabel>Profile photo</SectionLabel>
          <Card className="mt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {hasPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`data:image/jpeg;base64,${user.profilePhotoBase64}`}
                    alt="Your profile photo"
                    className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-backdrop text-ink-faint">
                    ?
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold">
                    {hasPhoto ? 'Photo on file' : 'Required for freelancers'}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    A verified freelancer without a face defeats the point.
                  </p>
                </div>
              </div>
              <label className="cursor-pointer whitespace-nowrap text-xs font-bold text-teal-deep">
                {hasPhoto ? 'Replace' : 'Add photo'}
                <input type="file" accept="image/*" capture="user" className="hidden"
                  disabled={busy}
                  onChange={(e) => void capturePhoto(e.target.files?.[0])} />
              </label>
            </div>
            {failed.photo && !failed.photo.passed && (
              <ul className="mt-2 space-y-1">
                {failed.photo.reasons.map((r) => (
                  <li key={r} className="text-xs text-danger">• {r}</li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      <section className="mt-10">
        <SectionLabel>Deposit</SectionLabel>
        <Card className="mt-3">
          <div className="flex items-center justify-between">
            <span className="font-serif text-2xl font-semibold">
              {money(DEPOSIT_CENTS[user.role])}
            </span>
            {user.kyc.depositPaid
              ? <Pill tone="teal">Cleared</Pill>
              : <Pill>{done ? 'Ready to pay' : 'Verify ID first'}</Pill>}
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            {user.role === 'freelancer'
              ? 'A refundable trust bond, released after your first completed job.'
              : 'A job-posting balance — your money, spent into escrow when you hire.'}
          </p>
          {/* Never leave this screen without saying what happens next. A
              deposit that cannot be paid and does not explain itself is a dead
              end, and this is the last gate before the product. */}
          {!user.kyc.depositPaid && !demo && (
            <div className="mt-4 rounded-field border border-amber/40 bg-amber-tint p-3">
              <p className="text-xs font-semibold">
                There is no card checkout on the web yet
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Clearing a deposit needs a payment gateway webhook running on a
                server — an account is never allowed to mark its own payment as
                received, which is the rule that makes escrow mean anything.
                Until that server exists, this gate opens only for accounts on
                the demo allowlist.
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                To unblock <strong>{user.email}</strong>: add it to{' '}
                <code className="rounded bg-canvas px-1 py-0.5">isDemoAccount()</code>{' '}
                in <code className="rounded bg-canvas px-1 py-0.5">firebase/firestore.rules</code>{' '}
                and to <code className="rounded bg-canvas px-1 py-0.5">src/lib/demo.ts</code>,
                then publish the rules again.
              </p>
            </div>
          )}

          {demo && !user.kyc.depositPaid && (
            <div className="mt-4 rounded-field border border-teal/40 bg-teal-tint p-3">
              <p className="text-xs font-semibold">Demo account — skip the payment</p>
              <p className="mt-1 text-xs text-ink-muted">
                This address is on the demo allowlist in the security rules, so
                it can clear its own deposit without paying. Every other account
                is refused this by the server, not by hiding the button.
              </p>
              <Button className="mt-3 w-full" busy={busy}
                onClick={clearDeposit}>
                Clear deposit now — no payment
              </Button>
            </div>
          )}
        </Card>

        {demo && (
          <p className="mt-3 text-xs text-ink-faint">
            Remove this address from <code className="rounded bg-backdrop px-1 py-0.5">isDemoAccount()</code>{' '}
            in firestore.rules and from src/lib/demo.ts before taking real
            payments — until you do, anyone who can register it gets a free
            verified account.
          </p>
        )}
      </section>
    </div>
  );
}

function Requirement({ done, label, note }: {
  done: boolean; label: string; note?: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        done ? 'bg-teal text-white' : 'border border-border-strong text-transparent'
      }`}>
        ✓
      </span>
      <span>
        <span className={`block text-sm ${done ? 'text-ink-muted line-through' : 'font-medium'}`}>
          {label}
        </span>
        {note && !done && (
          <span className="mt-0.5 block text-xs text-ink-faint">{note}</span>
        )}
      </span>
    </li>
  );
}

function Capture({ label, hint, captured, result, onFile, busy, capture }: {
  label: string; hint: string; captured: boolean;
  result?: CheckResult; onFile: (f: File | undefined) => void;
  busy: boolean; capture?: 'user' | 'environment';
}) {
  const failed = result && !result.passed;
  return (
    <div className={`mt-3 rounded-card border p-4 ${
      captured ? 'border-teal/40 bg-teal-tint'
        : failed ? 'border-danger/40 bg-danger-tint' : 'border-border bg-surface'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{captured ? 'Looks good' : hint}</p>
        </div>
        <label className="cursor-pointer text-xs font-bold text-teal-deep">
          {captured ? 'Replace' : 'Choose file'}
          <input type="file" accept="image/*" capture={capture} className="hidden"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {failed && (
        <ul className="mt-2 space-y-1">
          {result!.reasons.map((r) => (
            <li key={r} className="text-xs text-danger">• {r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
