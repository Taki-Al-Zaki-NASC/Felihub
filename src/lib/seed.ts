import { postJob } from './mutations';
import type { Milestone } from './schema';

/**
 * Sample listings, for walking the product end to end before it has real
 * traffic.
 *
 * These are written through `postJob` — the same function the real form calls,
 * hitting the same security rules. Nothing here is a special path: if seeding
 * succeeds, posting works, and if the rules would refuse a real job they
 * refuse these too. That makes the seed a genuine smoke test rather than a
 * fixture loaded around the app.
 *
 * The listings are owned by whichever account runs the seed, because the rules
 * require it: `isSelf(request.resource.data.ownerId)`. There is no way to
 * fabricate a job owned by somebody else from a browser, which is the point.
 * To see the marketplace from both sides, run this as the client demo account
 * and then sign in as the freelancer one to browse and bid.
 */
export interface SeedJob {
  title: string;
  description: string;
  type: string;
  typeLabel: string;
  budget: string;
  budgetValue: number;
  skills: string[];
  milestones: Milestone[];
}

export const SAMPLE_JOBS: SeedJob[] = [
  {
    title: 'Android app — Jetpack Compose rebuild',
    description:
      'Our marketplace app is on an ageing XML view layer and we want it moved '
      + 'to Compose. Roughly 14 screens, existing design tokens, no backend '
      + 'work. You would own the migration end to end, screen by screen, with '
      + 'us reviewing each batch before it merges.\n\n'
      + 'Existing test coverage is thin — part of this job is bringing the '
      + 'critical paths under test as you go.',
    type: 'freelance', typeLabel: 'Freelance',
    budget: '$2,800', budgetValue: 2800,
    skills: ['Kotlin', 'Jetpack Compose', 'Android', 'Testing'],
    milestones: [
      { label: 'Design system + shared components', amount: '$700' },
      { label: 'Onboarding and auth screens', amount: '$900' },
      { label: 'Marketplace and messaging screens', amount: '$1,200' },
    ],
  },
  {
    title: 'Brand identity for a fintech startup',
    description:
      'Pre-seed, building payment rails for small merchants. We need a wordmark, '
      + 'a colour system that survives dark mode, and a one-page usage guide. '
      + 'Not a full brand book — something a small team can actually follow.\n\n'
      + 'We have a rough direction (warm, editorial, not another blue fintech) '
      + 'and will share references on kickoff.',
    type: 'freelance', typeLabel: 'Freelance',
    budget: '$1,200', budgetValue: 1200,
    skills: ['Brand Design', 'Logo Design', 'Typography', 'Figma'],
    milestones: [
      { label: 'Three directions, one route chosen', amount: '$400' },
      { label: 'Final wordmark and colour system', amount: '$500' },
      { label: 'Usage guide and asset handoff', amount: '$300' },
    ],
  },
  {
    title: 'Next.js marketing site with a headless CMS',
    description:
      'Six pages, App Router, content in Sanity so non-engineers can edit. '
      + 'Needs to score well on Core Web Vitals and be genuinely responsive — '
      + 'we get most of our traffic on phones.\n\n'
      + 'Design is done and in Figma. This is a build job, not a design one.',
    type: 'freelance', typeLabel: 'Freelance',
    budget: '$1,900', budgetValue: 1900,
    skills: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Sanity'],
    milestones: [
      { label: 'Scaffold, CMS schema, deploy pipeline', amount: '$600' },
      { label: 'All six pages built and responsive', amount: '$900' },
      { label: 'Performance pass and handover', amount: '$400' },
    ],
  },
  {
    title: 'Technical writer — API reference and quickstart',
    description:
      'REST API, about 40 endpoints, currently documented only in code '
      + 'comments. We want a quickstart someone can follow in ten minutes and '
      + 'a reference that stays accurate.\n\n'
      + 'You will have direct access to the two engineers who built it.',
    type: 'contract', typeLabel: 'Contract',
    budget: '$1,500', budgetValue: 1500,
    skills: ['Technical Writing', 'API Documentation', 'OpenAPI'],
    milestones: [
      { label: 'Quickstart and auth guide', amount: '$500' },
      { label: 'Full endpoint reference', amount: '$1,000' },
    ],
  },
  {
    title: 'Flutter developer for an offline-first field app',
    description:
      'Inspectors work in places with no signal. The app has to queue writes '
      + 'locally and reconcile when it reconnects, without losing anything and '
      + 'without silently overwriting a colleague.\n\n'
      + 'Conflict handling is the hard part and the reason for the budget. Tell '
      + 'us how you would approach it in your proposal.',
    type: 'freelance', typeLabel: 'Freelance',
    budget: '$3,400', budgetValue: 3400,
    skills: ['Flutter', 'Dart', 'SQLite', 'Offline Sync'],
    milestones: [
      { label: 'Local store and queue', amount: '$1,200' },
      { label: 'Sync and conflict resolution', amount: '$1,400' },
      { label: 'Field testing and fixes', amount: '$800' },
    ],
  },
  {
    title: 'SEO audit and content plan — B2B SaaS',
    description:
      'We rank for our brand and almost nothing else. Want an honest audit of '
      + 'why, plus a twelve-week content plan we can execute with one writer.\n\n'
      + 'Please do not propose a link-buying package.',
    type: 'contract', typeLabel: 'Contract',
    budget: '$900', budgetValue: 900,
    skills: ['SEO', 'Content Strategy', 'Analytics'],
    milestones: [
      { label: 'Technical and content audit', amount: '$400' },
      { label: 'Twelve-week plan with briefs', amount: '$500' },
    ],
  },
  {
    title: 'Illustration set for an onboarding flow',
    description:
      'Eight spot illustrations, consistent style, exported as SVG. They sit on '
      + 'a warm cream background and need to read at small sizes on a phone.\n\n'
      + 'Looking for something with a bit of texture — not the flat corporate '
      + 'style everyone is using.',
    type: 'freelance', typeLabel: 'Freelance',
    budget: '$750', budgetValue: 750,
    skills: ['Illustration', 'SVG', 'Figma'],
    milestones: [
      { label: 'Style exploration, two options', amount: '$250' },
      { label: 'Eight final illustrations', amount: '$500' },
    ],
  },
  {
    title: 'Firestore security rules review',
    description:
      'We have about 300 lines of rules and a test suite we are not confident '
      + 'in. Want someone who has actually shipped on Firestore to review both '
      + 'and tell us what we got wrong.\n\n'
      + 'Short engagement, but we would rather pay well for a real review than '
      + 'cheaply for a skim.',
    type: 'contract', typeLabel: 'Contract',
    budget: '$600', budgetValue: 600,
    skills: ['Firebase', 'Firestore', 'Security', 'Node.js'],
    milestones: [
      { label: 'Review and written findings', amount: '$600' },
    ],
  },
];

export interface SeedOutcome {
  created: number;
  failed: number;
  firstError?: string;
}

/**
 * Posts the sample listings one at a time.
 *
 * Sequential rather than batched on purpose: a rule refusal on job three
 * should still leave one and two posted, and should report which. A
 * `Promise.all` would hide that behind whichever rejected first.
 */
export async function seedJobs(
  ownerId: string,
  ownerName: string,
  onProgress?: (done: number, total: number) => void,
): Promise<SeedOutcome> {
  let created = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const [i, job] of SAMPLE_JOBS.entries()) {
    try {
      await postJob({ ...job, ownerId, ownerName });
      created++;
    } catch (e) {
      failed++;
      if (!firstError) {
        firstError = (e as { code?: string }).code === 'permission-denied'
          ? 'The server refused the write. This account is not verified yet — '
            + 'clear identity and the deposit first.'
          : 'Could not post that listing. Check the console for details.';
      }
    }
    onProgress?.(i + 1, SAMPLE_JOBS.length);
  }

  return { created, failed, firstError };
}
