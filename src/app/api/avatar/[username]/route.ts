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

/**
 * Every response revalidates, and the ETag makes that nearly free.
 *
 * This URL is stable per user but its *content* changes the moment they upload
 * a photo — and the placeholder used to be sent with `max-age=300,
 * stale-while-revalidate=86400`, cached under the same URL as the real thing.
 * So anyone who opened a profile before the photo existed kept being shown the
 * initial for five minutes afterwards, and could keep being shown it for a
 * day. "I uploaded my photo and it is still not showing" is that header, not
 * the upload.
 *
 * `no-cache` does not mean "do not store" — the browser keeps the bytes and
 * asks whether they are still current. With an ETag the answer is a 304 with
 * no body, which costs about what the stale hit cost and is always right.
 */
/**
 * `no-cache` was too strong, and it showed.
 *
 * It fixed the real bug — the placeholder being cached under the same URL as
 * the photo, so an upload did not appear — but it made the browser revalidate
 * *every* avatar on *every* page view. The talent directory is fifty faces:
 * fifty conditional requests, each one a round trip to a database that may be
 * in another region, on every single navigation. That is a page that feels
 * slow for a reason that has nothing to do with the page.
 *
 * A minute of `max-age` costs one stale minute after somebody changes their
 * photo — the case this whole comment exists because of — and removes the
 * per-view storm. `stale-while-revalidate` then lets the browser paint the
 * cached face instantly and fetch the new one behind it, so the *next* view is
 * current even if this one was not. The ETag still makes any revalidation a
 * 304 with no body.
 */
const REVALIDATE = 'public, max-age=60, stale-while-revalidate=600';

/** A neutral placeholder with the initial, so a missing photo is still one
 *  cheap request rather than a branch in every component. */
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
      // Tagged as well, so a repeat request for a placeholder is a 304 rather
      // than a re-send — and flips to the real photo the moment there is one.
      ETag: `"initial-${initial}"`,
      'Cache-Control': REVALIDATE,
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
      'Cache-Control': REVALIDATE,
    },
  });
}
