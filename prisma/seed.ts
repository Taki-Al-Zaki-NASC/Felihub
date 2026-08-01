/**
 * Sample marketplace data.
 *
 *   npm run db:seed
 *
 * Creates a marketplace that looks like one: verified clients with work
 * posted, verified freelancers with skills and rates, live bids on the open
 * jobs, and a set of contracts that already finished — which is where the
 * ratings and the earnings come from.
 *
 * The data lives in four files next to this one; this is only the writer.
 *
 *   seed-ai-jobs.ts      applied AI and PyTorch work, and the two firms posting it
 *   seed-freelancers.ts  the people, and their live bids
 *   seed-history.ts      completed contracts, each with a review
 *   seed-types.ts        the shapes all of them share
 *
 * It is safe to re-run. Everything is written against a deterministic key, so
 * a second run updates rather than duplicating, and it never deletes a row it
 * did not create. Counters that would otherwise drift — proposal counts,
 * ratings, lifetime earnings — are recomputed and *set*, never incremented,
 * which is the difference between a seed that is correct and one that is
 * correct once.
 *
 * The one thing a re-run does change is the timestamps: postings are dated
 * relative to now, so the board reads "posted 3 days ago" rather than slowly
 * aging into a wall of eight-month-old work.
 *
 * Seed accounts are prefixed `sample-` and their display names say "(sample)",
 * so a real freelancer browsing the board can tell which listings are
 * demonstration data and which are somebody's actual budget.
 */
import { PrismaClient, type Role } from '@prisma/client';
import { CATEGORIES, SKILLS_BY_CATEGORY } from '../src/lib/categories';
import { platformFee } from '../src/lib/fees';
import type { SeedClient, SeedFreelancer, SeedJob } from './seed-types';
import { AI_CLIENTS, AI_JOBS } from './seed-ai-jobs';
import { BIDS, FREELANCERS } from './seed-freelancers';
import { COMPLETED_JOBS } from './seed-history';

const db = new PrismaClient();

/** Marks every row this script owns, so it is obvious in the database. */
const SEED_PREFIX = 'sample-';

/** What a freelancer puts down to join, and gets back after their first
 *  completed job — the same $20 the pricing page quotes. */
const TRUST_BOND_CENTS = 20_00;

const BASE_CLIENTS: SeedClient[] = [
  {
    key: 'northwind-data',
    displayName: 'Northwind Data (sample)',
    headline: 'Analytics platform for mid-market retail',
    bio:
      'We run the reporting stack for about forty retail chains. Most of our '
      + 'work is warehouse and pipeline shaped: getting messy point-of-sale '
      + 'data somewhere it can be trusted, then keeping it that way. Small '
      + 'in-house team, so we bring in specialists for defined pieces.',
    location: 'Dhaka, Bangladesh',
    category: 'Data Engineering',
    hires: ['Airflow', 'dbt', 'Snowflake', 'Kafka'],
  },
  {
    key: 'meridian-labs',
    displayName: 'Meridian Labs (sample)',
    headline: 'Applied AI research group',
    bio:
      'A small research group working on evaluation: how you tell whether a '
      + 'model is actually good at the thing you shipped it for. We publish '
      + 'most of what we find, and we contract out audits and reproductions '
      + 'that need a second, independent pair of hands.',
    location: 'Singapore',
    category: 'AI Research & Evaluation',
    hires: ['Model Evaluation', 'Red-teaming', 'RLHF', 'Benchmark Design'],
  },
  {
    key: 'aurora-fintech',
    displayName: 'Aurora Fintech (sample)',
    headline: 'Subscription billing for B2B software',
    bio:
      'We handle billing and revenue reporting for around two hundred SaaS '
      + 'companies. Our data questions are unglamorous and important: who is '
      + 'about to churn, what is next quarter going to look like, and can we '
      + 'prove the answer.',
    location: 'London, United Kingdom',
    category: 'Data Science & Analytics',
    hires: ['Python', 'SQL', 'A/B Testing', 'Forecasting'],
  },
];

/** Budgets are in cents, and milestones must sum to the budget exactly — the
 *  same rule the posting form enforces. */
