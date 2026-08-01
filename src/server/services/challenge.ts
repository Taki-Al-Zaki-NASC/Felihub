import { db } from '@/server/db';
import { parseQuestions } from '@/lib/challenge';

/**
 * The challenge as an applicant may see it.
 *
 * A plain server function rather than a Server Action: an exported async
 * function in a `'use server'` file is a callable endpoint, and this one
 * reads a row whose sibling column is the answer key. Keeping it here means
 * there is no endpoint to call at all.
 *
 * `answerKey` is not selected. `questions` already holds the stripped form,
 * but it is parsed through the public shape anyway, so a hand-edited row
 * cannot smuggle a `correct` field into a page.
 */
export async function publicChallengeFor(jobId: string) {
  const challenge = await db.challenge.findUnique({
    where: { jobId },
    select: {
      id: true, mode: true, prompt: true, maxAttempts: true,
      timeLimitMins: true, scheduledAt: true, questions: true,
    },
  });
  if (!challenge) return null;
  return { ...challenge, questions: parseQuestions(challenge.questions) };
}
