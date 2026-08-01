import type { Role } from '@prisma/client';

/**
 * What signing up looks like, per account type.
 *
 * The four roles were being asked the same eight questions with one word
 * swapped, which is why a startup founder was typing their company into a box
 * labelled "Headline" and an agency had nowhere to say how many people it is.
 * They are not the same kind of account and the form should not pretend they
 * are.
 *
 * One definition, read by the onboarding page, the settings form and the
 * Server Action that validates the answers — so a field cannot be asked for in
 * one place and rejected in another.
 */

export interface RoleFlow {
  role: Role;
  /** What the account calls itself, in prose. */
  noun: string;
  /** The onboarding page's heading and the sentence under it. */
  title: string;
  intro: string;
  /** The steps shown in the progress rail, in order. */
  steps: readonly string[];

  labels: {
    headline: string;
    headlinePlaceholder: string;
    headlineHint: string;
    bio: string;
    bioPlaceholder: string;
    bioHint: string;
    category: string;
    categoryHint: string;
    skills: string;
    skillsHint: string;
    skillsPlaceholder: string;
    location: string;
  };

  /** Fields that only some roles are asked for. */
  asksHourlyRate: boolean;
  asksTeamSize: boolean;
  asksStage: boolean;
  asksWebsite: boolean;

  /** What this account can do once it is through the gate — shown at the end
   *  of onboarding so the point of all the typing is stated. */
  unlocks: readonly string[];
}

const FLOWS: Record<Role, RoleFlow> = {
  FREELANCER: {
    role: 'FREELANCER',
    noun: 'freelancer',
    title: 'Set up your profile',
    intro:
      'Clients read this before they message anyone, and the job board matches '
      + 'work to your category and skills. It is the whole of your presence '
      + 'here.',
    steps: ['Profile', 'Verification', 'Start bidding'],
    labels: {
      headline: 'Headline',
      headlinePlaceholder: 'Computer vision engineer — PyTorch, edge deployment',
      headlineHint: 'The line clients see under your name in search results.',
      bio: 'About you',
      bioPlaceholder: 'What you build, the problems you are good at, and how you work.',
      bioHint: 'At least a couple of sentences. This is the first thing anyone reads.',
      category: 'Category you work in',
      categoryHint: 'The board matches jobs against this, so pick where you actually work.',
      skills: 'Skills',
      skillsHint: 'How clients find you. Spell them the way the industry does.',
      skillsPlaceholder: 'PyTorch',
      location: 'Where you are',
    },
    asksHourlyRate: true,
    asksTeamSize: false,
    asksStage: false,
    asksWebsite: true,
    unlocks: [
      'Bid on any job, free, with no credits to buy',
      'Appear in the talent directory clients search',
      'Get paid per milestone out of escrow',
    ],
  },

  CLIENT: {
    role: 'CLIENT',
    noun: 'client',
    title: 'Tell freelancers who they would be working with',
    intro:
      'Freelancers check who is hiring before they spend an hour on a '
      + 'proposal. A filled-in profile gets better bids, and fewer of the '
      + 'other kind.',
    steps: ['Company', 'Verification', 'Post a job'],
    labels: {
      headline: 'Company or role',
      headlinePlaceholder: 'Head of Data at a logistics company',
      headlineHint: 'What you do, so freelancers know who they are talking to.',
      bio: 'About the company',
      bioPlaceholder: 'What your company does and the kind of help you usually need.',
      bioHint: 'Two or three sentences. Freelancers are deciding whether to bid.',
      category: 'Category you hire in',
      categoryHint: 'Helps the right freelancers find your postings.',
      skills: 'What you hire for',
      skillsHint: 'The skills you bring people in for, so they know before they read.',
      skillsPlaceholder: 'PyTorch',
      location: 'Where the company is',
    },
    asksHourlyRate: false,
    asksTeamSize: false,
    asksStage: false,
    asksWebsite: true,
    unlocks: [
      'Post jobs with milestones and read verified bids',
      'Fund escrow milestone by milestone, released when you approve',
      'Message anyone in the talent directory without posting first',
    ],
  },

  AGENCY: {
    role: 'AGENCY',
    noun: 'agency',
    title: 'Set up your agency',
    intro:
      'An agency hires and is hired. This profile is read by freelancers you '
      + 'bring in and by clients deciding whether to hand you a project, so it '
      + 'is worth being specific about what you actually deliver.',
    steps: ['Agency', 'Verification', 'Hire or be hired'],
    labels: {
      headline: 'What the agency does',
      headlinePlaceholder: 'Data engineering studio — pipelines, warehouses, migrations',
      headlineHint: 'One line. It is what both sides see first.',
      bio: 'About the agency',
      bioPlaceholder:
        'What you deliver, the size of engagement you take, and how you work '
        + 'with a client’s own team.',
      bioHint: 'Say what you do not do as well. It saves everybody a call.',
      category: 'Your main practice',
      categoryHint: 'Where most of your work sits. You can bid outside it.',
      skills: 'What the agency delivers',
      skillsHint: 'The capabilities you staff, not every tool anyone has touched.',
      skillsPlaceholder: 'Airflow',
      location: 'Where the agency is',
    },
    asksHourlyRate: true,
    asksTeamSize: true,
    asksStage: false,
    asksWebsite: true,
    unlocks: [
      'Bid on work as an agency, and post jobs to staff it',
      'Invite managers with Team Manager so you are not the only login',
      'Escrow on both sides — what you are owed and what you owe',
    ],
  },

  STARTUP: {
    role: 'STARTUP',
    noun: 'startup',
    title: 'Tell people what you are building',
    intro:
      'A startup account hires contractors and can raise money here. Both '
      + 'sides read this profile — the freelancer deciding whether to bid, and '
      + 'the backer deciding whether to put money behind you.',
    steps: ['Startup', 'Verification', 'Hire or raise'],
    labels: {
      headline: 'What you are building',
      headlinePlaceholder: 'Bengali-first bookkeeping for small shops',
      headlineHint: 'One line a stranger would understand.',
      bio: 'About the company',
      bioPlaceholder:
        'The problem, who has it, what you have built so far, and who is on '
        + 'the team.',
      bioHint:
        'Backers read this before they read your raise. Understating what '
        + 'exists is far better than the alternative.',
      category: 'Which category it sits in',
      categoryHint: 'Used to match both the freelancers and the people browsing raises.',
      skills: 'Your stack, or what you hire for',
      skillsHint: 'What you build with, so the right contractors find you.',
      skillsPlaceholder: 'Flutter',
      location: 'Where you are based',
    },
    asksHourlyRate: false,
    asksTeamSize: true,
    asksStage: true,
    asksWebsite: true,
    unlocks: [
      'Hire contractors with escrow, like any client',
      'Publish a raise — all-or-nothing, and no equity is involved',
      'Bring in co-founders with Team Manager',
    ],
  },
};

export function flowFor(role: Role | string): RoleFlow {
  return FLOWS[role as Role] ?? FLOWS.CLIENT;
}

export const STARTUP_STAGES = [
  'IDEA', 'PROTOTYPE', 'LAUNCHED', 'REVENUE',
] as const;

export const TEAM_SIZES = [
  'Just me', '2–5', '6–15', '16–50', '50+',
] as const;
