/**
 * Authorship signals — how a piece of writing got here, and what it looks like.
 *
 * Read `src/lib/authorship/index.ts` before changing any of this. The short
 * version: this system reports evidence, it never renders a verdict, and it is
 * deliberately incapable of blocking anybody.
 */

/** What the browser observed while the text was being written. */
export interface Provenance {
  /** Characters inserted by keystroke. */
  typed: number;
  /** Characters that arrived through a paste. */
  pasted: number;
  /** The largest single paste, in characters. */
  largestPaste: number;
  /** How many separate paste events. */
  pastes: number;
  /** Backspace and delete presses — evidence of drafting. */
  corrections: number;
  /** Milliseconds between the first and last edit. */
  activeMs: number;
}

export const EMPTY_PROVENANCE: Provenance = {
  typed: 0, pasted: 0, largestPaste: 0, pastes: 0, corrections: 0, activeMs: 0,
};

/** Measurements of the text itself. Every rate is per 1,000 words. */
export interface Stylometrics {
  words: number;
  sentences: number;
  /** Coefficient of variation of sentence length. Human prose varies more. */
  burstiness: number;
  /** Root type-token ratio — vocabulary spread, corrected for length. */
  lexicalVariety: number;
  /** Phrases that turn up far more often in model output than in speech. */
  markerRate: number;
  emDashRate: number;
  contractionRate: number;
  /** Distinct first words across sentences, over sentence count. */
  openerVariety: number;
  /** Coefficient of variation of paragraph length. */
  paragraphVariety: number;
  /** Informality and imperfection — both are strong evidence of a person. */
  informalityRate: number;
  /** Share of sentences built as a three-item list. */
  tripleRate: number;
}

/**
 * What a reader is told.
 *
 * Three bands and no percentage, because a number invites people to treat a
 * weak signal as a measurement. `PASTED` is a statement of fact about how the
 * text arrived, not an allegation — most people draft somewhere else.
 */
export type Band = 'TYPED' | 'PASTED' | 'REVIEW' | 'UNKNOWN';

export interface Authorship {
  band: Band;
  /** 0–100. Stored for calibration, shown to nobody on its own. */
  score: number;
  /** Plain sentences, in the order they should be read. Always populated. */
  reasons: string[];
  stylometrics: Stylometrics | null;
}