const BASE_JOBS: SeedJob[] = [
  /* ── Data Engineering ─────────────────────────────────────────────────── */
  {
    key: 'etl-airflow-snowflake',
    client: 'northwind-data',
    title: 'Automated ETL pipeline with Apache Airflow and Snowflake',
    category: 'Data Engineering',
    skills: ['Airflow', 'Snowflake', 'dbt', 'ETL', 'Data Quality'],
    budgetCents: 480_000,
    durationDays: 45,
    description:
      'We pull point-of-sale extracts from 40 retail clients, each on their '
      + 'own schedule and its own idea of a CSV. Today that lands in S3 and a '
      + 'cron job written by someone who left in 2023 loads it into Snowflake. '
      + 'It breaks roughly weekly and nobody finds out until a customer asks '
      + 'why yesterday is missing.\n\n'
      + 'We want it rebuilt on Airflow, with dbt for the transformation layer '
      + 'and real tests on the way in.\n\n'
      + 'Scope:\n'
      + '• Airflow DAGs per source, with retries, backfill and alerting that '
      + 'reaches a human before a customer does\n'
      + '• dbt models for the staging → intermediate → mart layers, with tests '
      + 'on row counts, freshness, and referential integrity\n'
      + '• Idempotent loads: re-running yesterday must not double-count\n'
      + '• A runbook, written for whoever is on call at 3am and did not build it\n\n'
      + 'Done means: a week of production runs with no manual intervention, '
      + 'and a deliberately corrupted source file that fails loudly instead of '
      + 'landing silently.\n\n'
      + 'Our stack is Snowflake, S3, Airflow 2.x on MWAA, dbt Core.',
    milestones: [
      { label: 'Source audit and DAG design signed off', amountCents: 96_000 },
      { label: 'Airflow DAGs for all 40 sources, running in staging', amountCents: 192_000 },
      { label: 'dbt models and data quality tests', amountCents: 120_000 },
      { label: 'Production cutover, alerting and runbook', amountCents: 72_000 },
    ],
  },
  {
    key: 'streaming-kafka-pyspark',
    client: 'northwind-data',
    title: 'Real-time streaming data pipeline using Kafka and PySpark',
    category: 'Data Engineering',
    skills: ['Kafka', 'Apache Spark', 'Data Modelling', 'ETL'],
    budgetCents: 620_000,
    durationDays: 60,
    description:
      'Our largest clients want stock and sales figures within a minute, not '
      + 'the next morning. The batch pipeline cannot give them that, so we are '
      + 'building a streaming path alongside it rather than replacing it.\n\n'
      + 'Scope:\n'
      + '• Kafka topics and partitioning for ~15k events/second at peak, with '
      + 'a schema registry and a written compatibility policy\n'
      + '• PySpark Structured Streaming jobs for enrichment and aggregation, '
      + 'with watermarking for late-arriving events — some of our stores go '
      + 'offline for hours and replay\n'
      + '• Exactly-once semantics into the serving layer; we would rather be a '
      + 'minute late than double-count a sale\n'
      + '• Reconciliation against the nightly batch, because the two disagreeing '
      + 'silently is the failure mode that would actually hurt us\n\n'
      + 'Done means: sustained load test at 2x peak, and a documented recovery '
      + 'from a six-hour consumer outage without data loss or duplication.',
    milestones: [
      { label: 'Topic design, schema registry and load test plan', amountCents: 124_000 },
      { label: 'Kafka infrastructure and producers in staging', amountCents: 186_000 },
      { label: 'PySpark streaming jobs with watermarking', amountCents: 217_000 },
      { label: 'Batch reconciliation, failover drill and handover', amountCents: 93_000 },
    ],
  },
  {
    key: 'postgres-optimisation',
    client: 'aurora-fintech',
    title: 'PostgreSQL query optimisation and database indexing review',
    category: 'Data Engineering',
    skills: ['PostgreSQL', 'SQL', 'Data Modelling', 'Data Quality'],
    budgetCents: 260_000,
    durationDays: 21,
    description:
      'Our reporting database has grown past 900GB and the month-end invoice '
      + 'run now takes eleven hours, up from two last year. We have thrown '
      + 'hardware at it twice. We would like someone to find out what is '
      + 'actually wrong instead.\n\n'
      + 'Scope:\n'
      + '• Review the twenty slowest queries by total time — we will supply '
      + 'pg_stat_statements output and EXPLAIN ANALYZE plans\n'
      + '• Indexing review: what is missing, what is redundant, and what is '
      + 'being maintained on every write for no reader at all\n'
      + '• Partitioning recommendation for the two largest tables\n'
      + '• Autovacuum and bloat assessment\n\n'
      + 'Deliverable is a written report with before/after timings on a '
      + 'restored copy of production, and migrations we can review and apply '
      + 'ourselves. We are not looking for a rewrite of the application.\n\n'
      + 'Postgres 15 on RDS. Read replica available for testing.',
    milestones: [
      { label: 'Query and index audit report', amountCents: 130_000 },
      { label: 'Migrations, benchmarks and partitioning plan', amountCents: 130_000 },
    ],
  },

  /* ── AI Research & Evaluation ─────────────────────────────────────────── */
  {
    key: 'rlhf-red-team-llama3',
    client: 'meridian-labs',
    title: 'RLHF and red-teaming audit for a fine-tuned Llama-3 model',
    category: 'AI Research & Evaluation',
    skills: ['Red-teaming', 'RLHF', 'Model Evaluation', 'Bias Auditing', 'Reinforcement Learning'],
    budgetCents: 720_000,
    durationDays: 40,
    description:
      'We have fine-tuned Llama-3 8B for a customer support setting, with a '
      + 'preference-tuning stage on internal data. Before it goes anywhere '
      + 'near a customer we want an independent audit — by someone who did not '
      + 'build it and has no stake in it passing.\n\n'
      + 'Scope:\n'
      + '• Structured red-teaming across prompt injection, data exfiltration '
      + 'from the system prompt, and jailbreaks that bypass refusal training\n'
      + '• Review of our reward model and preference data for the usual '
      + 'failure modes: length bias, sycophancy, reward hacking\n'
      + '• Demographic bias evaluation on our support transcripts, with the '
      + 'methodology written up so we can rerun it ourselves\n'
      + '• Comparison against the base model — we need to know what the '
      + 'fine-tune made worse, not only what it improved\n\n'
      + 'Deliverable is a report with reproducible attack prompts, severity '
      + 'ratings, and a rerunnable evaluation harness. We would rather hear '
      + 'that it is not ready than hear that it is.\n\n'
      + 'Weights and preference data available under NDA. Compute provided.',
    milestones: [
      { label: 'Threat model and evaluation plan agreed', amountCents: 108_000 },
      { label: 'Red-teaming pass with reproducible findings', amountCents: 288_000 },
      { label: 'Reward model and bias analysis', amountCents: 216_000 },
      { label: 'Final report and rerunnable harness', amountCents: 108_000 },
    ],
  },
  {
    key: 'rag-benchmark-hallucination',
    client: 'meridian-labs',
    title: 'RAG pipeline benchmarking and hallucination reduction',
    category: 'AI Research & Evaluation',
    skills: ['RAG', 'Benchmark Design', 'Model Evaluation', 'Vector Databases', 'Statistical Significance'],
    budgetCents: 540_000,
    durationDays: 35,
    description:
      'Our retrieval-augmented pipeline answers questions over about 60,000 '
      + 'technical documents. It is confidently wrong often enough that we do '
      + 'not trust it, and we cannot currently say whether a change makes it '
      + 'better or we got lucky on the ten examples we tried.\n\n'
      + 'Scope:\n'
      + '• Build a benchmark from our corpus: a few hundred questions with '
      + 'grounded answers and known-unanswerable cases, because refusing to '
      + 'answer is the behaviour we most need to measure\n'
      + '• Evaluate retrieval and generation separately — we do not know which '
      + 'half is failing, and averaging them hides it\n'
      + '• Test chunking, reranking and prompt changes as controlled '
      + 'experiments with confidence intervals, not vibes\n'
      + '• Recommend a citation-checking step for claims not supported by '
      + 'retrieved context\n\n'
      + 'Done means: a benchmark we can run in CI, and a written account of '
      + 'which interventions helped, by how much, and which did nothing. A '
      + 'negative result honestly reported is worth as much to us.\n\n'
      + 'Stack: Postgres with pgvector, an open-weights embedding model, '
      + 'GPT-class generation.',
    milestones: [
      { label: 'Benchmark set built and validated', amountCents: 162_000 },
      { label: 'Baseline evaluation, retrieval and generation split out', amountCents: 135_000 },
      { label: 'Intervention experiments with significance testing', amountCents: 189_000 },
      { label: 'CI harness and written findings', amountCents: 54_000 },
    ],
  },
  {
    key: 'paper-reproduction-cv',
    client: 'meridian-labs',
    title: 'Paper reproduction and computer vision model evaluation',
    category: 'AI Research & Evaluation',
    skills: ['Paper Reproduction', 'Computer Vision', 'PyTorch', 'Ablation Studies', 'Model Evaluation'],
    budgetCents: 460_000,
    durationDays: 42,
    description:
      'We want an independent reproduction of a recent computer vision paper '
      + '(we will name it on shortlisting — it is a 2025 detection architecture '
      + 'with released code but no released weights). Our interest is whether '
      + 'the reported gains hold outside the authors’ setup.\n\n'
      + 'Scope:\n'
      + '• Reproduce the headline results on the benchmark the paper reports, '
      + 'from the released code, documenting every deviation you had to make\n'
      + '• Run the stated ablations and tell us which components actually carry '
      + 'the improvement\n'
      + '• Evaluate on one dataset the paper does not use, which we will supply '
      + '— roughly 30k labelled images from a different domain\n'
      + '• Report training cost and inference latency honestly, including the '
      + 'runs that failed\n\n'
      + 'We are not expecting the numbers to match exactly. We are expecting to '
      + 'learn where they do not and why. A clean "this does not reproduce" is '
      + 'a successful outcome.\n\n'
      + 'PyTorch. 4x A100 provided for the duration.',
    milestones: [
      { label: 'Environment reproduced, baseline training running', amountCents: 92_000 },
      { label: 'Headline results reproduced and documented', amountCents: 161_000 },
      { label: 'Ablations and out-of-domain evaluation', amountCents: 138_000 },
      { label: 'Write-up with cost and latency analysis', amountCents: 69_000 },
    ],
  },

  /* ── Data Science & Analytics ─────────────────────────────────────────── */
  {
    key: 'churn-model-ab-testing',
    client: 'aurora-fintech',
    title: 'Customer churn prediction model and A/B testing analysis',
    category: 'Data Science & Analytics',
    skills: ['Python', 'SQL', 'A/B Testing', 'Statistics', 'Causal Inference'],
    budgetCents: 390_000,
    durationDays: 35,
    description:
      'We lose about 4% of accounts a quarter and we find out when they '
      + 'cancel. We would like to find out earlier, and we would like to know '
      + 'whether our retention offers do anything at all.\n\n'
      + 'Two connected pieces of work.\n\n'
      + 'Churn model:\n'
      + '• Feature engineering from billing history, support tickets and '
      + 'product usage — roughly 200k accounts over four years\n'
      + '• A model we can actually act on: we care more about which accounts '
      + 'and why than about the last two points of AUC\n'
      + '• Honest evaluation on a forward time split, not a random one\n\n'
      + 'A/B analysis:\n'
      + '• We have run six retention experiments over eighteen months and read '
      + 'them all as wins. We would like an independent reading, including '
      + 'power, multiple comparisons, and whether the randomisation held\n'
      + '• A short written standard for how we should run and read the next one\n\n'
      + 'We would genuinely rather be told our experiments were underpowered '
      + 'than be told what we hoped to hear.',
    milestones: [
      { label: 'Data audit and feature set agreed', amountCents: 78_000 },
      { label: 'Churn model trained and evaluated', amountCents: 156_000 },
      { label: 'Re-analysis of the six past experiments', amountCents: 117_000 },
      { label: 'Experiment standard and handover', amountCents: 39_000 },
    ],
  },
  {
    key: 'financial-forecasting-dashboard',
    client: 'aurora-fintech',
    title: 'Interactive financial forecasting dashboard',
    category: 'Data Science & Analytics',
    skills: ['Forecasting', 'Time Series', 'Tableau', 'SQL', 'Python'],
    budgetCents: 320_000,
    durationDays: 30,
    description:
      'Our finance team rebuilds the same revenue forecast in Excel every '
      + 'month, and every month it disagrees with the last one for reasons '
      + 'nobody can reconstruct. We want it in one place, versioned, with the '
      + 'assumptions visible.\n\n'
      + 'Scope:\n'
      + '• Time series models for recurring revenue, expansion and churn, at '
      + 'monthly grain, by segment — seasonality matters, our Q4 is not our Q2\n'
      + '• Prediction intervals shown as intervals. A single line implies a '
      + 'confidence we do not have, and the board treats it as a promise\n'
      + '• A Tableau dashboard the finance team can drive: adjust assumptions, '
      + 'compare scenarios, see how last month’s forecast actually did\n'
      + '• Backtesting over the last three years so we know the error we should '
      + 'expect\n\n'
      + 'Data is in Snowflake and reasonably clean. The finance team are '
      + 'competent with numbers and not with code; the handover matters as much '
      + 'as the model.',
    milestones: [
      { label: 'Model selection and backtest results', amountCents: 128_000 },
      { label: 'Forecasting pipeline in production', amountCents: 96_000 },
      { label: 'Tableau dashboard and finance team handover', amountCents: 96_000 },
    ],
  },
];

