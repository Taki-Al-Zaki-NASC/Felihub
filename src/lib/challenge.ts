import {
  collection, doc, getDoc, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';
// Explicit .ts extension: the test runner (node --experimental-strip-types)
// resolves imports literally and cannot infer what the bundler adds for free.
import { firebase } from './firebase.ts';

/**
 * Skill challenges.
 *
 * The privacy model is the whole design, and it is split across three places
 * on purpose:
 *
 *   jobs/{jobId}.challenge          — questions and options. World-readable,
 *                                     because the applicant has to see them.
 *   jobs/{jobId}/challengeKey/key   — the correct answers. Owner-only, by
 *                                     rule, before and after anyone applies.
 *   proposals/{id}.challenge        — the summary the owner sees: which
 *                                     options were picked, a short preview,
 *                                     and (once graded) a score.
 *   proposals/{id}/submission/full  — the full written answer. Readable only
 *                                     by its author. The owner is never in
 *                                     that rule's allow-list, at any status.
 *
 * Grading happens on the owner's device because there is no server: they hold
 * the key, the proposal carries the picks, and the score is written back. A
 * quiz answer index is not the "code or design" the owner is walled off from,
 * so passing those across is deliberate — a written answer never crosses.
 */
export type ChallengeMode = 'quiz' | 'writtenPrompt';

export interface QuizQuestion {
  prompt: string;
  options: string[];
}

export interface JobChallenge {
  mode: ChallengeMode;
  /** Quiz only. Options are public; the correct index is not stored here. */
  questions?: QuizQuestion[];
  /** Written prompt only. */
  prompt?: string;
  timeLimitMinutes?: number;
}

export interface ChallengeResult {
  attempted?: boolean;
  completed?: boolean;
  mode?: ChallengeMode;
  answerPreview?: string;
  hasFullSubmission?: boolean;
  quizAnswers?: number[];
  score?: number | null;
  elapsedSeconds?: number;
}

/** Owner: attach a quiz, splitting the key away from the questions. */
export async function saveQuiz(
  jobId: string,
  questions: QuizQuestion[],
  correctIndexes: number[],
  timeLimitMinutes?: number,
) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');

  await updateDoc(doc(fb.db, 'jobs', jobId), {
    challenge: {
      mode: 'quiz',
      questions,
      ...(timeLimitMinutes ? { timeLimitMinutes } : {}),
    },
    updatedAt: serverTimestamp(),
  });

  // Separate document, separate rule. This is what an applicant can never
  // read — not before taking the quiz and not after.
  await setDoc(doc(collection(fb.db, 'jobs', jobId, 'challengeKey'), 'key'), {
    correct: correctIndexes,
    updatedAt: serverTimestamp(),
  });
}

export async function saveWrittenPrompt(jobId: string, prompt: string) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  await updateDoc(doc(fb.db, 'jobs', jobId), {
    challenge: { mode: 'writtenPrompt', prompt: prompt.trim() },
    updatedAt: serverTimestamp(),
  });
}

/** Owner: the answer key. Refused for anyone else, by rule. */
export async function loadAnswerKey(jobId: string): Promise<number[] | null> {
  const fb = firebase();
  if (!fb) return null;
  try {
    const snap = await getDoc(doc(fb.db, 'jobs', jobId, 'challengeKey', 'key'));
    if (!snap.exists()) return null;
    return (snap.data().correct as number[]) ?? null;
  } catch {
    return null;   // not the owner, or no key set
  }
}

/**
 * Freelancer: submit quiz picks.
 *
 * Only the chosen indexes travel to the proposal. No score is written here —
 * the applicant does not hold the key and must not be able to claim a mark.
 */
export async function submitQuizAnswers(
  proposalId: string, answers: number[], elapsedSeconds: number,
) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  await updateDoc(doc(fb.db, 'proposals', proposalId), {
    challenge: {
      attempted: true,
      completed: true,
      mode: 'quiz',
      quizAnswers: answers,
      elapsedSeconds,
      score: null,           // the owner grades; see gradeQuiz
      hasFullSubmission: false,
      answerPreview: '',
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Freelancer: submit a written answer.
 *
 * The full text goes to the private subcollection; only a short excerpt is
 * attached to the proposal. The owner learns that work exists and roughly what
 * it looks like, and reads the whole of it never.
 */
export async function submitWrittenAnswer(proposalId: string, answer: string) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const text = answer.trim();

  await setDoc(doc(fb.db, 'proposals', proposalId, 'submission', 'full'), {
    answer: text,
    submittedAt: serverTimestamp(),
  });

  await updateDoc(doc(fb.db, 'proposals', proposalId), {
    challenge: {
      attempted: true,
      completed: true,
      mode: 'writtenPrompt',
      answerPreview: text.length > 160 ? `${text.slice(0, 159)}…` : text,
      hasFullSubmission: true,
      score: null,
    },
    updatedAt: serverTimestamp(),
  });
}

/** Percentage of correct picks, 0–100. Unanswered counts as wrong. */
export function scoreQuiz(answers: number[], correct: number[]): number {
  if (correct.length === 0) return 0;
  let right = 0;
  for (let i = 0; i < correct.length; i++) {
    if (answers[i] === correct[i]) right++;
  }
  return Math.round((right / correct.length) * 100);
}

/** Owner: grade and write the score back onto the proposal. */
export async function gradeQuiz(
  proposalId: string, existing: ChallengeResult, score: number,
) {
  const fb = firebase();
  if (!fb) throw new Error('Firebase is not configured.');
  await updateDoc(doc(fb.db, 'proposals', proposalId), {
    // `challenge` is one of the fields the owner is allowed to change on
    // someone else's proposal, so the whole map is rewritten with the score
    // added rather than merged field by field.
    challenge: { ...existing, score },
    updatedAt: serverTimestamp(),
  });
}
