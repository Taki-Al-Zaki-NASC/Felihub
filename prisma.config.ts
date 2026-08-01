import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'prisma/config';

/**
 * Prisma's configuration, moved out of package.json.
 *
 * `package.json#prisma` is deprecated and stops working in Prisma 7 — the
 * warning on every command is that deadline, not a failure.
 *
 * ── The part that is not a straight move ─────────────────────────────────
 *
 * The moment a config file exists, Prisma stops loading `.env` itself and says
 * so: "Prisma config detected, skipping environment variable loading". So
 * `npx prisma db push` — the command the README tells people to run — starts
 * failing with a validation error about a missing DATABASE_URL, on a machine
 * where the variable is sitting in `.env` exactly where it was asked to be.
 *
 * Loading them here keeps that working. `.env` first and `.env.local` second,
 * because that is the precedence Next.js uses, and having the two tools
 * disagree about which file wins is worse than either order.
 */
function loadEnv() {
  // Node 20.12+. Guarded rather than assumed: failing to read an env file
  // should not stop `prisma validate` from telling you about your schema.
  const load = (process as NodeJS.Process & { loadEnvFile?: (p: string) => void })
    .loadEnvFile;
  if (typeof load !== 'function') return;

  for (const file of ['.env', '.env.local']) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    try {
      load.call(process, full);
    } catch {
      // A malformed env file is the user's to fix, and Prisma's own message
      // about a missing variable is clearer than one from a parser.
    }
  }
}

loadEnv();

export default defineConfig({
  // Explicit: once a config file exists, Prisma no longer infers this from the
  // default location either.
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
