import type { SeedJob } from './seed-types';

/**
 * Contracts that already finished.
 *
 * Without these the marketplace has no past: every profile reads "No reviews
 * yet", every freelancer has earned nothing, and the whole board looks like it
 * opened this morning. A rating cannot be invented directly either — the
 * profile page lists the actual Review rows next to the average, so a number
 * with no rows behind it would contradict itself on screen.
 *
 * So each of these is a real completed contract: the job closes, one
 * freelancer's proposal is marked COMPLETED, every milestone is funded and
 * released through the same arithmetic the release action uses, and the client
 * leaves one review. The ratings come out of those rows rather than being
 * declared.
 *
 * They are shorter than the open postings on purpose. A finished job is a
 * record, not a pitch.
 */
export const COMPLETED_JOBS: SeedJob[] = [
  {
    key: 'past-vision-yield-inspection',
    client: 'lumen-manufacturing',
    title: 'Surface finish classification on line 2',
    category: 'AI & Machine Learning',
    skills: ['PyTorch', 'Computer Vision', 'Model Deployment'],
    budgetCents: 310_000,
    durationDays: 28,
    hired: 'arif-hossain',
    description:
      'A first, deliberately narrow vision project: one production line, one '
      + 'defect type, to find out whether this approach was worth extending '
      + 'before committing to it.\n\n'
      + 'Delivered running on the line PC, with the evaluation done on a week '
      + 'of images the model had never seen.',
    milestones: [
      { label: 'Data review and baseline', amountCents: 62_000 },
      { label: 'Trained model meeting the recall target', amountCents: 155_000 },
      { label: 'Deployment on line hardware', amountCents: 93_000 },
    ],
    review: {
      rating: 5,
      comment:
        'Told us in the first week that a third of our "defect" labels were '
        + 'inconsistent, which was not what we wanted to hear and was the '
        + 'reason the project worked. Delivered under the latency budget and '
        + 'the operators have not switched it off, which is the highest '
        + 'compliment available here.',
    },
  },
  {
    key: 'past-parts-label-ocr',
    client: 'lumen-manufacturing',
    title: 'OCR for part labels and batch codes',
    category: 'AI & Machine Learning',
    skills: ['Computer Vision', 'PyTorch', 'ONNX', 'Python'],
    budgetCents: 190_000,
    durationDays: 21,
    hired: 'arif-hossain',
    follows: 'past-vision-yield-inspection',
    description:
      'Reading stamped batch codes off aluminium under varying light, to '
      + 'replace a clipboard. Low contrast, curved surfaces, and codes that '
      + 'are sometimes half worn away.',
    milestones: [
      { label: 'Capture setup and dataset', amountCents: 57_000 },
      { label: 'Model and confidence thresholding', amountCents: 76_000 },
      { label: 'Integration and handover', amountCents: 57_000 },
    ],
    review: {
      rating: 5,
      comment:
        'Second engagement with Arif. Argued for fixing the lighting rig '
        + 'before touching the model, which cost £400 and removed most of the '
        + 'problem. Reads the codes better than our people do at the end of a '
        + 'shift.',
    },
  },
  {
    key: 'past-support-intent-classifier',
    client: 'shomoy-telecom',
    title: 'Intent classification for Bengali support tickets',
    category: 'AI & Machine Learning',
    skills: ['NLP', 'Hugging Face', 'LLM Fine-tuning', 'Model Evaluation'],
    budgetCents: 340_000,
    durationDays: 32,
    hired: 'priya-raman',
    description:
      'Routing incoming tickets to the right queue, across Bengali script, '
      + 'romanised Bengali and English. Replaced a keyword rule set that had '
      + 'grown to 600 lines and misrouted about a fifth of everything.',
    milestones: [
      { label: 'Label taxonomy and evaluation set', amountCents: 85_000 },
      { label: 'Fine-tuned classifier', amountCents: 170_000 },
      { label: 'Deployment and monitoring', amountCents: 85_000 },
    ],
    review: {
      rating: 5,
      comment:
        'Built the evaluation set with our support leads before training '
        + 'anything, which we initially thought was a delay and turned out to '
        + 'be the reason we could tell the model was good. Brought in a '
        + 'Bengali annotator at her own cost when she judged her reading was '
        + 'not enough.',
    },
  },
  {
    key: 'past-summarisation-eval',
    client: 'meridian-labs',
    title: 'Evaluation harness for a summarisation fine-tune',
    category: 'AI Research & Evaluation',
    skills: ['Model Evaluation', 'Benchmark Design', 'LLM Fine-tuning'],
    budgetCents: 265_000,
    durationDays: 26,
    hired: 'priya-raman',
    description:
      'A rerunnable harness for judging summarisation quality on our corpus, '
      + 'including faithfulness to the source rather than only fluency.',
    milestones: [
      { label: 'Criteria and rubric with our reviewers', amountCents: 79_500 },
      { label: 'Harness and baseline scores', amountCents: 132_500 },
      { label: 'CI integration and documentation', amountCents: 53_000 },
    ],
    review: {
      rating: 4,
      comment:
        'Good, careful work and the harness is still in our CI. Marked down '
        + 'only because the last milestone ran about a week over — flagged '
        + 'early and explained, but it did move a deadline of ours.',
    },
  },
  {
    key: 'past-warehouse-migration',
    client: 'northwind-data',
    title: 'Redshift to Snowflake migration for the reporting layer',
    category: 'Data Engineering',
    skills: ['Snowflake', 'Redshift', 'dbt', 'ETL', 'Data Modelling'],
    budgetCents: 520_000,
    durationDays: 55,
    hired: 'tomasz-wieczorek',
    description:
      'Moving the reporting warehouse without a reporting outage: dual writes, '
      + 'a reconciliation period where both were live, then a cutover.',
    milestones: [
      { label: 'Model inventory and migration plan', amountCents: 104_000 },
      { label: 'dbt models rebuilt and reconciled', amountCents: 260_000 },
      { label: 'Cutover and decommission', amountCents: 156_000 },
    ],
    review: {
      rating: 5,
      comment:
        'Ran the two warehouses side by side for three weeks and found eleven '
        + 'places where the numbers disagreed — every one of them a bug we had '
        + 'been reporting to customers for years. Cutover was a non-event, '
        + 'which was the point.',
    },
  },
  {
    key: 'past-cdc-replication',
    client: 'northwind-data',
    title: 'Change-data-capture replication from 12 client databases',
    category: 'Data Engineering',
    skills: ['Kafka', 'PostgreSQL', 'ETL', 'Data Quality'],
    budgetCents: 385_000,
    durationDays: 40,
    hired: 'tomasz-wieczorek',
    description:
      'Replacing nightly full extracts with change capture, for the twelve '
      + 'clients whose databases we are allowed to read directly.',
    milestones: [
      { label: 'Connector design and pilot on two sources', amountCents: 96_000 },
      { label: 'Rollout to all twelve', amountCents: 192_500 },
      { label: 'Monitoring, replay and runbook', amountCents: 96_500 },
    ],
    review: {
      rating: 5,
      comment:
        'Handled the awkward part well: two of the twelve could not support '
        + 'logical replication and he said so rather than forcing it, and left '
        + 'those on the old extract with a documented reason. Freshness went '
        + 'from overnight to under a minute for the other ten.',
    },
  },
  {
    key: 'past-safety-eval-harness',
    client: 'meridian-labs',
    title: 'Refusal and jailbreak evaluation on two model checkpoints',
    category: 'AI Research & Evaluation',
    skills: ['Red-teaming', 'Model Evaluation', 'Benchmark Design', 'Bias Auditing'],
    budgetCents: 430_000,
    durationDays: 34,
    hired: 'nadia-benali',
    description:
      'Independent evaluation of refusal behaviour before and after a '
      + 'preference-tuning stage, with every attack reproducible.',
    milestones: [
      { label: 'Threat model and attack set', amountCents: 107_500 },
      { label: 'Evaluation across both checkpoints', amountCents: 215_000 },
      { label: 'Report and rerunnable harness', amountCents: 107_500 },
    ],
    review: {
      rating: 5,
      comment:
        'Found a refusal regression our own benchmarks had missed entirely — '
        + 'the tuned model was more agreeable and that made it easier to talk '
        + 'out of a refusal. Reported it plainly, with the prompts and seeds, '
        + 'and did not soften it. Exactly what we hire an external evaluator '
        + 'for.',
    },
  },
  {
    key: 'past-pricing-experiment-review',
    client: 'aurora-fintech',
    title: 'Independent review of four pricing experiments',
    category: 'Data Science & Analytics',
    skills: ['A/B Testing', 'Statistics', 'Causal Inference', 'SQL'],
    budgetCents: 175_000,
    durationDays: 18,
    hired: 'sofia-navarro',
    description:
      'A second reading of four pricing tests we had already acted on, '
      + 'covering power, multiple comparisons and whether randomisation held.',
    milestones: [
      { label: 'Data and assignment audit', amountCents: 70_000 },
      { label: 'Re-analysis and written findings', amountCents: 105_000 },
    ],
    review: {
      rating: 4,
      comment:
        'Told us two of the four were underpowered and one had broken '
        + 'randomisation, which was uncomfortable and correct. The write-up '
        + 'was more technical than our commercial team could use without a '
        + 'translation layer — worth asking for a plain-language summary up '
        + 'front, which she provided when we asked.',
    },
  },
  {
    key: 'past-revenue-cohorts',
    client: 'aurora-fintech',
    title: 'Cohort revenue model and retention curves',
    category: 'Data Science & Analytics',
    skills: ['Python', 'SQL', 'Forecasting', 'Time Series'],
    budgetCents: 230_000,
    durationDays: 24,
    hired: 'sofia-navarro',
    follows: 'past-pricing-experiment-review',
    description:
      'Cohort-level retention and expansion curves feeding the revenue '
      + 'forecast, replacing a spreadsheet nobody could reconstruct.',
    milestones: [
      { label: 'Cohort definitions and data model', amountCents: 92_000 },
      { label: 'Curves, backtest and handover', amountCents: 138_000 },
    ],
    review: {
      rating: 5,
      comment:
        'Second engagement, and we took her advice about the plain-language '
        + 'summary this time. The backtest showing our old forecast error was '
        + 'humbling and is now on the front page of the dashboard.',
    },
  },
  {
    key: 'past-policy-doc-search',
    client: 'shomoy-telecom',
    title: 'Retrieval over internal policy documents',
    category: 'AI & Machine Learning',
    skills: ['RAG', 'Vector Databases', 'Python', 'Prompt Engineering'],
    budgetCents: 275_000,
    durationDays: 30,
    hired: 'daniel-okoye',
    description:
      'Search and answering over roughly 4,000 internal policy and procedure '
      + 'documents, for staff who currently ask a colleague.',
    milestones: [
      { label: 'Ingestion and retrieval baseline', amountCents: 82_500 },
      { label: 'Reranking and citation enforcement', amountCents: 137_500 },
      { label: 'Deployment and evaluation', amountCents: 55_000 },
    ],
    review: {
      rating: 4,
      comment:
        'The system works and the citations are reliable, which was the '
        + 'requirement. Communication was thin in the middle stretch — a week '
        + 'went by without an update and we had to ask. Quality of the work '
        + 'itself was not in question.',
    },
  },
  {
    key: 'past-ivr-transcription-pilot',
    client: 'shomoy-telecom',
    title: 'Transcription pilot on 200 hours of recorded calls',
    category: 'AI & Machine Learning',
    skills: ['Speech Recognition', 'PyTorch', 'NLP'],
    budgetCents: 210_000,
    durationDays: 22,
    hired: 'mei-lin-chow',
    description:
      'A sized pilot to find out what word error rate was achievable on our '
      + 'audio before committing to the full archive.',
    milestones: [
      { label: 'Manual reference transcription and baseline', amountCents: 84_000 },
      { label: 'Tuned pipeline and per-language WER', amountCents: 126_000 },
    ],
    review: {
      rating: 5,
      comment:
        'Reported the numbers broken out by language and by code-switched '
        + 'spans without being asked, which changed our decision — the average '
        + 'looked fine and the code-switched portion did not. Scoped the pilot '
        + 'so that a bad result would still have been worth paying for.',
    },
  },
  {
    key: 'past-model-registry',
    client: 'lumen-manufacturing',
    title: 'Model registry and reproducible retraining',
    category: 'AI & Machine Learning',
    skills: ['MLOps', 'Docker', 'Model Deployment', 'Python'],
    budgetCents: 245_000,
    durationDays: 25,
    hired: 'rahul-verma',
    description:
      'Version every model, tie every prediction to the weights that produced '
      + 'it, and make retraining a command rather than an afternoon.',
    milestones: [
      { label: 'Registry and versioning scheme', amountCents: 98_000 },
      { label: 'Retraining pipeline with snapshots', amountCents: 98_000 },
      { label: 'Rollback and documentation', amountCents: 49_000 },
    ],
    review: {
      rating: 4,
      comment:
        'Solid infrastructure work, delivered on time, and the rollback has '
        + 'already been used once in anger. The documentation assumed more AWS '
        + 'familiarity than our team has; he rewrote the runbook after we said '
        + 'so, which is why this is not a lower score.',
    },
  },
  {
    key: 'past-internal-admin-tool',
    client: 'aurora-fintech',
    title: 'Internal review tool for the risk team',
    category: 'Development & IT',
    skills: ['TypeScript', 'React', 'PostgreSQL', 'Node.js'],
    budgetCents: 265_000,
    durationDays: 30,
    hired: 'yusuf-karaman',
    description:
      'The interface around our churn scores: a queue the risk team works '
      + 'through, with the reasons behind each score and somewhere to record '
      + 'what they did about it.',
    milestones: [
      { label: 'Flows agreed with the risk team', amountCents: 53_000 },
      { label: 'Queue, scoring detail and audit trail', amountCents: 159_000 },
      { label: 'Access control and handover', amountCents: 53_000 },
    ],
    review: {
      rating: 5,
      comment:
        'Sat with the risk team for two days before writing anything and came '
        + 'back with a simpler design than the one we had specified. The audit '
        + 'trail he insisted on has since answered a compliance question we '
        + 'could not otherwise have answered.',
    },
  },
];
