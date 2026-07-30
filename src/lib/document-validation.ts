/**
 * Structural validation of document numbers.
 *
 * This is the part of verification that can be made genuinely real in a
 * browser, and it is worth being precise about what "real" means here.
 *
 * A length-and-charset check — which is all this used to do — accepts
 * "12345678901234567". These checks do not: a Bangladesh NID carries the
 * holder's birth date in the number itself, and a passport's MRZ carries
 * ICAO 9303 check digits computed from the other fields. Both are arithmetic
 * that a fabricated number fails. That is a real constraint, not a formatting
 * hint.
 *
 * What it still cannot do is tell you the number was ever *issued*, or that it
 * belongs to the person holding the camera. Only the issuing authority can
 * answer the first and only a KYC provider the second. Nothing running on the
 * claimant's own device will ever close that gap, because the device is theirs.
 */

/**
 * ICAO 9303 check digit: weights cycle 7-3-1, letters are A=10…Z=35, filler
 * `<` is 0, and the result is the running total mod 10. Used on every
 * machine-readable passport in the world.
 */
export function icaoCheckDigit(input: string): number {
  const WEIGHTS = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    let v: number;
    if (c >= '0' && c <= '9') v = c.charCodeAt(0) - 48;
    else if (c >= 'A' && c <= 'Z') v = c.charCodeAt(0) - 55;
    else if (c === '<') v = 0;
    else return -1; // not an MRZ character
    sum += v * WEIGHTS[i % 3];
  }
  return sum % 10;
}

export interface MrzResult {
  valid: boolean;
  /** Which field failed, for a message that names the fix. */
  problem?: string;
  documentNumber?: string;
  birthDate?: string;
  expiryDate?: string;
}

/**
 * Validates the second line of a TD3 passport MRZ (44 characters).
 *
 * Layout: passport number (9) + check (1) + nationality (3) + birth date (6)
 * + check (1) + sex (1) + expiry (6) + check (1) + personal number (14) +
 * check (1) + composite check (1).
 *
 * Every check digit is recomputed. A transcription slip or an invented number
 * fails, which is the entire point — this is the one place in the flow where
 * the input can be proven internally consistent rather than merely plausible.
 */
export function validateTd3Line2(raw: string): MrzResult {
  const line = raw.trim().toUpperCase().replace(/\s/g, '');
  if (line.length !== 44) {
    return { valid: false, problem: `The second MRZ line is 44 characters; this is ${line.length}.` };
  }
  if (!/^[A-Z0-9<]+$/.test(line)) {
    return { valid: false, problem: 'The MRZ uses only letters, digits and < characters.' };
  }

  const documentNumber = line.slice(0, 9);
  const docCheck = line[9];
  const birthDate = line.slice(13, 19);
  const birthCheck = line[19];
  const expiryDate = line.slice(21, 27);
  const expiryCheck = line[27];
  const personalNumber = line.slice(28, 42);
  const personalCheck = line[42];
  const compositeCheck = line[43];

  const digit = (s: string) => String(icaoCheckDigit(s));

  if (digit(documentNumber) !== docCheck) {
    return { valid: false, problem: 'The passport number and its check digit do not agree. Re-type the MRZ exactly as printed.' };
  }
  if (digit(birthDate) !== birthCheck) {
    return { valid: false, problem: 'The date of birth and its check digit do not agree.' };
  }
  if (digit(expiryDate) !== expiryCheck) {
    return { valid: false, problem: 'The expiry date and its check digit do not agree.' };
  }
  // The personal-number field is often all filler, whose check digit is 0 —
  // but some issuers print < instead. Both are accepted.
  if (personalCheck !== '<' && digit(personalNumber) !== personalCheck) {
    return { valid: false, problem: 'The personal-number check digit does not agree.' };
  }

  const composite = documentNumber + docCheck + birthDate + birthCheck
    + expiryDate + expiryCheck + personalNumber
    + (personalCheck === '<' ? '0' : personalCheck);
  if (digit(composite) !== compositeCheck) {
    return { valid: false, problem: 'The final composite check digit does not agree. One of the fields is mistyped.' };
  }

  if (isExpired(expiryDate)) {
    return { valid: false, problem: 'That passport has expired.', documentNumber, birthDate, expiryDate };
  }

  return { valid: true, documentNumber, birthDate, expiryDate };
}

/** YYMMDD from an MRZ. Expiry windows are near-term, so 20xx is unambiguous. */
function isExpired(yymmdd: string): boolean {
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (!(mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31)) return false;
  const expiry = new Date(Date.UTC(2000 + yy, mm - 1, dd));
  return expiry.getTime() < Date.now();
}

export interface NidResult {
  valid: boolean;
  problem?: string;
  birthYear?: number;
}

/**
 * Bangladesh National ID.
 *
 * Three formats are in circulation:
 *   17 digits — 4-digit birth year, then a 13-digit registration number.
 *   13 digits — the older form, no embedded year.
 *   10 digits — the smart-card (NIDW) number.
 *
 * The 17-digit form is the one that can actually be checked: the leading four
 * digits are the birth year, so a fabricated number usually announces itself.
 * The account also has to be old enough to enter a contract, which is a real
 * eligibility rule rather than a formatting one.
 */
export function validateBangladeshNid(raw: string): NidResult {
  const value = raw.trim().replace(/[\s-]/g, '');
  if (!/^\d+$/.test(value)) {
    return { valid: false, problem: 'A National ID number is digits only.' };
  }
  if (![10, 13, 17].includes(value.length)) {
    return {
      valid: false,
      problem: `A National ID is 10, 13 or 17 digits — this is ${value.length}.`,
    };
  }
  if (/^(\d)\1+$/.test(value)) {
    return { valid: false, problem: 'That is the same digit repeated, not a National ID.' };
  }

  if (value.length === 17) {
    const year = Number(value.slice(0, 4));
    const thisYear = new Date().getUTCFullYear();
    if (year < 1900 || year > thisYear) {
      return {
        valid: false,
        problem: `A 17-digit National ID starts with the birth year; ${year} is not one.`,
      };
    }
    if (thisYear - year < 18) {
      return {
        valid: false,
        problem: 'You must be at least 18 to hold a Felicek account.',
      };
    }
    return { valid: true, birthYear: year };
  }

  return { valid: true };
}
