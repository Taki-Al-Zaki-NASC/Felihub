import { measure, wordCount } from './features';
import { scoreStyle } from './model';
import { EMPTY_PROVENANCE, type Authorship, type Band, type Provenance } from './types';

export { measure, wordCount } from './features';
export { scoreStyle, refit, TERMS, INTERCEPT } from './model';
export * from './types';

/**
 * Was this written here, or brought in from somewhere else?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE CHANGING ANYTHING BELOW.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * **What this cannot do.** There is no reliable way to tell, from text alone,
 * whether a model wrote it. OpenAI withdrew its own classifier in 2023 for
 * exactly this reason. Anyone selling a percentage is selling a number, not a
 * measurement.
 *
 * **Why that matters more here than almost anywhere.** Stylometric detectors
 * misfire hardest on people writing in a second language. Liang et al.
 * (Patterns, 2023) put TOEFL essays written by non-native English speakers
 * through seven GPT detectors: over half were called machine-generated, while
 * essays by native-speaking US students were almost never flagged. The
 * mechanism is not subtle — the detectors key on limited vocabulary and even
 * sentence rhythm, which is what careful second-language writing looks like.
 *
 * A large share of this marketplace writes English as a second language. A
 * detector deployed naively here would take the people it exists to serve and
 * quietly mark them as cheats, and they would never find out why they stopped
 * getting hired. That is not a bug to fix later. It is the thing to design
 * against first.
 *
 * **So the design is:**
 *
 * 1. **Provenance leads.** "This arrived in one paste" is an observation about
 *    an event. "This reads like a model" is an inference about a style. The
 *    first is evidence; the second is a hint. They are not weighted equally
 *    and they are never merged into a single number.
 *
 * 2. **Style alone never flags.** A text that was typed out in this form is
 *    reported as typed no matter how it reads. Somebody who writes evenly is
 *    not doing anything wrong.
 *
 * 3. **`PASTED` is not an accusation.** Most people draft in a notes app. It
 *    says what happened, and it is shown in neutral type, not in red.
 *
 * 4. **Nothing is blocked, ranked or rejected.** No band affects matching,
 *    ordering, verification, eligibility to bid, or anything else. It is a
 *    line of context next to the text, and a client is free to ignore it.
 *
 * 5. **The author sees exactly what the reader sees.** There is no hidden
 *    score. If we are going to put a note next to somebody's writing, they get
 *    to read it, disagree with it, and rewrite.
 *
 * 6. **Absent telemetry means UNKNOWN, never guilt.** Old rows, a browser with
 *    JavaScript off, an API client: all report nothing, and nothing is what
 *    gets shown.
 */

/**
 * Two floors, because the two halves need different amounts of text.
 *
 * Stylometrics are distribution summaries, and a distribution over three
 * sentences summarises nothing — `measure` returns null under 40 words for
 * that reason. Provenance is not a distribution. "Typed into this form" is
 * exactly as true of a 25-word bio as of a 400-word one, and gating both
 * behind the stylometric floor meant a short profile got no note at all
 * despite the browser having watched every character of it being typed.
 *
 * Under 20 words there is not enough writing for how it arrived to be worth
 * remarking on, so the answer is silence rather than a note.
 */
const MIN_PROVENANCE_WORDS = 20;

/**
 * Whether the style model is allowed to raise anything. It is not.
 *
 * ── The measurement that decided this ─────────────────────────────────────
 *
 * `npm run authorship:eval` scores hand-labelled samples. At a threshold of
 * 78, on the fixture set:
 *
 *     assisted text caught                 4 of 5
 *     human second-language text flagged   4 of 4
 *
 * All four second-language samples scored 95–97 — higher than a genuine
 * machine-written sample at 70. That is not a tuning problem. Looking at the
 * features one at a time, nothing separates careful second-language writing
 * from model output:
 *
 *     contractions   native 31–98,  assisted 0,     second-language 0
 *     informality    native 0–21,   assisted 0,     second-language 0
 *     burstiness     native .28–.91, assisted .18–.44, second-language .08–.30
 *
 * The two features that separate anything separate *native speakers* from
 * everybody else. A linear model over them is a native-versus-non-native
 * detector with an AI-detector label on it, which is precisely the result
 * Liang et al. reported in 2023 and precisely the harm this file opens by
 * warning about.
 *
 * So the style model is computed, stored and shown to nobody. What ships is
 * the provenance half, which measures an event instead of inferring a
 * character, and applies the same whoever is typing.
 *
 * ── What would have to be true to turn this on ────────────────────────────
 *
 * `authorship:eval` fails the build if more than 10% of human second-language
 * samples are flagged. Getting under that bar needs a feature that separates
 * the two classes rather than a lower threshold — and a fixture set an order
 * of magnitude larger, with samples from real users rather than written for
 * the purpose. Until then this constant stays false, and the eval is the gate.
 */
