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
/**
 * Columns this build reads that an older database will not have.
 *
 * Checked against information_schema rather than by probing each table,
 * because a probe that throws leaves the connection in a failed state inside
 * a transaction and costs a round trip per table.
 */
const REQUIRED: readonly (readonly [string, string])[] = [
  ['Profile', 'category'],
  ['Proposal', 'revisions'],
  ['Milestone', 'funded'],
  ['Milestone', 'fundedAt'],
  ['Challenge', 'maxAttempts'],
  ['Challenge', 'timeLimitMins'],
  ['Challenge', 'scheduledAt'],
  ['ChallengeAnswer', 'attempt'],
  ['ChallengeAnswer', 'scorePct'],
];

async function missingColumns(): Promise<string[]> {
  const rows = await db.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  const have = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
  return REQUIRED
    .map(([table, column]) => `${table}.${column}`)
    .filter((key) => !have.has(key));
}

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

    // Tables existing is not the same as tables being *current*. A database
    // created from an older init.sql answers every query about the old columns
    // and throws on the new ones, which surfaced as "Something broke" on
    // whichever page happened to read one. Naming the missing columns turns
    // that into a two-minute fix.
    const missing = await missingColumns();
    if (missing.length > 0) {
      return NextResponse.json({
        ok: false,
        checks: {
          ...checks, databaseReachable: true, tablesPresent: true,
          schemaCurrent: false, missingColumns: missing, dbLatencyMs,
        },
        problem: `The database is missing ${missing.length} column(s) this `
          + 'version needs, so pages that read them fail.',
        fix: 'Run prisma/upgrade.sql in your database\'s SQL editor '
          + '(or `npx prisma db push`), then reload.',
      }, { status: 503 });
    }

    return NextResponse.json({
      ok: checks.authSecretSet === true,
      checks: {
        ...checks, databaseReachable: true, tablesPresent: true,
        schemaCurrent: true, users, dbLatencyMs, latency,
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
