/**
 * Sample marketplace data.
 *
 *   npm run db:seed
 *
 * Creates a handful of verified client accounts and the job posts they would
 * plausibly publish, so a fresh install has something to look at and the job
 * board, category filter and match score can be exercised against realistic
 * content rather than one hand-typed row.
 *
 * It is idempotent: everything is upserted against a deterministic key, so
 * running it twice changes nothing and it never deletes a row it did not
 * create. Seed accounts are prefixed `sample-` and their display names say
 * "(sample)", so a real freelancer browsing the board can tell which listings
 * are demonstration data and which are somebody's actual budget.
 */
import { PrismaClient, type Role } from '@prisma/client';
import { CATEGORIES, SKILLS_BY_CATEGORY, type Category } from '../src/lib/categories';

const db = new PrismaClient();

/** Marks every row this script owns, so it is obvious in the database. */
const SEED_PREFIX = 'sample-';

interface SeedClient {
  key: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  category: Category;
  hires: string[];
}

interface SeedJob {
  key: string;
  client: string;
  title: string;
  category: Category;
  skills: string[];
  budgetCents: number;
  durationDays: number;
  description: string;
  milestones: { label: string; amountCents: number }[];
}

const CLIENTS: SeedClient[] = [
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
const JOBS: SeedJob[] = [
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

/* ────────────────────────────────────────────────────────────────────────── */

function noteTarget() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) throw new Error('DATABASE_URL is not set.');
  const local = /@(localhost|127\.0\.0\.1|host\.docker\.internal|postgres)[:/]/.test(url);
  if (!local) {
    console.log(
      'Seeding a remote database. Every account and job created here is '
      + 'labelled "(sample)" so anyone browsing can tell it apart from real '
      + 'work.\n',
    );
  }
}

/**
 * Every skill on every job must exist in the taxonomy.
 *
 * A typo here is invisible — the job saves, and then it never matches anyone,
 * because the match score compares against the skill list a freelancer picked
 * from. Failing loudly at seed time is the whole point of this check.
 */
function assertSkillsAreReal() {
  const problems: string[] = [];
  const everySkill = new Set(
    CATEGORIES.flatMap((c) => SKILLS_BY_CATEGORY[c].map((s) => s.toLowerCase())),
  );

  for (const job of JOBS) {
    for (const skill of job.skills) {
      if (!everySkill.has(skill.toLowerCase())) {
        problems.push(`"${job.title}" lists "${skill}", which is in no category`);
      }
    }
    const total = job.milestones.reduce((t, m) => t + m.amountCents, 0);
    if (total !== job.budgetCents) {
      problems.push(
        `"${job.title}" milestones total ${total} but the budget is ${job.budgetCents}`,
      );
    }
  }
  for (const client of CLIENTS) {
    for (const skill of client.hires) {
      if (!everySkill.has(skill.toLowerCase())) {
        problems.push(`client ${client.key} lists "${skill}", which is in no category`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Seed data is inconsistent:\n  - ${problems.join('\n  - ')}`);
  }
}

async function seedClient(c: SeedClient) {
  const email = `${SEED_PREFIX}${c.key}@felicek.example`;

  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
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
    },
    update: { displayName: c.displayName },
    select: { id: true },
  });

  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      headline: c.headline,
      bio: c.bio,
      location: c.location,
      category: c.category,
      skills: c.hires,
      verified: true,
    },
    update: {
      headline: c.headline, bio: c.bio, location: c.location,
      category: c.category, skills: c.hires, verified: true,
    },
  });

  return user.id;
}

async function seedJob(job: SeedJob, ownerId: string) {
  const id = `${SEED_PREFIX}${job.key}`;

  // Deterministic id, so a second run updates rather than duplicating.
  const existing = await db.job.findUnique({ where: { id }, select: { id: true } });

  if (existing) {
    await db.job.update({
      where: { id },
      data: {
        title: job.title, description: job.description, category: job.category,
        skills: job.skills, budgetCents: job.budgetCents,
        durationDays: job.durationDays,
      },
    });
    // Milestones are replaced wholesale: they are owned by the seed and have
    // no proposals against them on a fresh database.
    await db.milestone.deleteMany({ where: { jobId: id, released: false, funded: false } });
  } else {
    await db.job.create({
      data: {
        id, ownerId,
        title: job.title, description: job.description, category: job.category,
        skills: job.skills, budgetCents: job.budgetCents,
        durationDays: job.durationDays, status: 'OPEN',
      },
    });
  }

  const already = await db.milestone.count({ where: { jobId: id } });
  if (already === 0) {
    await db.milestone.createMany({
      data: job.milestones.map((m, position) => ({ ...m, jobId: id, position })),
    });
  }
}

async function main() {
  noteTarget();
  assertSkillsAreReal();

  const owners = new Map<string, string>();
  for (const client of CLIENTS) {
    owners.set(client.key, await seedClient(client));
    console.log(`  client  ${client.displayName}`);
  }

  for (const job of JOBS) {
    const ownerId = owners.get(job.client);
    if (!ownerId) throw new Error(`job "${job.key}" references unknown client "${job.client}"`);
    await seedJob(job, ownerId);
    console.log(`  job     ${job.title}`);
  }

  const byCategory = new Map<string, number>();
  for (const job of JOBS) {
    byCategory.set(job.category, (byCategory.get(job.category) ?? 0) + 1);
  }
  console.log(`\n${JOBS.length} sample jobs across ${byCategory.size} categories:`);
  for (const [category, n] of byCategory) console.log(`  ${n}  ${category}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(`\nSeed failed: ${error instanceof Error ? error.message : error}`);
    await db.$disconnect();
    process.exit(1);
  });