const CLIENTS: SeedClient[] = [...BASE_CLIENTS, ...AI_CLIENTS];
const OPEN_JOBS: SeedJob[] = [...BASE_JOBS, ...AI_JOBS];
const ALL_JOBS: SeedJob[] = [...OPEN_JOBS, ...COMPLETED_JOBS];

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Account keys to database ids, filled in as accounts are written.
 *
 * Accounts are matched on their email rather than given a chosen id, because
 * an earlier version of this seed let Prisma generate the id — and a database
 * already carrying those rows would reject a second one with the same email.
 * A row's id is not something a re-run can change without breaking every
 * foreign key pointing at it.
 */
const ids = new Map<string, string>();

function userId(key: string): string {
  const id = ids.get(key);
  if (!id) throw new Error(`seed: no account was written for "${key}"`);
  return id;
}

const email = (key: string) => `${SEED_PREFIX}${key}@felicek.example`;
const jobId = (key: string) => `${SEED_PREFIX}${key}`;
const proposalId = (job: string, freelancer: string) =>
  `${SEED_PREFIX}bid-${job}-${freelancer}`;

function noteTarget() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) throw new Error('DATABASE_URL is not set.');
  const local = /@(localhost|127\.0\.0\.1|host\.docker\.internal|postgres)[:/]/.test(url);
  if (!local) {
    console.log(
      'Seeding a remote database. Every account, job and bid created here is '
      + 'labelled "(sample)" so anyone browsing can tell it apart from real '
      + 'work.\n',
    );
  }
}

