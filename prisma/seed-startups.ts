import type { Category } from '../src/lib/categories';

/**
 * Startups raising money.
 *
 * The fundraising side of the marketplace has the same problem the talent
 * directory had: a page that works perfectly and shows nothing teaches a
 * visitor that nothing happens here. These are founders whose raises are
 * partly funded by the sample freelancers and clients, so the progress bars
 * are sums of real Pledge rows rather than decoration.
 *
 * Goals are small on purpose. A sample marketplace whose founders are all
 * raising half a million teaches the wrong expectation to the one real person
 * who publishes a $4,000 raise next week.
 */
export interface SeedRaise {
  key: string;
  founder: string;
  title: string;
  category: Category;
  stage: 'IDEA' | 'PROTOTYPE' | 'LAUNCHED' | 'REVENUE';
  summary: string;
  traction: string;
  websiteUrl?: string;
  goalCents: number;
  /** Days from now. Negative means it has already closed. */
  deadlineDays: number;
  useOfFunds: { label: string; amountCents: number }[];
  /** Freelancer or client keys, with what they put in. */
  backers: { who: string; amountCents: number; anonymous?: boolean }[];
}

export interface SeedFounder {
  key: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  category: Category;
  skills: string[];
}

export const FOUNDERS: SeedFounder[] = [
  {
    key: 'shonali-labs',
    displayName: 'Shonali Labs (sample)',
    headline: 'Bookkeeping for shops that have never used software',
    bio:
      'Two of us, both from families that ran small shops in Khulna. We are '
      + 'building the accounting tool our parents would actually have used — '
      + 'Bengali first, works on a five-year-old Android phone, and does not '
      + 'assume you know what a general ledger is.',
    location: 'Khulna, Bangladesh',
    category: 'Development & IT',
    skills: ['Flutter', 'Firebase', 'PostgreSQL', 'Bengali'],
  },
  {
    key: 'terrafix-ag',
    displayName: 'Terrafix (sample)',
    headline: 'Cheap soil sensing for smallholder farms',
    bio:
      'An agronomist and an embedded engineer. We make a soil moisture and '
      + 'nitrogen probe that costs about a tenth of the commercial ones, '
      + 'because the farms we are building it for cannot justify the other '
      + 'nine tenths.',
    location: 'Nairobi, Kenya',
    category: 'AI & Machine Learning',
    skills: ['Python', 'Computer Vision', 'MLOps'],
  },
  {
    key: 'orbit-archive',
    displayName: 'Orbit Archive (sample)',
    headline: 'Open evaluation datasets for low-resource languages',
    bio:
      'A small team building and publishing evaluation sets for languages that '
      + 'benchmark suites ignore. Everything we produce is released openly; '
      + 'what we need money for is paying the annotators properly.',
    location: 'Lisbon, Portugal',
    category: 'AI Research & Evaluation',
    skills: ['Dataset Curation', 'Annotation Guidelines', 'Model Evaluation'],
  },
];

