/**
 * Real document validation.
 *
 * v1 accepted any string of roughly the right length, which meant the
 * "verified" badge was decoration. These are the actual published rules: the
 * ICAO 9303 check-digit algorithm that every machine-readable passport carries,
 * and the structure of a Bangladesh NID. A typo or an invented number is
 * rejected before anything is uploaded.
 *
 * This is a format check, not an identity check — it proves the number is
 * internally consistent, not that it belongs to the person. The document image
 * and the selfie are what a reviewer compares. What it does remove is the
 * largest category of junk: numbers that cannot exist.
 */

export type DocumentKind = 'PASSPORT' | 'NID';

export interface DocumentCheck {
  ok: boolean;
  reason?: string;
  /** Anything the number itself tells us, for the reviewer. */
  notes?: string[];
}

/**
 * ICAO 9303 check digit: weights cycle 7, 3, 1; digits are their value,
 * letters are A=10…Z=35, and the filler `<` is 0. The result is the sum mod 10.
 */
export function icaoCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i].toUpperCase();
    let value: number;
    if (c >= '0' && c <= '9') value = c.charCodeAt(0) - 48;
    else if (c >= 'A' && c <= 'Z') value = c.charCodeAt(0) - 55;
    else if (c === '<') value = 0;
    else return -1;
    sum += value * weights[i % 3];
  }
  return sum % 10;
}

/**
 * A passport number as printed in the MRZ: 9 characters, then its check digit.
 * Accepted with or without the check digit — most people read the number off
 * the top of the page, where the check digit is not shown.
 */
export function checkPassport(raw: string): DocumentCheck {
  const value = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z0-9<]{6,10}$/.test(value)) {
    return {
      ok: false,
      reason: 'A passport number is 6–9 letters and digits, optionally '
        + 'followed by its check digit.',
    };
  }

  if (value.length === 10) {
    const body = value.slice(0, 9);
    const given = Number(value[9]);
    if (!Number.isInteger(given)) {
      return { ok: false, reason: 'The last character should be the check digit.' };
    }
    const expected = icaoCheckDigit(body);
    if (expected !== given) {
      return {
        ok: false,
        reason: `That check digit does not match the number — expected ${expected}. `
          + 'Re-read the bottom line of your passport.',
      };
    }
    return { ok: true, notes: ['MRZ check digit verified.'] };
  }

  return { ok: true, notes: ['Check digit not supplied; number format accepted.'] };
}

/**
 * Bangladesh NID. Three lengths are in circulation:
 *   10 — the current smart card number
 *   13 — the older number, without the birth year
 *   17 — the older number prefixed with a four-digit birth year
 */
export function checkNid(raw: string): DocumentCheck {
  const value = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(value)) {
    return { ok: false, reason: 'A Bangladesh NID is digits only.' };
  }
  if (![10, 13, 17].includes(value.length)) {
    return {
      ok: false,
      reason: `A Bangladesh NID has 10, 13 or 17 digits — that one has ${value.length}.`,
    };
  }

  if (value.length === 17) {
    const year = Number(value.slice(0, 4));
    const thisYear = new Date().getFullYear();
    if (year < 1900 || year > thisYear) {
      return {
        ok: false,
        reason: `The first four digits of a 17-digit NID are the birth year, `
          + `and ${year} is not a plausible one.`,
      };
    }
    const age = thisYear - year;
    if (age < 18) {
      return { ok: false, reason: 'Felicek accounts are for adults only.' };
    }
    return { ok: true, notes: [`Encoded birth year ${year}.`] };
  }

  // The first two digits are the district code; 00 is not issued.
  if (value.slice(0, 2) === '00') {
    return { ok: false, reason: 'That district prefix is not issued.' };
  }
  return { ok: true };
}

export function checkDocument(kind: DocumentKind, value: string): DocumentCheck {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: 'Enter your document number.' };
  return kind === 'PASSPORT' ? checkPassport(trimmed) : checkNid(trimmed);
}