/**
 * Everything that has to be true before a single row is written.
 *
 * A skill typo is the motivating case: the job saves, and then it matches
 * nobody, because the match score compares against the list a freelancer picks
 * from. Nothing about that failure is visible from the outside. The rest are
 * the same shape — references that resolve, money that adds up, ratings inside
 * the range the star renderer can draw.
 */
function validate() {
  const problems: string[] = [];
  const everySkill = new Set(
    CATEGORIES.flatMap((c) => SKILLS_BY_CATEGORY[c].map((s) => s.toLowerCase())),
  );
  const clientKeys = new Set(CLIENTS.map((c) => c.key));
  const freelancerKeys = new Set(FREELANCERS.map((f) => f.key));
  const openKeys = new Set(OPEN_JOBS.map((j) => j.key));

  const checkSkills = (owner: string, skills: string[]) => {
    for (const skill of skills) {
      if (!everySkill.has(skill.toLowerCase())) {
        problems.push(`${owner} lists "${skill}", which is in no category`);
      }
    }
  };

  const seen = new Set<string>();
  for (const job of ALL_JOBS) {
    if (seen.has(job.key)) problems.push(`two jobs share the key "${job.key}"`);
    seen.add(job.key);

    checkSkills(`job "${job.title}"`, job.skills);
    if (!clientKeys.has(job.client)) {
      problems.push(`job "${job.key}" references unknown client "${job.client}"`);
    }
    const total = job.milestones.reduce((t, m) => t + m.amountCents, 0);
    if (total !== job.budgetCents) {
      problems.push(
        `"${job.title}" milestones total ${total} but the budget is ${job.budgetCents}`,
      );
    }
    // A completed contract needs both halves: somebody did the work, and
    // somebody said how it went. One without the other is a rating with no
    // review behind it, or a review page nobody can reach.
    if (job.hired && !freelancerKeys.has(job.hired)) {
      problems.push(`job "${job.key}" was won by unknown freelancer "${job.hired}"`);
    }
    if (Boolean(job.hired) !== Boolean(job.review)) {
      problems.push(`job "${job.key}" needs both a hired freelancer and a review, or neither`);
    }
    if (job.review && (job.review.rating < 1 || job.review.rating > 5)) {
      problems.push(`job "${job.key}" has a rating outside 1–5`);
    }
    if (job.follows) {
      const earlier = COMPLETED_JOBS.find((j) => j.key === job.follows);
      if (!earlier) {
        problems.push(`job "${job.key}" follows "${job.follows}", which is not a completed contract`);
      } else if (earlier.follows) {
        // One level only: the date is derived recursively, and a cycle would
        // hang the seed rather than fail it.
        problems.push(`job "${job.key}" follows "${job.follows}", which itself follows something`);
      } else if (earlier.client !== job.client || earlier.hired !== job.hired) {
        problems.push(`job "${job.key}" follows a contract with a different client or freelancer`);
      }
    }
  }

  for (const client of CLIENTS) checkSkills(`client ${client.key}`, client.hires);
  for (const person of FREELANCERS) checkSkills(`freelancer ${person.key}`, person.skills);

  for (const bid of BIDS) {
    if (!openKeys.has(bid.job)) {
      problems.push(`bid references "${bid.job}", which is not an open job`);
    }
    if (!freelancerKeys.has(bid.freelancer)) {
      problems.push(`bid on "${bid.job}" is from unknown freelancer "${bid.freelancer}"`);
    }
  }
  const bidPairs = new Set<string>();
  for (const bid of BIDS) {
    const pair = `${bid.job}/${bid.freelancer}`;
    if (bidPairs.has(pair)) problems.push(`${bid.freelancer} bids twice on ${bid.job}`);
    bidPairs.add(pair);
  }

  // Every freelancer should be findable, and a directory entry with no work
  // history and no bids is a profile nobody has a reason to open.
  for (const person of FREELANCERS) {
    const active = BIDS.some((b) => b.freelancer === person.key)
      || ALL_JOBS.some((j) => j.hired === person.key);
    if (!active) problems.push(`freelancer ${person.key} has neither a bid nor a contract`);
  }

  if (problems.length > 0) {
    throw new Error(`Seed data is inconsistent:\n  - ${problems.join('\n  - ')}`);
  }
}

