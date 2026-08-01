'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth';
import {
  CHALLENGE_MODES, answerKey, grade, preview, publicQuestions, quizSchema,
} from '@/lib/challenge';
import type { FormResult } from '@/server/actions/profile';

const createSchema = z.object({
  mode: z.enum(CHALLENGE_MODES),
  prompt: z.string().trim().max(4000).optional(),
  maxAttempts: z.number().int().min(1).max(2),
  timeLimitMins: z.number().int().min(5).max(240).nullable(),
  scheduledAt: z.coerce.date().nullable(),
});

/**
 * The client attaches a challenge to their own job.
 *
 * The answer key is split out of the questions here and stored in its own
 * column. What goes into `questions` is only what an applicant may see, so a
 * bug in a page cannot leak the key — there is nothing to leak in the field
 * the page reads.
 */
export async function createChallengeAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const jobId = String(form.get('jobId') ?? '');

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { id: true, ownerId: true, status: true },
  });
  if (!job) return { error: 'That job no longer exists.' };
  if (job.ownerId !== user.id) {
    return { error: 'Only the client who posted the job can set its challenge.' };
  }
  if (job.status !== 'OPEN') {
    return { error: 'This job is filled — a challenge would have nobody to take it.' };
  }

  const rawScheduled = String(form.get('scheduledAt') ?? '').trim();
  const rawLimit = String(form.get('timeLimitMins') ?? '').trim();

  const parsed = createSchema.safeParse({
    mode: form.get('mode'),
    prompt: String(form.get('prompt') ?? '').trim() || undefined,
    maxAttempts: Number(form.get('maxAttempts') ?? 2),
    timeLimitMins: rawLimit ? Number(rawLimit) : null,
    scheduledAt: rawScheduled ? rawScheduled : null,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? 'form')] ??= issue.message;
    }
    return { fieldErrors };
  }
  const d = parsed.data;

  let questions: unknown = [];
  let key: number[] = [];

  if (d.mode === 'QUIZ') {
    let raw: unknown;
    try {
      raw = JSON.parse(String(form.get('questions') ?? '[]'));
    } catch {
      return { error: 'The questions could not be read. Reload and try again.' };
    }
    const quiz = quizSchema.safeParse(raw);
    if (!quiz.success) {
      return { fieldErrors: { questions: quiz.error.issues[0].message } };
    }
    questions = publicQuestions(quiz.data);
    key = answerKey(quiz.data);
  } else if (!d.prompt) {
    return { fieldErrors: { prompt: 'Write the brief the freelancer will answer.' } };
  }

  if (d.mode === 'LIVE' && !d.scheduledAt) {
    return { fieldErrors: { scheduledAt: 'Pick a time for the interview.' } };
  }

  await db.challenge.upsert({
    where: { jobId },
    create: {
      jobId,
      mode: d.mode,
      prompt: d.prompt ?? null,
      questions: questions as never,
      answerKey: key as never,
      maxAttempts: d.maxAttempts,
      timeLimitMins: d.timeLimitMins,
      scheduledAt: d.scheduledAt,
    },
    update: {
      mode: d.mode,
      prompt: d.prompt ?? null,
      questions: questions as never,
      answerKey: key as never,
      maxAttempts: d.maxAttempts,
      timeLimitMins: d.timeLimitMins,
      scheduledAt: d.scheduledAt,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/**
 * A freelancer's attempt.
 *
 * Attempts are separate rows, so a second one cannot quietly erase the first —
 * and the limit is checked by counting them, not by trusting a field the
 * browser sent. Grading happens here, against a key that never left the
 * server; the job owner receives the score and a preview and nothing else.
 */
export async function submitChallengeAction(
  _prev: FormResult | null,
  form: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const jobId = String(form.get('jobId') ?? '');

  const challenge = await db.challenge.findUnique({
    where: { jobId },
    select: {
      id: true, mode: true, maxAttempts: true, questions: true, answerKey: true,
      job: { select: { id: true, title: true, ownerId: true, status: true } },
    },
  });
  if (!challenge) return { error: 'This job has no challenge.' };
  if (challenge.job.status !== 'OPEN') {
    return { error: 'This job is no longer taking submissions.' };
  }
  if (challenge.mode === 'LIVE') {
    return { error: 'A live interview is held in the call, not submitted here.' };
  }

  // The bid is what ties an attempt to a person. No bid, no challenge.
  const proposal = await db.proposal.findUnique({
    where: { jobId_freelancerId: { jobId, freelancerId: user.id } },
    select: { id: true },
  });
  if (!proposal) {
    return { error: 'Submit your bid first — the challenge belongs to it.' };
  }

  const used = await db.challengeAnswer.count({
    where: { proposalId: proposal.id },
  });
  if (used >= challenge.maxAttempts) {
    return {
      error: `You have used all ${challenge.maxAttempts} attempts. `
        + 'The best score is what the client sees.',
    };
  }

  let scorePct: number | null = null;
  let fullAnswer: string | null = null;
  let picks: number[] = [];

  if (challenge.mode === 'QUIZ') {
    try {
      const raw = JSON.parse(String(form.get('picks') ?? '[]'));
      picks = Array.isArray(raw) ? raw.map((n) => Number(n)) : [];
    } catch {
      return { error: 'Your answers could not be read. Try again.' };
    }
    const key = Array.isArray(challenge.answerKey)
      ? (challenge.answerKey as number[])
      : [];
    const questionCount = Array.isArray(challenge.questions)
      ? challenge.questions.length
      : 0;
    if (picks.filter((n) => Number.isInteger(n) && n >= 0).length < questionCount) {
      return { error: 'Answer every question before submitting.' };
    }
    scorePct = grade(picks, key);
  } else {
    fullAnswer = String(form.get('fullAnswer') ?? '').trim();
    if (fullAnswer.length < 80) {
      return { fieldErrors: { fullAnswer: 'Write a real answer — at least a paragraph.' } };
    }
    if (fullAnswer.length > 20000) {
      return { fieldErrors: { fullAnswer: 'That is longer than the limit.' } };
    }
  }

  // The client sees the best attempt, not the latest — a worse second try
  // should not punish someone for checking their work.
  const previous = await db.challengeAnswer.findMany({
    where: { proposalId: proposal.id },
    select: { scorePct: true },
  });
  const best = Math.max(
    scorePct ?? 0,
    ...previous.map((a) => a.scorePct ?? 0),
  );

  await db.$transaction(async (tx) => {
    await tx.challengeAnswer.create({
      data: {
        challengeId: challenge.id,
        proposalId: proposal.id,
        attempt: used + 1,
        scorePct,
        fullAnswer,
        picks,
      },
    });
    await tx.proposal.update({
      where: { id: proposal.id },
      data: {
        // Only ever the score and a short preview. The full answer stays in
        // ChallengeAnswer, which no client-facing query reads.
        score: challenge.mode === 'QUIZ' ? best : null,
        answerPreview: fullAnswer ? preview(fullAnswer) : null,
      },
    });
    await tx.notification.create({
      data: {
        userId: challenge.job.ownerId,
        kind: 'CHALLENGE',
        title: 'A challenge was submitted',
        body: `${user.displayName} submitted the challenge for “${challenge.job.title}”.`,
        href: `/jobs/${jobId}`,
      },
    });
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/challenge`);
  return { ok: true };
}
