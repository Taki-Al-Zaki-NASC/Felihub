/**
 * The optional tools an account can switch on, in one list.
 *
 * The Settings grid, the Server Action that toggles them, the sidebar and the
 * pages themselves all read this — so a tool cannot be advertised in Settings
 * and unreachable in the product, which is exactly how a v1 "coming soon" card
 * survived three releases.
 *
 * Everything here is free, and the badge says so. If that ever stops being
 * true, the price belongs in this file next to the tool rather than in a
 * pricing page that drifts.
 */

export const APP_KEYS = ['KANBAN', 'TIME_TRACKER', 'TEAM_MANAGER'] as const;
export type AppKey = (typeof APP_KEYS)[number];

export interface AppDefinition {
  key: AppKey;
  title: string;
  description: string;
  /** Lucide icon name, resolved in the card component. */
  icon: 'KanbanSquare' | 'Timer' | 'Users';
  /** Where the tool lives once it is on. */
  href: string;
  /** Shown on the badge. Free for all of them, and stated rather than implied. */
  price: 'FREE';
  /** Roles this is offered to. A freelancer has no payroll to run. */
  roles: readonly ('CLIENT' | 'AGENCY' | 'STARTUP' | 'FREELANCER')[];
  /** One line under the toggle when it is on, saying what that changed. */
  whenOn: string;
  /** Anything the person switching it on should know before they do. */
  caution?: string;
}

export const APPS: Record<AppKey, AppDefinition> = {
  KANBAN: {
    key: 'KANBAN',
    title: 'Kanban Boards',
    description:
      'Organise tasks and milestones with a drag-and-drop project board. A '
      + 'board can be attached to a job, so its columns track the milestones '
      + 'the money is already tied to rather than a second list of them.',
    icon: 'KanbanSquare',
    href: '/boards',
    price: 'FREE',
    roles: ['CLIENT', 'AGENCY', 'STARTUP', 'FREELANCER'],
    whenOn: 'Boards appears in your sidebar, and every contract can have one.',
  },
  TIME_TRACKER: {
    key: 'TIME_TRACKER',
    title: 'Desktop Time Tracker',
    description:
      'Track freelancer hours, capture periodic screenshots, and monitor '
      + 'activity. Runs as a desktop app on Windows, macOS and Linux, and '
      + 'reports to your contracts here.',
    icon: 'Timer',
    href: '/tracker',
    price: 'FREE',
    roles: ['CLIENT', 'AGENCY', 'STARTUP', 'FREELANCER'],
    whenOn: 'You can pair a device and see hours against each contract.',
    caution:
      'Screenshots are off unless the freelancer being tracked turns them on, '
      + 'from their own machine. Watching somebody’s screen without their '
      + 'knowledge is not a setting we will give you.',
  },
  TEAM_MANAGER: {
    key: 'TEAM_MANAGER',
    title: 'Team Manager',
    description:
      'Invite co-founders and managers to review work logs and handle '
      + 'payroll. Each person gets a role, and a manager can approve time and '
      + 'release milestones without holding your password.',
    icon: 'Users',
    href: '/team',
    price: 'FREE',
    roles: ['CLIENT', 'AGENCY', 'STARTUP'],
    whenOn: 'Team appears in your sidebar and you can send invitations.',
  },
};

export const APP_LIST: AppDefinition[] = APP_KEYS.map((k) => APPS[k]);

export function isAppKey(value: unknown): value is AppKey {
  return typeof value === 'string' && (APP_KEYS as readonly string[]).includes(value);
}

/** The tools offered to a role. A freelancer is not shown Team Manager,
 *  because there is no payroll on that side of a contract to run. */
export function appsFor(role: string): AppDefinition[] {
  return APP_LIST.filter((a) => (a.roles as readonly string[]).includes(role));
}
