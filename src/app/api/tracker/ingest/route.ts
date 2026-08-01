import { z } from 'zod';
import { db } from '@/server/db';
import { tokenHash } from '@/server/tracker-token';

/**
 * Where the desktop client posts what it recorded.
 *
 *   POST /api/tracker/ingest
 *   Authorization: Bearer flk_…
 *   { "startedAt": "…", "endedAt": "…", "seconds": 600, "jobId": "…",
 *     "samples": [{ "at": "…", "activityPct": 42 }] }
 *
 * Authenticated by a device token, not a session, because there is no browser
 * here. The token identifies a device; the device identifies the account; and
 * nothing else in the product will accept it.
 *
 * `screenshotUrl` is accepted but never required, and the client is the thing
 * that decides whether to send one — see the note in src/lib/apps.ts about why
 * the person being tracked, not the person paying, holds that switch.
 */
export const dynamic = 'force-dynamic';

const body = z.object({
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  seconds: z.number().int().min(0).max(86_400),
  jobId: z.string().max(40).optional(),
  note: z.string().max(500).optional(),
  samples: z.array(z.object({
    at: z.string().datetime(),
    activityPct: z.number().int().min(0).max(100),
    screenshotUrl: z.string().url().max(500).optional(),
  })).max(240).optional(),
});

function unauthorized(reason: string) {
  return Response.json({ ok: false, error: reason }, { status: 401 });
}

export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return unauthorized('Send the device token as a Bearer token.');

  let device;
  try {
    device = await db.trackerDevice.findUnique({
      where: { tokenHash: tokenHash(token) },
      select: { id: true, userId: true, revokedAt: true },
    });
  } catch {
    return Response.json(
      { ok: false, error: 'The tracker backend is not available.' },
      { status: 503 },
    );
  }
  // One message for "no such device" and "revoked device": telling the two
  // apart is a way to test tokens.
  if (!device || device.revokedAt) return unauthorized('That device is not paired.');

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Bad payload.' },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // A job id from a device is checked against the account's own contracts, so
  // a stolen token cannot log hours onto somebody else's job.
  let jobId: string | null = null;
  if (d.jobId) {
    const job = await db.job.findFirst({
      where: {
        id: d.jobId,
        OR: [
          { ownerId: device.userId },
          { proposals: { some: { freelancerId: device.userId, status: { in: ['ACCEPTED', 'COMPLETED'] } } } },
        ],
      },
      select: { id: true },
    });
    if (!job) {
      return Response.json(
        { ok: false, error: 'That job is not one of yours.' },
        { status: 403 },
      );
    }
    jobId = job.id;
  }

  const entry = await db.timeEntry.create({
    data: {
      userId: device.userId,
      deviceId: device.id,
      jobId,
      startedAt: new Date(d.startedAt),
      endedAt: d.endedAt ? new Date(d.endedAt) : null,
      seconds: d.seconds,
      note: d.note ?? null,
      ...(d.samples?.length
        ? {
          samples: {
            create: d.samples.map((s) => ({
              at: new Date(s.at),
              activityPct: s.activityPct,
              screenshotUrl: s.screenshotUrl ?? null,
            })),
          },
        }
        : {}),
    },
    select: { id: true },
  });

  await db.trackerDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  return Response.json({ ok: true, entryId: entry.id }, { status: 201 });
}
