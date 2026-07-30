import test from 'node:test';
import assert from 'node:assert/strict';
import {
  icaoCheckDigit, validateTd3Line2, validateBangladeshNid,
} from '../document-validation.ts';

/**
 * The worked examples in ICAO Doc 9303 Part 3. If these drift, the check
 * digit implementation is wrong and every passport validation with it.
 */
test('ICAO check digit matches the published worked examples', () => {
  // Each verified by hand against the 7-3-1 weighting, e.g. D231458907:
  // D=13×7 + 2×3 + 3×1 + 1×7 + 4×3 + 5×1 + 8×7 + 9×3 + 0×1 + 7×7 = 256 → 6.
  assert.equal(icaoCheckDigit('520727'), 3);
  assert.equal(icaoCheckDigit('AB2134'), 5);
  assert.equal(icaoCheckDigit('HA672242'), 6);
  assert.equal(icaoCheckDigit('D231458907'), 6);
});

test('filler and letters are weighted, unknown characters rejected', () => {
  assert.equal(icaoCheckDigit('<<<<<<'), 0);
  assert.equal(icaoCheckDigit('a1'), -1, 'lower case is not an MRZ character');
  assert.equal(icaoCheckDigit('12-34'), -1);
});

/**
 * The specimen printed in ICAO 9303 Part 4. Its check digits are all correct,
 * so validating it exercises every digit in the line — but it expired in 2012,
 * so the only complaint must be the expiry. That makes it a sharper test than
 * a hand-made line: if any check-digit branch were wrong, the failure would
 * name that field instead.
 */
const ICAO_SPECIMEN = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';

test('the ICAO specimen passes every check digit and fails only on expiry', () => {
  assert.equal(ICAO_SPECIMEN.length, 44);
  const r = validateTd3Line2(ICAO_SPECIMEN);
  assert.equal(r.valid, false);
  assert.match(r.problem!, /expired/i, `expected expiry, got: ${r.problem}`);
  assert.equal(r.documentNumber, 'L898902C3');
  assert.equal(r.birthDate, '740812');
});

/** The same specimen re-dated into the future, check digits recomputed. */
function specimenExpiring(yymmdd: string): string {
  const num = 'L898902C3';
  const numCk = String(icaoCheckDigit(num));
  const dob = '740812';
  const dobCk = String(icaoCheckDigit(dob));
  const expCk = String(icaoCheckDigit(yymmdd));
  const personal = 'ZE184226B<<<<<';
  const personalCk = String(icaoCheckDigit(personal));
  const composite = num + numCk + dob + dobCk + yymmdd + expCk + personal + personalCk;
  return `${num}${numCk}UTO${dob}${dobCk}F${yymmdd}${expCk}${personal}${personalCk}`
    + String(icaoCheckDigit(composite));
}

test('a valid, unexpired TD3 second line passes', () => {
  const line = specimenExpiring('401231'); // 2040
  assert.equal(line.length, 44);
  const r = validateTd3Line2(line);
  assert.equal(r.valid, true, r.problem);
  assert.equal(r.documentNumber, 'L898902C3');
});

test('a single altered digit fails — this is the whole point', () => {
  const line = specimenExpiring('401231');
  // Change the passport number without changing its check digit.
  const tampered = `L898902C4${line.slice(9)}`;
  const r = validateTd3Line2(tampered);
  assert.equal(r.valid, false);
  assert.match(r.problem!, /passport number/i);
});

test('a wrong length is refused with the length named', () => {
  const r = validateTd3Line2('L898902C3');
  assert.equal(r.valid, false);
  assert.match(r.problem!, /44 characters/);
});

test('an expired passport is refused even when the digits agree', () => {
  // Same specimen with expiry 010101 (2001) and its recomputed check digits.
  const num = 'L898902C3';
  const numCk = String(icaoCheckDigit(num));
  const dob = '740812';
  const dobCk = String(icaoCheckDigit(dob));
  const exp = '010101';
  const expCk = String(icaoCheckDigit(exp));
  const personal = '<'.repeat(14);
  const head = `${num}${numCk}UTO${dob}${dobCk}F${exp}${expCk}${personal}0`;
  const line = `${head}${icaoCheckDigit(head.slice(0, 9) + numCk + dob + dobCk + exp + expCk + personal + '0')}`;
  const r = validateTd3Line2(line);
  assert.equal(r.valid, false);
  assert.match(r.problem!, /expired/i);
});

test('a 17-digit NID carries a plausible birth year', () => {
  assert.equal(validateBangladeshNid('19900123456789012').valid, true);
  assert.equal(validateBangladeshNid('19900123456789012').birthYear, 1990);
});

test('a 17-digit NID with an impossible year is refused', () => {
  const r = validateBangladeshNid('30000123456789012');
  assert.equal(r.valid, false);
  assert.match(r.problem!, /birth year/i);
});

test('an under-18 holder is refused', () => {
  const recent = new Date().getUTCFullYear() - 5;
  const r = validateBangladeshNid(`${recent}0123456789012`);
  assert.equal(r.valid, false);
  assert.match(r.problem!, /at least 18/i);
});

test('10 and 13 digit NIDs are accepted, other lengths are not', () => {
  assert.equal(validateBangladeshNid('1234567890').valid, true);
  assert.equal(validateBangladeshNid('1234567890123').valid, true);
  assert.equal(validateBangladeshNid('12345678').valid, false);
});

test('repeated digits and non-digits are refused', () => {
  assert.equal(validateBangladeshNid('1111111111').valid, false);
  assert.equal(validateBangladeshNid('12345ABCDE').valid, false);
});
