import { NextResponse } from 'next/server';
import { databaseConfigured, db } from '@/server/db';
import { describeDbError } from '@/server/db-errors';
import { authConfigured } from '@/server/session';

export const dynamic = 'force-dynamic';

/**
 * Whether this deployment is actually able to work.
 *
 * A digest on an error page tells the person looking at it nothing, and
 * reading Vercel's function logs is not a reasonable ask. This answers the
 * three questions that account for essentially every "it is broken after I
 * deployed it": is a database configured, can we reach it, and do the tables
 * exist.
 *
 * It reveals no connection strings, host names or credentials — only booleans,
 * a row count, and the same operator-facing sentence the sign-in form shows.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    databaseUrlSet: databaseConfigured,
    directUrlSet: Boolean(process.env.DIRECT_URL),
    authSecretSet: authConfigured(),
  };

  if (!databaseConfigured) {
    return NextResponse.json({
      ok: false,
      checks,
      problem: 'DATABASE_URL is not set on this deployment.',
      fix: 'Add DATABASE_URL and DIRECT_URL in your hosting provider, then redeploy.',
    }, { status: 503 });
  }

  try {
    // Reaches the server and the schema in one go: if the table is missing this
    // throws P2021, which is the failure we most want named.
    const started = Date.now();
    const users = await db.user.count();
    const dbLatencyMs = Date.now() - started;

    // Round-trip time is the single most useful number when the site "feels
    // slow": every page runs two or three queries, so 250ms here is most of a
    // second before any rendering. The usual cause is the database being in a
    // different region from the functions.
    const latency =
      dbLatencyMs < 60 ? 'good'
        : dbLatencyMs < 200 ? 'acceptable'
          : 'slow — is the database in the same region as your functions?';

    return NextResponse.json({
      ok: checks.authSecretSet === true,
      checks: {
        ...checks, databaseReachable: true, tablesPresent: true, users,
        dbLatencyMs, latency,
      },
      ...(checks.authSecretSet
        ? {}
        : {
          problem: 'AUTH_SECRET is missing or shorter than 32 characters.',
          fix: 'Set AUTH_SECRET to `openssl rand -base64 32`, then redeploy.',
        }),
    }, { status: checks.authSecretSet ? 200 : 503 });
  } catch (e) {
    const described = describeDbError(e);
    return NextResponse.json({
      ok: false,
      checks: { ...checks, databaseReachable: false },
      problem: described ?? 'The database query failed.',
      code: (e as { code?: string }).code ?? null,
    }, { status: 503 });
  }
}
