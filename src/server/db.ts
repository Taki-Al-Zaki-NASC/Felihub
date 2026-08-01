import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client per process, constructed lazily.
 *
 * Next.js hot-reload re-evaluates modules, and a fresh PrismaClient each time
 * exhausts Postgres connections within a few edits. In production on Vercel
 * the module is evaluated once per warm instance, which is what we want — the
 * pooled DATABASE_URL is what keeps concurrent invocations inside the
 * connection limit.
 *
 * Construction is deferred behind a Proxy so that *importing* this module is
 * always safe. Next prerenders pages at build time and a top-level
 * `new PrismaClient()` would fail the whole build on a machine that has no
 * DATABASE_URL — including Vercel's builder before the variable is set. The
 * client is created on first query instead, so only the code paths that
 * genuinely need the database care whether it is configured.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.PRISMA_LOG_QUERIES === '1'
      ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
      : process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  // PRISMA_LOG_QUERIES=1 prints one line per query with its duration. It is
  // how "the site is slow" becomes a number: how many queries a page runs, and
  // which of them is the one costing the time.
  if (process.env.PRISMA_LOG_QUERIES === '1') {
    (client as unknown as {
      $on: (e: 'query', cb: (v: { query: string; duration: number }) => void) => void;
    }).$on('query', (e) => {
      console.log(`[q] ${e.duration}ms ${e.query.slice(0, 110).replace(/\s+/g, ' ')}`);
    });
  }
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = globalForPrisma.prisma ?? create();
    if (process.env.NODE_ENV === 'production') globalForPrisma.prisma = client;
    return Reflect.get(client, prop, receiver);
  },
});

/** Whether a database is configured at all. Used to give a straight answer
 *  ("no database connected") rather than a driver stack trace. */
export const databaseConfigured = Boolean(process.env.DATABASE_URL);