export const RAISES: SeedRaise[] = [
  {
    key: 'shonali-ledger',
    founder: 'shonali-labs',
    title: 'Finish the offline ledger for shopkeepers with no reliable data',
    category: 'Development & IT',
    stage: 'PROTOTYPE',
    goalCents: 450_000,
    deadlineDays: 19,
    websiteUrl: 'https://example.com/shonali',
    summary:
      'Most bookkeeping apps assume a working data connection and a person who '
      + 'already understands double-entry accounting. The shopkeepers we have '
      + 'sat with have neither, and they are not the problem — the software '
      + 'is.\n\n'
      + 'Ours records a sale in two taps, works entirely offline, and syncs '
      + 'when the phone next finds a signal. The whole interface is in Bengali, '
      + 'including the numbers, because a Bengali label over an English amount '
      + 'field is not a translated app.\n\n'
      + 'We have a prototype that 40 shops in Khulna have been using for four '
      + 'months. What it does not have yet is the part that matters most to '
      + 'them: credit tracking. Almost every shop we visited runs a book of who '
      + 'owes what, on paper, and losing that book is the disaster they are '
      + 'actually afraid of.\n\n'
      + 'This raise pays for the six months it takes two of us to build credit '
      + 'tracking, get the sync conflict handling right, and put it in front of '
      + 'the 300 shops on our waiting list. We are not asking anyone to fund a '
      + 'company. We are asking for the specific piece of work above.',
    traction:
      '40 shops using the prototype daily in Khulna, four months, 11,000 '
      + 'transactions recorded. 300 on a waiting list from word of mouth — we '
      + 'have never advertised. No revenue yet: it is free while it is '
      + 'incomplete, and we will not charge until credit tracking ships.',
    useOfFunds: [
      { label: 'Two engineers, six months', amountCents: 280_000 },
      { label: 'Field testing across 60 more shops', amountCents: 90_000 },
      { label: 'Bengali usability testing and translation review', amountCents: 50_000 },
      { label: 'Hosting and sync infrastructure for a year', amountCents: 30_000 },
    ],
    backers: [
      { who: 'arif-hossain', amountCents: 50_000 },
      { who: 'tomasz-wieczorek', amountCents: 25_000 },
      { who: 'northwind-data', amountCents: 100_000 },
      { who: 'priya-raman', amountCents: 15_000, anonymous: true },
      { who: 'yusuf-karaman', amountCents: 20_000 },
      { who: 'sofia-navarro', amountCents: 10_000 },
    ],
  },
  {
    key: 'terrafix-probe',
    founder: 'terrafix-ag',
    title: 'Build 200 soil probes for a season-long field trial',
    category: 'AI & Machine Learning',
    stage: 'PROTOTYPE',
    goalCents: 620_000,
    deadlineDays: 34,
    summary:
      'A commercial soil probe costs around $400. On a two-hectare farm that '
      + 'is a season of income, so nobody buys one, so nobody has the data, so '
      + 'fertiliser goes on by guesswork and half of it washes away.\n\n'
      + 'Ours costs about $38 to make. It is less accurate than the $400 one — '
      + 'meaningfully less, and we would rather say so than pretend otherwise. '
      + 'It is accurate enough to answer the question a farmer actually has, '
      + 'which is "does this field need nitrogen this week or not".\n\n'
      + 'We have twelve working units and one season of data from four farms. '
      + 'The next honest step is a real trial: 200 probes, 40 farms, a full '
      + 'season, with yields compared against neighbouring control plots. If '
      + 'the yield difference is not there we will publish that too.\n\n'
      + 'The money is for the trial, not the company. If it works we will look '
      + 'for proper investment afterwards, from people licensed to give it.',
    traction:
      'Twelve units in the field for one season across four farms in Kiambu. '
      + 'Moisture readings track a reference probe within 8%; nitrogen is '
      + 'weaker at 19% and that is the number we most want the trial to test. '
      + 'Two agricultural co-operatives have said they will distribute if the '
      + 'trial holds up.',
    useOfFunds: [
      { label: '200 probes at build cost', amountCents: 190_000 },
      { label: 'Season-long field trial across 40 farms', amountCents: 240_000 },
      { label: 'Two agronomists, part time, one season', amountCents: 130_000 },
      { label: 'Independent yield measurement and write-up', amountCents: 60_000 },
    ],
    backers: [
      { who: 'meridian-labs', amountCents: 150_000 },
      { who: 'rahul-verma', amountCents: 30_000 },
      { who: 'daniel-okoye', amountCents: 12_000 },
      { who: 'nadia-benali', amountCents: 25_000, anonymous: true },
    ],
  },
  {
    key: 'orbit-bengali-eval',
    founder: 'orbit-archive',
    title: 'Pay annotators properly for a Bengali evaluation set',
    category: 'AI Research & Evaluation',
    stage: 'LAUNCHED',
    goalCents: 380_000,
    deadlineDays: -6,
    websiteUrl: 'https://example.com/orbit-archive',
    summary:
      'Every model that claims Bengali support is evaluated on translated '
      + 'English benchmarks. Translation shifts the difficulty, erases the '
      + 'idioms, and produces sentences no Bengali speaker would write — so '
      + 'the scores measure translation quality as much as the model.\n\n'
      + 'We are building an evaluation set written in Bengali from the start, '
      + 'covering both the script and the romanised form people actually type. '
      + 'Reading comprehension, code-switching, and a refusal set for questions '
      + 'the context does not answer.\n\n'
      + 'The dataset will be released openly under CC BY-SA. We are not '
      + 'selling it and we are not keeping a private test split.\n\n'
      + 'Nearly all of this money goes to annotators. Dataset work of this kind '
      + 'is routinely done by paying people badly in the countries the language '
      + 'comes from, and we would rather raise a smaller amount honestly than '
      + 'produce a larger dataset that way.',
    traction:
      'Two sets already published — Amharic and Sinhala — both in use by '
      + 'external groups. 1,400 Bengali items drafted and reviewed. Annotation '
      + 'guidelines are written and public.',
    useOfFunds: [
      { label: 'Annotator pay, 12 people, 3 months, local living wage', amountCents: 250_000 },
      { label: 'Two linguistic reviewers', amountCents: 80_000 },
      { label: 'Hosting, tooling and open release', amountCents: 50_000 },
    ],
    backers: [
      { who: 'meridian-labs', amountCents: 180_000 },
      { who: 'priya-raman', amountCents: 40_000 },
      { who: 'nadia-benali', amountCents: 60_000 },
      { who: 'arif-hossain', amountCents: 35_000 },
      { who: 'aurora-fintech', amountCents: 75_000 },
    ],
  },
];
