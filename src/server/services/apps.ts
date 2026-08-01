import { cache } from 'react';
import { db } from '@/server/db';
import { APPS, type AppKey } from '@/lib/apps';

/**
 * Which tools an account has switched on.
 *
 * The only module that reads `AppInstall`. A missing row is off — nothing here
 * treats absence as a default-on, so shipping a new tool never silently
 * enables it for people who never asked for it.
 *
 * Wrapped in React's `cache` because the sidebar, the page and any action in
 * the same request all want the same answer.
 */
export const enabledApps = cache(async (userId: string): Promise<Set<AppKey>> => {
  try {
    const rows = await db.appInstall.findMany({
      where: { userId, enabled: true },
      select: { app: true },
    });
    return new Set(rows.map((r) => r.app as AppKey));
  } catch {
    // A database that has not run upgrade.sql yet. No tools is a correct and
    // harmless answer; it must not take the page down with it.
    return new Set();
  }
});

/**
 * Whether one tool is on, answered from the session.
 *
 * Every page that gates on this has already called `requireUser`, and the
 * session carries the list — so this is a set lookup rather than the extra
 * round trip it used to be. On a database in another region that mattered:
 * /boards, /tracker and /team each paid for it before rendering anything.
 */
export function hasApp(user: { apps: string[] }, app: AppKey): boolean {
  return user.apps.includes(app);
}

/** Whether one tool is on, for the few callers that hold only an id. Prefer
 *  `hasApp` — this is a query. */
export async function appEnabled(userId: string, app: AppKey): Promise<boolean> {
  return (await enabledApps(userId)).has(app);
}

/**
 * A tool's own configuration.
 *
 * Kept as JSON on the install row rather than as columns, because each tool
 * owns its own shape and none of them is queried across accounts.
 */
export async function appSettings(
  userId: string,
  app: AppKey,
): Promise<Record<string, unknown>> {
  try {
    const row = await db.appInstall.findUnique({
      where: { userId_app: { userId, app } },
      select: { settings: true },
    });
    const value = row?.settings;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Whether a role is even offered this tool — checked on the server as well as
 *  in the grid, so a hand-crafted POST cannot switch on a tool for a role the
 *  product does not offer it to. */
export function offeredTo(app: AppKey, role: string): boolean {
  return (APPS[app].roles as readonly string[]).includes(role);
}