/* ── writers ─────────────────────────────────────────────────────────────── */

async function seedClient(c: SeedClient) {
  const user = await db.user.upsert({
    where: { email: email(c.key) },
    create: {
      email: email(c.key),
      username: `${SEED_PREFIX}${c.key}`,
      displayName: c.displayName,
      role: 'CLIENT' as Role,
      // No passwordHash: these are display accounts, not sign-in-able ones.
      // Leaving it null means signInAction refuses them outright.
      passwordHash: null,
      idSubmitted: true,
      depositPaid: true,
      depositCents: 0,
      depositKind: 'POSTING_BALANCE',
      kycStage: 'VERIFIED',
      postingBalanceCents: 5_000_00,
      createdAt: daysAgo(joinedDaysAgo(c.key)),
    },
    update: { displayName: c.displayName, createdAt: daysAgo(joinedDaysAgo(c.key)) },
    select: { id: true },
  });
  ids.set(c.key, user.id);

  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      headline: c.headline, bio: c.bio, location: c.location,
      category: c.category, skills: c.hires, verified: true,
    },
    update: {
      headline: c.headline, bio: c.bio, location: c.location,
      category: c.category, skills: c.hires, verified: true,
    },
  });
}

/**
 * A freelancer who will appear in the talent directory.
 *
 * `Profile.verified` is what puts them there, and in the real product it is
 * written only by the server on the verification path — which is exactly what
 * this is standing in for. The account still cannot sign in.
 */
