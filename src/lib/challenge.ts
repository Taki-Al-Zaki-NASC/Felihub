import { z } from 'zod';

/**
 * Skill challenges.
 *
 * The design constraint that shapes everything here is owner-blindness, in
 * both directions:
 *
 *   - the answer key never reaches the applicant's browser, so the quiz is
 *     graded on the server against data the client never receives;
 *   - the full submission never reaches the job owner, who sees a score and a
 *     short preview. Their work stays theirs, and a client cannot harvest
 *     twenty free solutions by posting a job.
 *
 * That is enforced by which table holds what — the key on Challenge, the work
 * on ChallengeAnswer, the summary on Proposal — so showing a client someone's
 * full answer would take a join no part of the product performs.
 */
export const CHALLENGE_MODES = ['QUIZ', 'WRITTEN', 'LIVE'] as const;
export type ChallengeMode = (typeof CHALLENGE_MODES)[number];

export const MAX_QUESTIONS = 10;
export const OPTIONS_PER_QUESTION = 4;

export const questionSchema = z.object({
  prompt: z.string().trim().min(8, 'Write the question out.').max(400),
  options: z.array(z.string().trim().min(1, 'Every option needs text.').max(200))
    .length(OPTIONS_PER_QUESTION),
  /** Index into `options`. Stored apart from the question, in `answerKey`. */
  correct: z.number().int().min(0).max(OPTIONS_PER_QUESTION - 1),
});

export type Question = z.infer<typeof questionSchema>;

export const quizSchema = z.array(questionSchema)
  .min(1, 'Add at least one question.')
  .max(MAX_QUESTIONS, `That is more than ${MAX_QUESTIONS} questions.`);

/** What the applicant is allowed to receive: the prompts and the options,
 *  never `correct`. Splitting it here means the stripping is one function
 *  rather than a thing to remember at every call site. */
export function publicQuestions(questions: Question[]) {
  return questions.map(({ prompt, options }) => ({ prompt, options }));
}

export function answerKey(questions: Question[]): number[] {
  return questions.map((q) => q.correct);
}

/** Reads the stored JSON defensively — the column will hold whatever an older
 *  version of this code wrote. */
export function parseQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const one = questionSchema.safeParse(item);
    return one.success ? [one.data] : [];
  });
}

export function parsePublicQuestions(raw: unknown): { prompt: string; options: string[] }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const q = item as Record<string, unknown>;
    if (typeof q.prompt !== 'string' || !Array.isArray(q.options)) return [];
    return [{ prompt: q.prompt, options: q.options.map(String) }];
  });
}

/** Percentage correct, rounded. Runs on the server only — the key is never
 *  sent anywhere it could be compared client-side. */
export function grade(picks: number[], key: number[]): number {
  if (key.length === 0) return 0;
  const right = key.reduce((n, correct, i) => n + (picks[i] === correct ? 1 : 0), 0);
  return Math.round((right / key.length) * 100);
}

/** What the job owner is shown of a written answer. Enough to judge whether
 *  it is worth a conversation, not enough to be the deliverable. */
export const PREVIEW_CHARS = 240;

export function preview(fullAnswer: string): string {
  const clean = fullAnswer.trim().replace(/\s+/g, ' ');
  return clean.length <= PREVIEW_CHARS
    ? clean
    : `${clean.slice(0, PREVIEW_CHARS)}…`;
}

export function modeLabel(mode: string): string {
  return mode === 'QUIZ' ? 'Multiple choice'
    : mode === 'WRITTEN' ? 'Written answer'
      : 'Live interview';
}
