import { createHash } from 'node:crypto';
import { db } from '@/server/db';

/**
 * Avatars, served as files rather than inlined into every page.
 *
 * They were stored as base64 data URLs and selected in `getSessionUser`, which
 * runs on *every* request — so ~30 KB of image rode along in the HTML of every
 * page, uncacheable, re-sent on every navigation. The talent directory was
 * worse: fifty profiles meant well over a megabyte of HTML before a single
 * word of content. That is most of "the site takes too long to load".
 *
 * Here the HTML carries a 30-byte URL instead, and the browser caches the
 * image itself. An ETag makes repeat requests a 304 with no body, so changing
 * your photo still shows up promptly.
 *
 * No session check: these are the same avatars any signed-in user sees in the
 * directory, keyed by public username. Nothing else about the account is
 * exposed, and requiring auth here would make them uncacheable again.
 */
export const dynamic = 'force-dynamic';

/** A neutral placeholder with the initial, so a missing photo is still one
 *  cheap cached request rather than a branch in every component. */
function fallback(name: string): Response {
  const initial = (name.trim()[0] ?? '?').toUpperCase()
    .replace(/[<>&"']/g, '?');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`
    + `<rect width="64" height="64" rx="32" fill="#eaf6f4"/>`
    + `<text x="32" y="41" text-anchor="middle" font-family="Georgia,serif"`
    + ` font-size="28" font-weight="600" fill="#0d7d74">${initial}</text></svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  let record: { displayName: string; image: string | null } | null = null;
  try {
    record = await db.user.findUnique({
      where: { username },
      select: { displayName: true, image: true },
    });
  } catch {
    // A database hiccup should cost one broken image, not a broken page.
    return fallback(username);
  }

  if (!record?.image) return fallback(record?.displayName ?? username);

  const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(record.image);
  if (!match) return fallback(record.displayName);

  const [, mime, base64] = match;
  const bytes = Buffer.from(base64, 'base64');
  const etag = `"${createHash('sha1').update(bytes).digest('base64url')}"`;

  // The browser already has this exact image: send no body at all.
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(bytes.length),
      ETag: etag,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  });
}