async function seedFreelancer(f: SeedFreelancer) {
  const user = await db.user.upsert({
    where: { email: email(f.key) },
    create: {
      email: email(f.key),
      username: `${SEED_PREFIX}${f.key}`,
      displayName: f.displayName,
      role: 'FREELANCER' as Role,
      passwordHash: null,
      idSubmitted: true,
      depositPaid: true,
      depositCents: TRUST_BOND_CENTS,
      depositKind: 'TRUST_BOND',
      kycStage: 'VERIFIED',
      createdAt: daysAgo(joinedDaysAgo(f.key)),
    },
    update: { displayName: f.displayName, createdAt: daysAgo(joinedDaysAgo(f.key)) },
    select: { id: true },
  });
  ids.set(f.key, user.id);
  const id = user.id;

  await db.profile.upsert({
    where: { userId: id },
    create: {
      userId: id,
      headline: f.headline, bio: f.bio, location: f.location,
      category: f.category, skills: f.skills, languages: f.languages,
      hourlyRateCents: f.hourlyRateCents, portfolioUrl: f.portfolioUrl ?? null,
      experience: f.experience, verified: true,
    },
    update: {
      headline: f.headline, bio: f.bio, location: f.location,
      category: f.category, skills: f.skills, languages: f.languages,
      hourlyRateCents: f.hourlyRateCents, portfolioUrl: f.portfolioUrl ?? null,
      experience: f.experience, verified: true,
    },
  });
}

