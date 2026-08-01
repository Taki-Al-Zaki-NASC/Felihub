import { db } from '@/server/db';
import { analyse, describe, type Authorship, type Band, type Provenance } from '@/lib/authorship';

/**
 * Storing and reading authorship signals.
 *
 * The only module that touches `ContentSignal`. Recording is best-effort by
 * design: a failure here must never stop somebody saving their profile or
 * sending a bid, because this feature is context and the write is the point.
 */

export type SignalKind = 'PROFILE_BIO' | 'JOB_DESCRIPTION' | 'PROPOSAL_NOTE';

export interface StoredSignal {
  band: Band;
  reasons: string[];
  label: string;
  tone: 'neutral' | 'teal' | 'amber';
}

/** Analyse and store. Returns what was stored, or null if nothing was. */
export async function record(
  kind: SignalKind,
  refId: string,
  text: string,
  provenance: Provenance | null,
): Promise<Authorship | null> {
  const result = analyse(text, provenance);

  const data = {
    band: result.band,
    score: result.score,
    reasons: result.reasons,
    typed: provenance?.typed ?? 0,
    pasted: provenance?.pasted ?? 0,
    words: result.stylometrics?.words ?? 0,
  };

  try {
    await db.contentSignal.upsert({
      where: { kind_refId: { kind, refId } },
      create: { kind, refId, ...data },
      update: data,
    });
  } catch {
    // A missing table on a database that has not run upgrade.sql yet, or any
    // other write failure. The profile still saved; that is what matters.
    return result;
  }
  return result;
}

/** One signal, shaped for display. Null when there is nothing to show. */
export async function signalFor(
  kind: SignalKind,
  refId: string,
): Promise<StoredSignal | null> {
  try {
    const row = await db.contentSignal.findUnique({
      where: { kind_refId: { kind, refId } },
      select: { band: true, reasons: true },
    });
    if (!row) return null;
    const band = row.band as Band;
    // Nothing was observed, so nothing is asserted. Showing "not recorded"
    // next to every older profile would be noise that reads as suspicion.
    if (band === 'UNKNOWN') return null;
    return { band, reasons: row.reasons, ...describe(band) };
  } catch {
    return null;
  }
}

/** Signals for many rows at once, keyed by refId — for proposal lists, where
 *  one query per bid would be one query per bid. */
export async function signalsFor(
  kind: SignalKind,
  refIds: string[],
): Promise<Map<string, StoredSignal>> {
  const out = new Map<string, StoredSignal>();
  if (refIds.length === 0) return out;
  try {
    const rows = await db.contentSignal.findMany({
      where: { kind, refId: { in: refIds } },
      select: { refId: true, band: true, reasons: true },
    });
    for (const row of rows) {
      const band = row.band as Band;
      if (band === 'UNKNOWN') continue;
      out.set(row.refId, { band, reasons: row.reasons, ...describe(band) });
    }
  } catch {
    // Same reasoning as above: no signals is a fine outcome.
  }
  return out;
}
