import type { Stylometrics } from './types';

/**
 * Measuring a piece of writing.
 *
 * Nothing here decides anything — these are descriptive statistics, and each
 * one is a number a person could check by hand. The scoring lives next door in
 * `model.ts` so the measurements can be evaluated, and argued with, separately
 * from what is done with them.
 */

/**
 * Phrases that appear far more often in model output than in how people write
 * about their own work.
 *
 * A caution that governs the whole file: several of these are also the register
 * taught in formal English classes worldwide. "Moreover", "furthermore" and
 * "in conclusion" are what a good student is told to write. That makes this
 * list, on its own, a measure of schooling as much as of authorship — which is
 * why `model.ts` refuses to raise a flag from stylometrics alone.
 */
const MARKERS = [
  'delve', 'delving', 'tapestry', 'multifaceted', 'meticulous', 'meticulously',
  'ever-evolving', 'ever-changing', 'in today\'s', 'fast-paced', 'landscape of',
  'realm of', 'navigate the', 'navigating the complexities', 'underscore',
  'underscores', 'testament to', 'harness the power', 'unlock the',
  'it is important to note', 'it\'s important to note', 'it is worth noting',
  'plays a crucial role', 'plays a vital role', 'pivotal', 'showcase',
  'showcasing', 'seamless', 'seamlessly', 'robust solution', 'cutting-edge',
  'state-of-the-art', 'leverage the', 'leveraging', 'furthermore', 'moreover',
  'in conclusion', 'to summarize', 'to summarise', 'additionally,',
  'comprehensive understanding', 'wide range of', 'a myriad of',
  'not only', 'but also', 'embark on', 'foster', 'fostering', 'elevate',
  'transformative', 'holistic', 'synergy', 'paradigm',
];

/** Contractions. Formal model prose under-uses them; people rarely avoid them
 *  for long when writing about themselves. */
const CONTRACTIONS =
  /\b(?:i'm|i've|i'd|i'll|it's|that's|there's|here's|what's|let's|don't|doesn't|didn't|won't|can't|couldn't|shouldn't|wouldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|we're|we've|we'd|we'll|you're|you've|you'd|you'll|they're|they've|they'd|they'll|he's|she's|ain't)\b/gi;

/**
 * Traces of a person typing rather than a model generating: an aside in
 * brackets, an ellipsis, an exclamation, a sentence that starts lowercase, a
 * doubled space, a stray "&" or "etc". None is a mistake worth fixing; all of
 * them are the texture of ordinary writing.
 */
const INFORMAL = [
  /\.\.\./g, /!/g, /\s&\s/g, /\betc\b/gi, /\(\s*[a-z]/g, /\s{2,}/g,
  /\b(?:yeah|ok|okay|anyway|honestly|basically|kind of|sort of|a bit|pretty much|stuff|thing is)\b/gi,
];

const words = (text: string) => text.toLowerCase().match(/[a-z']+/g) ?? [];

/** How many words, for callers that need the length without the statistics. */
export const wordCount = (text: string) => words(text).length;

/** Splits on sentence-ending punctuation. Deliberately simple: an abbreviation
 *  split the wrong way moves a length statistic by one word, which is noise
 *  next to the differences being measured. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Coefficient of variation: standard deviation over mean. Scale-free, so a
 *  long text and a short one are comparable. */
function variation(lengths: number[]): number {
  if (lengths.length < 2) return 0;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean === 0) return 0;
  const spread = Math.sqrt(
    lengths.reduce((t, n) => t + (n - mean) ** 2, 0) / lengths.length,
  );
  return spread / mean;
}

function countAll(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, p) => total + (text.match(p)?.length ?? 0), 0);
}

/**
 * A text, measured.
 *
 * Returns null under 40 words. Every statistic here is a distribution summary,
 * and a distribution over three sentences is not a summary of anything — a
 * short bio would score wildly on burstiness alone. Saying "too short to
 * measure" is the honest output, and the caller shows nothing.
 */
export function measure(text: string): Stylometrics | null {
  const clean = text.trim();
  const wordList = words(clean);
  if (wordList.length < 40) return null;

  const sentenceList = sentences(clean);
  const sentenceLengths = sentenceList.map((s) => words(s).length);
  const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const per1000 = (n: number) => (n / wordList.length) * 1000;

  const lower = clean.toLowerCase();
  const markerHits = MARKERS.reduce((total, phrase) => {
    let from = 0;
    let hits = 0;
    for (;;) {
      const at = lower.indexOf(phrase, from);
      if (at === -1) break;
      hits += 1;
      from = at + phrase.length;
    }
    return total + hits;
  }, 0);

  const openers = new Set(sentenceList.map((s) => words(s)[0] ?? ''));

  // Root type-token ratio (Guiraud's index, scaled): plain TTR falls as a text
  // gets longer, so a long human text would look less varied than a short
  // model one purely because of length.
  const distinct = new Set(wordList).size;
  const lexicalVariety = distinct / Math.sqrt(wordList.length);

  const triples = sentenceList.filter(
    (s) => /\b\w+,\s+\w+,?\s+and\s+\w+/.test(s),
  ).length;

  return {
    words: wordList.length,
    sentences: sentenceList.length,
    burstiness: variation(sentenceLengths),
    lexicalVariety,
    markerRate: per1000(markerHits),
    emDashRate: per1000((clean.match(/—/g) ?? []).length),
    contractionRate: per1000((clean.match(CONTRACTIONS) ?? []).length),
    openerVariety: sentenceList.length ? openers.size / sentenceList.length : 0,
    paragraphVariety: variation(paragraphs.map((p) => words(p).length)),
    informalityRate: per1000(countAll(clean, INFORMAL)),
    tripleRate: sentenceList.length ? triples / sentenceList.length : 0,
  };
}
