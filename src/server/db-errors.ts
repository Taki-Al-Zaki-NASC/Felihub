import { Prisma } from '@prisma/client';

/**
 * Turns a database failure into a sentence that says what to do about it.
 *
 * The first Supabase deployment showed "Something broke" on every sign-in.
 * The cause was ordinary — the connection string was set but the tables had
 * never been created — and the fix was one command. But the error boundary
 * only had a digest to show, so a two-minute problem needed the server logs to
 * identify. These messages exist so the next one identifies itself.
 *
 * Every string here is safe to show a visitor: no connection strings, no host
 * names, no credentials. The worst it reveals is that the operator has some
 * configuration to finish, which the broken page already made obvious.
 */
export function describeDbError(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    // errorCode is set for the P1xxx family; the message covers the rest.
    switch (error.errorCode) {
      case 'P1000':
        return 'The database refused our credentials. Check the password in '
          + 'DATABASE_URL — if it contains @ : / or ?, it has to be URL-encoded.';
      case 'P1001':
        return 'The database could not be reached. Check DATABASE_URL, and that '
          + 'the database is awake and accepting connections.';
      case 'P1002':
        return 'The database took too long to answer. It may be waking from '
          + 'idle — try again in a moment.';
      case 'P1003':
        return 'That database does not exist. Check the database name at the '
          + 'end of DATABASE_URL.';
      default:
        return 'The database is not reachable with the current DATABASE_URL.';
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2021':
      case 'P2022':
        return 'The database is connected, but its tables have not been created '
          + 'yet. Run `npx prisma db push` against DIRECT_URL, then try again.';
      case 'P1017':
        return 'The database closed the connection. If this is a pooled '
          + 'Supabase or Neon URL, it needs ?pgbouncer=true&connection_limit=1.';
      case 'P2024':
        return 'The database connection pool is exhausted. A pooled URL needs '
          + '?pgbouncer=true&connection_limit=1 on serverless.';
      default:
        return null; // A real constraint violation — the caller knows better.
    }
  }

  // Transaction-mode poolers (Supabase's 6543 port, PgBouncer generally) reject
  // prepared statements, and Prisma only stops using them when the URL says so.
  // It surfaces as an unknown error with a recognisable message.
  const message = error instanceof Error ? error.message : '';
  if (/prepared statement/i.test(message)) {
    return 'The pooled database connection rejected a prepared statement. Add '
      + '?pgbouncer=true&connection_limit=1 to DATABASE_URL.';
  }
  if (/Can't reach database server|Connection refused|ETIMEDOUT|ENOTFOUND/i.test(message)) {
    return 'The database could not be reached. Check DATABASE_URL and that the '
      + 'database is awake.';
  }

  return null;
}

/** True when the failure is the database's, not the request's — used to decide
 *  whether to show the operator-facing message or let the error propagate. */
export function isDbError(error: unknown): boolean {
  return describeDbError(error) !== null;
}