export const STYLE_FLAGGING_ENABLED = false;

/** The score a pasted text would have to clear, if the above were ever true. */
const REVIEW_THRESHOLD = 78;

/** A paste this large is the text arriving whole rather than being quoted. */
const WHOLESALE_PASTE = 0.65;

export function analyse(text: string, provenance: Provenance | null): Authorship {
  // Null under 40 words. That is a statement about the statistics, not about
  // the text — see the note on the floors above.
  const stylometrics = measure(text);
  const style = stylometrics ? scoreStyle(stylometrics) : { score: 0, reasons: [] };

  if (wordCount(text) < MIN_PROVENANCE_WORDS) {
    return {
      band: 'UNKNOWN',
      score: style.score,
      reasons: ['Too short for how it arrived to be worth remarking on.'],
      stylometrics,
    };
  }

  // No telemetry: an older row, or a browser that never ran the capture. The
  // honest answer is that we do not know how this arrived.
  if (!provenance || (provenance.typed === 0 && provenance.pasted === 0)) {
    return {
      band: 'UNKNOWN',
      score: style.score,
      reasons: ['Written before this was recorded, or with scripting turned off.'],
      stylometrics,
    };
  }

  const total = provenance.typed + provenance.pasted;
  const pastedShare = total > 0 ? provenance.pasted / total : 0;
  const largestShare = total > 0 ? provenance.largestPaste / total : 0;

  const reasons: string[] = [];
  let band: Band;

  if (pastedShare < 0.15) {
    band = 'TYPED';
    reasons.push('Typed into this form.');
    if (provenance.corrections > 5) {
      reasons.push(`Edited while writing — ${provenance.corrections} corrections.`);
    }
  } else {
    band = 'PASTED';
    reasons.push(
      largestShare >= WHOLESALE_PASTE
        ? 'Arrived as a single paste.'
        : `About ${Math.round(pastedShare * 100)}% was pasted in.`,
    );
    if (provenance.typed > 0) {
      reasons.push('Edited by hand afterwards.');
    }

    // Disabled, and the constant above explains at length why. Even paired
    // with a paste, the style model flags human second-language writing more
    // often than it flags machine writing, so this branch would fire hardest
    // on the people this marketplace exists to serve.
    if (STYLE_FLAGGING_ENABLED && style.score >= REVIEW_THRESHOLD) {
      band = 'REVIEW';
      reasons.push(...style.reasons);
    }
  }

  return { band, score: style.score, reasons, stylometrics };
}

/** Parses telemetry off a submitted form. Anything malformed is treated as
 *  absent, because a broken number must never read as a confession. */
export function provenanceFrom(raw: FormDataEntryValue | null): Provenance | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 400) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof Provenance, unknown>>;
    const num = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0;
    const provenance: Provenance = {
      typed: num(parsed.typed),
      pasted: num(parsed.pasted),
      largestPaste: num(parsed.largestPaste),
      pastes: num(parsed.pastes),
      corrections: num(parsed.corrections),
      activeMs: num(parsed.activeMs),
    };
    const seen = provenance.typed + provenance.pasted;
    return seen === 0 ? null : provenance;
  } catch {
    return null;
  }
}

/**
 * How a band should read on screen.
 *
 * The wording is part of the feature, not decoration. "Pasted from elsewhere"
 * describes an event; "AI-generated" would assert something this cannot know.
 */
export function describe(band: Band): { label: string; tone: 'neutral' | 'teal' | 'amber' } {
  switch (band) {
    case 'TYPED':
      return { label: 'Typed here', tone: 'teal' };
    case 'PASTED':
      return { label: 'Pasted from elsewhere', tone: 'neutral' };
    case 'REVIEW':
      return { label: 'Pasted · worth reading closely', tone: 'amber' };
    default:
      return { label: 'Not recorded', tone: 'neutral' };
  }
}

export { EMPTY_PROVENANCE };
