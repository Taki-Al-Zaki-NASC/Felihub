/**
 * How well a job suits a freelancer, 0–100.
 *
 * The job board defaults to showing only strong matches, so this number
 * decides what a freelancer ever sees. It is deliberately explainable — every
 * component is something they control on their profile, and the board shows
 * the reasons — because an opaque score that hides work is worse than no
 * filter at all.
 *
 *   category   40  same category as their profile
 *   skills     55  proportion of the job's skills they list
 *   text     + 10  bonus: their bio or headline mentions the job's skills
 *
 * Category and skills alone reach exactly 95, which is the default floor. That
 * is deliberate: someone in the right category who lists every skill asked for
 * is a 95% match by definition, and the free-text signal is a *bonus* on top —
 * capped at 100 — for catching a skill they describe but never tagged.
 *
 * The first version weighted text at 15 inside the 100, which meant a perfect
 * category-and-skills match scored 93 and the 95% floor hid every job on the
 * board. Worth remembering: a threshold you cannot reach is not a filter, it
 * is an outage.
 */
export interface MatchInput {
  category: string | null | undefined;
  skills: readonly string[];
  bio: string | null | undefined;
  headline: string | null | undefined;
}

export interface JobForMatch {
  category: string;
  skills: readonly string[];
  title: string;
  description: string;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  /** The job's skills this freelancer lists, for showing what matched. */
  shared: string[];
}

const normalise = (s: string) => s.trim().toLowerCase();

export function matchScore(profile: MatchInput, job: JobForMatch): MatchResult {
  const reasons: string[] = [];

  const mine = new Set(profile.skills.map(normalise));
  const wanted = job.skills.map(normalise);
  const shared = job.skills.filter((s) => mine.has(normalise(s)));

  // Category, 40.
  const sameCategory = Boolean(profile.category)
    && normalise(profile.category!) === normalise(job.category);
  const categoryPoints = sameCategory ? 40 : 0;
  if (sameCategory) reasons.push(`In your category, ${job.category}`);

  // Skills, 45. A job with no skills listed cannot discriminate, so it scores
  // neutral rather than zero — otherwise a sparse posting is invisible to
  // everyone, which punishes the client's freelancers rather than the client.
  const skillPoints = wanted.length === 0
    ? 40
    : Math.round((shared.length / wanted.length) * 55);
  if (shared.length > 0) {
    reasons.push(
      shared.length === wanted.length
        ? `You list every skill asked for`
        : `${shared.length} of ${wanted.length} skills: ${shared.slice(0, 4).join(', ')}`,
    );
  }

  // Free text, 15. Catches the skill someone describes but never tagged.
  const text = normalise(`${profile.headline ?? ''} ${profile.bio ?? ''}`);
  const mentioned = wanted.filter((s) => s.length >= 3 && text.includes(s));
  const textPoints = wanted.length === 0
    ? 5
    : Math.min(10, Math.round((mentioned.length / wanted.length) * 10));
  if (mentioned.length > 0 && shared.length < wanted.length) {
    reasons.push('Your profile mentions what they are asking for');
  }

  const score = Math.min(100, categoryPoints + skillPoints + textPoints);
  if (reasons.length === 0) reasons.push('Outside your category and skills');

  return { score, reasons, shared };
}

/** The default floor. Strict on purpose — the point of the board is that a
 *  freelancer stops reading jobs they were never going to win. */
export const DEFAULT_MATCH_FLOOR = 95;

/** What a freelancer can widen it to, when the strict view is too quiet. */
export const MATCH_FLOORS = [95, 75, 50, 0] as const;

export function floorLabel(floor: number): string {
  return floor === 0 ? 'Everything' : `${floor}% and above`;
}
