/** The job taxonomy. Shared by the posting form, the job board and the
 *  landing page so the three cannot drift apart. */
export const CATEGORIES = [
  'Development & IT', 'Design & Creative', 'Writing & Translation',
  'Sales & Marketing', 'Finance & Accounting', 'Admin & Support',
] as const;

export type Category = (typeof CATEGORIES)[number];
