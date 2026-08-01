import type { Stylometrics } from './types';

/**
 * The scoring model: logistic regression over eight standardised features.
 *
 *   z = intercept + Σ wᵢ · (xᵢ − centreᵢ) / scaleᵢ
 *   p = 1 / (1 + e^−z)
 *
 * Centres and scales come from the ranges these statistics actually take on
 * prose of this kind, so every input reaches the sum in roughly the same units
 * and one feature cannot dominate by being measured in bigger numbers.
 *
 * **Where the weights come from, honestly.** They are hand-set from the
 * published stylometry — burstiness and lexical spread are the best-attested
 * separators, marker vocabulary is real but shallow — and then checked against
 * the labelled fixtures in `tools/authorship/fixtures.json`. They are not
 * fitted on a large corpus, because there is no large labelled corpus of
 * freelance marketplace writing and inventing one would produce a model that
 * had learned the invention. `npm run authorship:eval` prints the confusion
 * matrix on the fixtures, and `refit` below will fit real coefficients the day
 * somebody has real labels.
 *
 * Treat the output as one weak signal. It is combined with provenance — which
 * is far stronger evidence and much harder to argue with — in `index.ts`.
 */

interface Term {
  key: keyof Stylometrics;
  weight: number;
  centre: number;
  scale: number;
  /** Shown to a reader when this term contributes strongly. */
  saysAssisted?: string;
  saysHuman?: string;
}

export const INTERCEPT = -0.55;

export const TERMS: Term[] = [
  {
    // The best-attested single separator. Model output holds a steady
    // sentence length; people write a long one, then a short one.
    key: 'burstiness',
    weight: -1.35,
    centre: 0.55,
    scale: 0.22,
    saysAssisted: 'Sentence lengths are unusually even',
    saysHuman: 'Sentence lengths vary the way speech does',
  },
  // `lexicalVariety` used to sit here with a weight of −0.75, on the reasoning
  // that model output is repetitive. Measured on the fixtures, it is not
  // monotonic and it points the wrong way where it matters:
  //
  //     assisted   7.19 – 7.63
  //     native     7.40 – 8.15
  //     second-language  6.66 – 7.02   ← lowest of the three
  //
  // So "narrow vocabulary" mostly identifies someone writing in a language
  // they learned second, and the negative weight was pushing exactly those
  // people towards the assisted end. A non-monotonic feature in a linear model
  // is worse than no feature: it cannot separate the classes and it can only
  // add bias. Removed rather than reweighted.
  {
    key: 'markerRate',
    weight: 0.95,
    centre: 6,
    scale: 6,
    saysAssisted: 'Uses phrasing that is common in generated text',
  },
  {
    key: 'contractionRate',
    weight: -0.7,
    centre: 8,
    scale: 8,
    saysHuman: 'Written in a conversational register',
  },
  {
    key: 'informalityRate',
    weight: -0.85,
    centre: 7,
    scale: 7,
    saysHuman: 'Contains asides and informal punctuation',
  },
  {
    key: 'openerVariety',
    weight: -0.5,
    centre: 0.72,
    scale: 0.18,
    saysAssisted: 'Sentences begin the same way repeatedly',
  },
  {
    key: 'paragraphVariety',
    weight: -0.45,
    centre: 0.42,
    scale: 0.25,
    saysAssisted: 'Paragraphs are near-identical in length',
  },
  {
    key: 'tripleRate',
    weight: 0.55,
    centre: 0.1,
    scale: 0.12,
    saysAssisted: 'Leans on three-item lists',
  },
];

const logistic = (z: number) => 1 / (1 + Math.exp(-z));

export interface Scored {
  /** 0–100. Higher means the writing looks more like generated text. */
  score: number;
  /** The two or three terms that moved it most, as readable sentences. */
  reasons: string[];
}

export function scoreStyle(s: Stylometrics): Scored {
  const contributions = TERMS.map((t) => {
    const standardised = (s[t.key] - t.centre) / t.scale;
    // Clamped: one extreme feature — a 400-word single paragraph, a bio full
    // of exclamation marks — should not be able to carry the whole verdict.
    const clamped = Math.max(-2.5, Math.min(2.5, standardised));
    return { term: t, value: t.weight * clamped };
  });

  const z = INTERCEPT + contributions.reduce((total, c) => total + c.value, 0);
  const score = Math.round(logistic(z) * 100);

  const reasons = [...contributions]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3)
    .map((c) => (c.value > 0 ? c.term.saysAssisted : c.term.saysHuman))
    .filter((r): r is string => Boolean(r));

  return { score, reasons };
}

/**
 * Refit the weights from labelled examples.
 *
 * Plain batch gradient descent on the log-loss — no dependency, and at this
 * feature count nothing more is warranted. `tools/authorship-eval.mjs --refit`
 * runs it and prints coefficients to paste back into `TERMS` above, so a
 * change to the model is a reviewable diff rather than a file of numbers
 * nobody can account for.
 *
 * It is exported and unused in the app on purpose: the day this repository has
 * a real labelled corpus, the honest thing is to fit the model to it rather
 * than keep defending hand-set numbers.
 */
export function refit(
  samples: { features: Stylometrics; assisted: boolean }[],
  { steps = 4000, rate = 0.05 } = {},
): { intercept: number; weights: number[]; logLoss: number } {
  const rows = samples.map((s) => ({
    x: TERMS.map((t) => Math.max(-2.5, Math.min(2.5, (s.features[t.key] - t.centre) / t.scale))),
    y: s.assisted ? 1 : 0,
  }));

  let intercept = 0;
  const weights = TERMS.map(() => 0);

  for (let step = 0; step < steps; step += 1) {
    let dIntercept = 0;
    const dWeights = weights.map(() => 0);
    for (const row of rows) {
      const p = logistic(intercept + row.x.reduce((t, v, i) => t + v * weights[i], 0));
      const error = p - row.y;
      dIntercept += error;
      for (let i = 0; i < weights.length; i += 1) dWeights[i] += error * row.x[i];
    }
    intercept -= (rate * dIntercept) / rows.length;
    for (let i = 0; i < weights.length; i += 1) {
      // A little L2, so a feature that happens to separate a small fixture set
      // perfectly does not come back with a coefficient of nine.
      weights[i] -= (rate * (dWeights[i] / rows.length + 0.01 * weights[i]));
    }
  }

  const logLoss = rows.reduce((total, row) => {
    const p = logistic(intercept + row.x.reduce((t, v, i) => t + v * weights[i], 0));
    const clamped = Math.min(1 - 1e-9, Math.max(1e-9, p));
    return total - (row.y * Math.log(clamped) + (1 - row.y) * Math.log(1 - clamped));
  }, 0) / rows.length;

  return { intercept, weights, logLoss };
}