/**
 * Milestones, with deterministic ids.
 *
 * They used to be deleted and recreated on every run, which meant a completed
 * contract's released milestones had to be exempted, and any milestone whose
 * label changed came back as a new row with new money attached. Keying them on
 * the job and position makes the write an upsert and the whole thing boring.
 */
async function seedMilestones(job: SeedJob, id: string, done: boolean) {
  const ids = job.milestones.map((_, position) => `${id}-m${position}`);
  const finished = finishedDaysAgo(job.key);

  // Anything left over from a previous shape of this job. Scoped to a seed
  // job, so this can never touch a milestone somebody actually created.
  await db.milestone.deleteMany({ where: { jobId: id, id: { notIn: ids } } });

  for (const [position, m] of job.milestones.entries()) {
    const data = {
      jobId: id, label: m.label, amountCents: m.amountCents, position,
      funded: done, fundedAt: done ? daysAgo(finished + job.durationDays) : null,
      released: done, releasedAt: done ? daysAgo(finished) : null,
    };
    await db.milestone.upsert({
      where: { id: ids[position] },
      create: { id: ids[position], ...data },
      update: data,
    });
  }
}

async function seedJob(job: SeedJob) {
  const id = jobId(job.key);
  const done = Boolean(job.hired);
  const shared = {
    ownerId: userId(job.client),
    title: job.title, description: job.description, category: job.category,
    skills: job.skills, budgetCents: job.budgetCents,
    durationDays: job.durationDays,
    status: done ? ('CLOSED' as const) : ('OPEN' as const),
    escrowHeldCents: 0,
    createdAt: daysAgo(done
      ? finishedDaysAgo(job.key) + job.durationDays + 4
      : postedDaysAgo(job.key)),
  };

  await db.job.upsert({
    where: { id },
    create: { id, ...shared },
    update: shared,
  });

  await seedMilestones(job, id, done);
}

/** A live bid: visible as a count and an applicant, never as an amount. */
async function seedBid(bid: {
  job: string; freelancer: string; bidCents: number;
  timelineDays: number; note: string;
}) {
  const id = proposalId(bid.job, bid.freelancer);
  // Somewhere between the job being posted and today, never before it.
  const posted = postedDaysAgo(bid.job);
  const shared = {
    jobId: jobId(bid.job),
    freelancerId: userId(bid.freelancer),
    bidCents: bid.bidCents,
    note: bid.note,
    timelineDays: bid.timelineDays,
    status: 'SUBMITTED' as const,
    createdAt: daysAgo(posted - (hash(`${bid.job}-${bid.freelancer}`) % posted)),
  };
  await db.proposal.upsert({
    where: { id },
    create: { id, ...shared },
    update: shared,
  });
}

/**
 * A finished contract: the winning bid, the review, and the money.
 *
 * The amounts follow the release action exactly — gross per milestone, 1%
 * platform fee, the rest to the freelancer — so the earnings on these profiles
 * are the numbers the product itself would have produced rather than a
 * flattering round figure.
 */
async function seedContract(job: SeedJob) {
  if (!job.hired || !job.review) return;
  const id = proposalId(job.key, job.hired);
  const jid = jobId(job.key);
  const freelancerId = userId(job.hired);
  const finished = finishedDaysAgo(job.key);

  const shared = {
    jobId: jid,
    freelancerId,
    // The accepted price. Milestones sum to it, which is what makes the
    // milestone list on a filled job equal to the winning bid.
    bidCents: job.budgetCents,
    note:
      'Accepted. The scope, milestones and delivery dates below are what we '
      + 'agreed at the start of this contract.',
    timelineDays: job.durationDays,
    status: 'COMPLETED' as const,
    createdAt: daysAgo(finished + job.durationDays + 2),
  };
  await db.proposal.upsert({
    where: { id },
    create: { id, ...shared },
    update: shared,
  });

  await db.job.update({ where: { id: jid }, data: { hiredProposalId: id } });

  const reviewId = `${SEED_PREFIX}review-${job.key}`;
  const review = {
    jobId: jid,
    authorId: userId(job.client),
    subjectId: freelancerId,
    rating: job.review.rating,
    comment: job.review.comment,
    // A day or two after the final milestone was released, never before it.
    createdAt: daysAgo(Math.max(1, finished - 1)),
  };
  await db.review.upsert({
    where: { id: reviewId },
    create: { id: reviewId, ...review },
    update: review,
  });
}

/**
 * Counters, recomputed from the rows that justify them.
 *
 * `Job.proposalsCount`, `Profile.ratingAvg` and `User.totalEarnedCents` are
 * all denormalised, and all three are *set* here rather than incremented — an
 * increment would double on the second run, and a seed that is only correct
 * the first time is worse than no seed.
 */
