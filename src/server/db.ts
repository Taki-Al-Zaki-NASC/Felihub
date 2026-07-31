import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client per process.
 *
 * Next.js hot-reload re-evaluates modules, and a fresh PrismaClient each time
 * exhausts Postgres connections within a few edits. In production on Vercel
 * the module is evaluated once per warm instance, which is what we want — the
 * pooled DATABASE_URL is what keeps concurrent invocations inside the
 * connection limit.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
