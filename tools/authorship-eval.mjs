/**
 * Measures the authorship model against labelled examples.
 *
 *   npm run authorship:eval           print the confusion matrix
 *   npm run authorship:eval -- --refit  fit new coefficients and print them
 *
 * This exists so the model's accuracy is a number somebody can check rather
 * than a claim in a comment. The fixture set is small and hand-labelled, which
 * bounds how much the number is worth — read `fixtures.json` before quoting
 * it. What it does catch, and what it is for, is a change to the features or
 * weights that quietly makes things worse.
 *
 * The `secondLanguage` slice is the one to watch. Published work (Liang et al.,
 * Patterns 2023) found GPT detectors flagged over half of TOEFL essays by
 * non-native English writers as machine-generated, against nearly none of the
 * essays by native speakers. This marketplace is full of second-language
 * writers. If the false-positive rate on that slice ever climbs, the model is
 * not ready to ship no matter what the headline accuracy says.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const { measure } = await import('../src/lib/authorship/features.ts');
const { scoreStyle, refit, TERMS } = await import('../src/lib/authorship/model.ts');
const { STYLE_FLAGGING_ENABLED } = await import('../src/lib/authorship/index.ts');

const fixtures = JSON.parse(readFileSync(join(here, 'authorship-fixtures.json'), 'utf8'));

const rows = fixtures.map((f) => {
  const features = measure(f.text);
  return { ...f, features, score: features ? scoreStyle(features).score : null };
});

const usable = rows.filter((r) => r.features);
const tooShort = rows.length - usable.length;

/** The same threshold `index.ts` uses before it will say anything. */
const THRESHOLD = 78;

let truePos = 0; let falsePos = 0; let trueNeg = 0; let falseNeg = 0;
for (const r of usable) {
  const flagged = r.score >= THRESHOLD;
  if (r.assisted && flagged) truePos += 1;
  else if (!r.assisted && flagged) falsePos += 1;
  else if (!r.assisted && !flagged) trueNeg += 1;
  else falseNeg += 1;
}

const pct = (n, d) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(0)}%`);

console.log(`\nAuthorship model — ${usable.length} labelled samples`
  + (tooShort ? `, ${tooShort} skipped as too short to measure` : ''));
console.log(`Style threshold: ${THRESHOLD}\n`);

console.log('                 flagged   not flagged');
console.log(`  assisted        ${String(truePos).padStart(5)}   ${String(falseNeg).padStart(11)}`);
console.log(`  human           ${String(falsePos).padStart(5)}   ${String(trueNeg).padStart(11)}\n`);

console.log(`  precision  ${pct(truePos, truePos + falsePos)}   of what it flags, this much is assisted`);
console.log(`  recall     ${pct(truePos, truePos + falseNeg)}   of the assisted text, it catches this much`);

// The slice that decides whether this is deployable at all.
const esl = usable.filter((r) => !r.assisted && r.secondLanguage);
const eslFlagged = esl.filter((r) => r.score >= THRESHOLD).length;
console.log(`\n  Second-language writers, human-written: ${esl.length} samples, `
  + `${eslFlagged} flagged (${pct(eslFlagged, esl.length)})`);
// This is the gate, not a warning. The style model may only be switched on in
// the product if it clears this bar; today it does not come close, and
// STYLE_FLAGGING_ENABLED is false because of this number.
const FAIR = 0.1;
const passes = esl.length === 0 || eslFlagged / esl.length <= FAIR;

if (!passes) {
  console.log(`\n  Above the ${FAIR * 100}% ceiling. The style model may not be used to`);
  console.log('  flag anything, and it is not: STYLE_FLAGGING_ENABLED is'
    + ` ${STYLE_FLAGGING_ENABLED}.`);
  console.log('  The product reports how the text arrived — typed or pasted — and');
  console.log('  says nothing about how it reads. See src/lib/authorship/index.ts.');
  if (STYLE_FLAGGING_ENABLED) {
    console.log('\n  ✗ STYLE_FLAGGING_ENABLED is true while the model fails the fairness');
    console.log('    gate. That combination must never ship.');
    process.exitCode = 1;
  }
} else {
  console.log('    Within tolerance.');
  if (!STYLE_FLAGGING_ENABLED) {
    console.log('    Style flagging is still off — turning it on is a deliberate change');
    console.log('    to src/lib/authorship/index.ts, not something this run does.');
  }
}

console.log('\n  Scores, lowest first:');
for (const r of [...usable].sort((a, b) => a.score - b.score)) {
  const tag = r.assisted ? 'assisted' : r.secondLanguage ? 'human/ESL' : 'human';
  console.log(`    ${String(r.score).padStart(3)}  ${tag.padEnd(10)} ${r.label}`);
}

if (process.argv.includes('--refit')) {
  const fitted = refit(usable.map((r) => ({ features: r.features, assisted: r.assisted })));
  console.log(`\nRefitted on ${usable.length} samples — log loss ${fitted.logLoss.toFixed(4)}\n`);
  console.log('  intercept', fitted.intercept.toFixed(3));
  TERMS.forEach((t, i) => {
    console.log(`  ${t.key.padEnd(18)} ${fitted.weights[i].toFixed(3)}  (currently ${t.weight})`);
  });
  console.log('\nThese are fitted to a handful of hand-written examples. Do not paste');
  console.log('them into model.ts unless the fixture set has grown enough to mean');
  console.log('something — a model fitted to twelve samples has memorised twelve samples.');
}

console.log('');