async function reconcile() {
  for (const job of ALL_JOBS) {
    const id = jobId(job.key);
    const proposalsCount = await db.proposal.count({ where: { jobId: id } });
    await db.job.update({ where: { id }, data: { proposalsCount } });
  }

  for (const person of FREELANCERS) {
    const id = userId(person.key);

    const reviews = await db.review.findMany({
      where: { subjectId: id },
      select: { rating: true },
    });
    const ratingCount = reviews.length;
    const ratingAvg = ratingCount === 0
      ? null
      : reviews.reduce((t, r) => t + r.rating, 0) / ratingCount;

    // Same arithmetic as releaseMilestone: gross less 1%, per milestone.
    const earned = ALL_JOBS
      .filter((j) => j.hired === person.key)
      .flatMap((j) => j.milestones)
      .reduce((total, m) => total + m.amountCents - platformFee(m.amountCents), 0);

    const bondReturned = earned > 0;
    await db.user.update({
      where: { id },
      data: {
        totalEarnedCents: earned,
        // The trust bond comes back after the first completed job, which is
        // what was promised when it was taken.
        depositReleased: bondReturned,
        walletBalanceCents: earned + (bondReturned ? TRUST_BOND_CENTS : 0),
      },
    });
    await db.profile.update({
      where: { userId: id },
      data: { ratingAvg, ratingCount },
    });
  }
}

/* ── dates ───────────────────────────────────────────────────────────────── */

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/** Stable pseudo-random from a key, so a re-run does not shuffle the board. */
function hash(key: string): number {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h;
}

/**
 * How long ago a job was posted — spread across three weeks, so the board does
 * not read as though every listing appeared in the same second. That is the
 * tell that data is fake.
 */
const postedDaysAgo = (key: string) => 1 + (hash(key) % 21);

/**
 * How long ago a completed contract was released.
 *
 * The first version released every one of them five days ago, which put the
 * same date on every review in the product — thirteen contracts finishing in
 * the same week, and two reviews on one profile both reading "4 days ago".
 * Spread over seven months instead, so a work history looks like one.
 *
 * `follows` pins the order where a review refers to an earlier one. Derived
 * from a hash, the sequence held by accident; a repeat client saying "second
 * engagement" above the review it was second to is the kind of detail that
 * gives sample data away.
 */
function finishedDaysAgo(key: string): number {
  const job = COMPLETED_JOBS.find((j) => j.key === key);
  if (job?.follows) {
    // More recent than the contract it came after, by one to three months.
    return Math.max(5, finishedDaysAgo(job.follows) - (30 + (hash(`gap-${key}`) % 60)));
  }
  return 40 + (hash(`done-${key}`) % 200);
}

/**
 * How long ago an account joined.
 *
 * This was missed the first time and the profile card said "On Felicek 5
 * minutes ago" underneath a job posted three weeks earlier. Nobody reads that
 * as a new client; they read it as a fake one. Six to thirty months back,
 * which is old enough to have the work history these accounts carry.
 */
const joinedDaysAgo = (key: string) => 180 + (hash(`joined-${key}`) % 730);

/* ────────────────────────────────────────────────────────────────────────── */

async function main() {
  noteTarget();
  validate();

  for (const client of CLIENTS) {
    await seedClient(client);
    console.log(`  client      ${client.displayName}`);
  }
  for (const person of FREELANCERS) {
    await seedFreelancer(person);
    console.log(`  freelancer  ${person.displayName}`);
  }
  for (const job of ALL_JOBS) {
    await seedJob(job);
  }
  for (const bid of BIDS) {
    await seedBid(bid);
  }
  for (const job of COMPLETED_JOBS) {
    await seedContract(job);
  }
  await reconcile();

  const byCategory = new Map<string, number>();
  for (const job of OPEN_JOBS) {
    byCategory.set(job.category, (byCategory.get(job.category) ?? 0) + 1);
  }
  console.log(`\n${OPEN_JOBS.length} open jobs across ${byCategory.size} categories:`);
  for (const [category, n] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}  ${category}`);
  }
  console.log(
    `\n${FREELANCERS.length} freelancers · ${BIDS.length} live bids · `
    + `${COMPLETED_JOBS.length} completed contracts with reviews`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(`\nSeed failed: ${error instanceof Error ? error.message : error}`);
    await db.$disconnect();
    process.exit(1);
  });
