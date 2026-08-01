import type { SeedClient, SeedJob } from './seed-types';

/** The two companies posting the applied-AI work below. */
export const AI_CLIENTS: SeedClient[] = [
  {
    key: 'lumen-manufacturing',
    displayName: 'Lumen Manufacturing (sample)',
    headline: 'Aluminium extrusion, four production lines',
    bio:
      'We make extruded aluminium profiles for construction and automotive '
      + 'customers. We are not a software company and we are not pretending to '
      + 'become one — we have one data scientist and a lot of process data, and '
      + 'we bring in specialists for the pieces we cannot staff.',
    location: 'Leeds, United Kingdom',
    category: 'AI & Machine Learning',
    hires: ['PyTorch', 'Computer Vision', 'MLOps', 'Model Deployment', 'RAG'],
  },
  {
    key: 'shomoy-telecom',
    displayName: 'Shomoy Telecom (sample)',
    headline: 'Mobile operator, 2.3 million subscribers',
    bio:
      'A regional mobile operator. Most of our machine learning work is in '
      + 'language and recommendation, and most of it has to work in Bengali as '
      + 'well as English — which rules out a lot of off-the-shelf tooling and '
      + 'is the reason we contract rather than buy.',
    location: 'Dhaka, Bangladesh',
    category: 'AI & Machine Learning',
    hires: ['LLM Fine-tuning', 'NLP', 'Speech Recognition', 'Recommender Systems', 'PyTorch'],
  },
];

/**
 * Applied AI and machine learning work.
 *
 * The AI & Machine Learning category had no jobs at all, which made the
 * largest category on the board the emptiest. These are the jobs that category
 * exists for: fine-tuning, deployment, retrieval, recommendation and speech —
 * most of them PyTorch-shaped, because that is what the work actually uses.
 *
 * Budgets and durations are meant to be defensible rather than impressive. A
 * marketplace whose sample data is all $50k moonshots teaches freelancers to
 * expect the wrong thing.
 */
export const AI_JOBS: SeedJob[] = [
  {
    key: 'pytorch-vit-defect-detection',
    client: 'lumen-manufacturing',
    title: 'Fine-tune a PyTorch vision transformer for defect detection',
    category: 'AI & Machine Learning',
    skills: ['PyTorch', 'Computer Vision', 'Model Deployment', 'MLOps'],
    budgetCents: 580_000,
    durationDays: 42,
    description:
      'We inspect extruded aluminium on four production lines. The current '
      + 'system is a rules-based OpenCV script that catches obvious scoring and '
      + 'misses everything subtle, so a human still checks every part and the '
      + 'line runs slower than it should.\n\n'
      + 'We have 90,000 labelled images — about 4% defective, across seven '
      + 'defect classes. The class imbalance is real and we would rather hear '
      + 'how you plan to handle it than see a headline accuracy number.\n\n'
      + 'Scope:\n'
      + '• Fine-tune a vision transformer in PyTorch; we are not attached to a '
      + 'specific backbone, we are attached to recall on the rare classes\n'
      + '• Report per-class precision and recall, not overall accuracy — at 4% '
      + 'positives, a model that predicts "fine" every time scores 96%\n'
      + '• Export to ONNX and hit under 40ms per image on the line PC '
      + '(RTX A2000, no internet access)\n'
      + '• A retraining script our engineer can run when we add a defect class\n\n'
      + 'Done means: measured against a held-out week of production images we '
      + 'have not shown you, beating the current script on recall without '
      + 'tripling false positives — the operators will switch it off if it '
      + 'cries wolf.',
    milestones: [
      { label: 'Data review, baseline and evaluation protocol agreed', amountCents: 116_000 },
      { label: 'Trained model meeting per-class recall targets', amountCents: 232_000 },
      { label: 'ONNX export and latency target on the line hardware', amountCents: 145_000 },
      { label: 'Retraining script and handover', amountCents: 87_000 },
    ],
  },
  {
    key: 'rag-support-assistant',
    client: 'lumen-manufacturing',
    title: 'Production RAG assistant over 12 years of technical documentation',
    category: 'AI & Machine Learning',
    skills: ['RAG', 'Vector Databases', 'LangChain', 'Prompt Engineering', 'Python'],
    budgetCents: 440_000,
    durationDays: 35,
    description:
      'Our field engineers carry a 900-page manual and phone the office when '
      + 'it does not cover their machine. We want them asking a question and '
      + 'getting an answer with the page it came from.\n\n'
      + 'The corpus is about 12 years of manuals, service bulletins and '
      + 'internal wiki pages. Some of it contradicts itself, because the '
      + 'machines changed and the documents did not.\n\n'
      + 'Scope:\n'
      + '• Ingestion and chunking that survives tables and diagrams — most of '
      + 'the useful content is in tables, and naive chunking destroys them\n'
      + '• Retrieval with reranking, and a hard requirement that every answer '
      + 'cites the document and page it came from\n'
      + '• Refusal when the corpus does not contain the answer. An engineer '
      + 'under a machine acting on a confident guess is the outcome we are '
      + 'paying to avoid\n'
      + '• Handling of superseded documents, so a 2014 bulletin does not '
      + 'outrank the 2023 one that replaced it\n\n'
      + 'Done means: 100 real questions from our support inbox, answered with '
      + 'correct citations or an honest "not in the documentation".',
    milestones: [
      { label: 'Ingestion pipeline and chunking strategy', amountCents: 110_000 },
      { label: 'Retrieval with reranking and citation enforcement', amountCents: 176_000 },
      { label: 'Refusal behaviour and document recency handling', amountCents: 110_000 },
      { label: 'Evaluation on the 100-question set, and deployment', amountCents: 44_000 },
    ],
  },
  {
    key: 'llm-finetune-bengali-support',
    client: 'shomoy-telecom',
    title: 'LLM fine-tuning and evaluation for Bengali customer support',
    category: 'AI & Machine Learning',
    skills: ['LLM Fine-tuning', 'NLP', 'Hugging Face', 'Model Evaluation', 'PyTorch'],
    budgetCents: 660_000,
    durationDays: 50,
    description:
      'We handle roughly 40,000 support conversations a month, most of them in '
      + 'Bengali, a good share of them code-switched with English. Off-the-shelf '
      + 'models handle the English and fall apart on the rest, particularly on '
      + 'transliterated Bengali written in Latin script — which is how most of '
      + 'our customers actually type.\n\n'
      + 'Scope:\n'
      + '• Fine-tune an open-weights model on our transcripts (we will supply '
      + '~200k anonymised conversations) for intent classification and reply '
      + 'drafting\n'
      + '• Handle both Bengali script and romanised Bengali; a model that only '
      + 'works on one of them is not useful to us\n'
      + '• Evaluation set built with our support leads, scored by them, not by '
      + 'another model\n'
      + '• Quantised deployment that runs on a single A10 — we cannot justify '
      + 'a fleet of GPUs for this\n\n'
      + 'The replies are drafts for a human to send, not autonomous responses, '
      + 'so we care more about being wrong in obvious ways than being wrong '
      + 'rarely and subtly.\n\n'
      + 'Bengali fluency matters here. You cannot evaluate this work without it.',
    milestones: [
      { label: 'Data preparation and evaluation set with support leads', amountCents: 132_000 },
      { label: 'Fine-tuned model, intent classification benchmarked', amountCents: 231_000 },
      { label: 'Reply drafting quality scored by the support team', amountCents: 198_000 },
      { label: 'Quantisation, single-GPU deployment and handover', amountCents: 99_000 },
    ],
  },
  {
    key: 'recommender-pytorch-rebuild',
    client: 'shomoy-telecom',
    title: 'Recommender system rebuild in PyTorch with implicit feedback',
    category: 'AI & Machine Learning',
    skills: ['PyTorch', 'Recommender Systems', 'Python', 'MLOps', 'A/B Testing'],
    budgetCents: 520_000,
    durationDays: 45,
    description:
      'Our add-on recommendations are a hand-written rules table from 2019. It '
      + 'recommends the same three products to almost everyone, and the '
      + 'conversion rate says customers have noticed.\n\n'
      + 'We have implicit signals only — views, purchases, plan changes — for '
      + 'about 2.3 million subscribers. No ratings, and we are not going to '
      + 'start asking for them.\n\n'
      + 'Scope:\n'
      + '• A PyTorch model over implicit feedback; we are open on the approach '
      + 'and we do want to hear why you chose it\n'
      + '• Cold start for new subscribers, which is a third of our traffic in '
      + 'any given month — the rules table is at least not useless here, so '
      + 'beating it is the bar\n'
      + '• Offline evaluation, then an online A/B test design we can actually '
      + 'run, with the sample size worked out in advance\n'
      + '• Serving under 80ms at the 99th percentile\n\n'
      + 'Done means the A/B test is live and correctly instrumented. We accept '
      + 'that the result may be flat — we would rather know.',
    milestones: [
      { label: 'Signal audit, offline baseline against the rules table', amountCents: 104_000 },
      { label: 'PyTorch model with cold-start handling', amountCents: 208_000 },
      { label: 'Serving layer meeting the latency target', amountCents: 130_000 },
      { label: 'A/B test design, instrumentation and launch', amountCents: 78_000 },
    ],
  },
  {
    key: 'speech-recognition-call-centre',
    client: 'shomoy-telecom',
    title: 'Speech recognition pipeline for call-centre audio',
    category: 'AI & Machine Learning',
    skills: ['Speech Recognition', 'PyTorch', 'NLP', 'Model Deployment'],
    budgetCents: 470_000,
    durationDays: 38,
    description:
      'We record every support call and nobody listens to them, because there '
      + 'are 6,000 hours a month. We want them transcribed and searchable, so '
      + 'quality assurance can sample properly instead of picking the calls '
      + 'that happen to be short.\n\n'
      + 'The audio is 8kHz telephony, frequently noisy, with two speakers who '
      + 'talk over each other. Bengali and English, often in the same sentence.\n\n'
      + 'Scope:\n'
      + '• Transcription pipeline with speaker diarisation — knowing who said '
      + 'what is most of the value\n'
      + '• Word error rate measured on a manually transcribed sample, reported '
      + 'separately for each language and for the code-switched portions, '
      + 'because one averaged number hides exactly what we need to know\n'
      + '• Batch processing of the nightly backlog within a four-hour window\n'
      + '• Redaction of card numbers and national ID numbers before storage\n\n'
      + 'That last one is not optional. Transcripts sitting in a bucket with '
      + 'card numbers in them is a worse problem than the one we started with.',
    milestones: [
      { label: 'Baseline WER on the manually transcribed sample', amountCents: 94_000 },
      { label: 'Transcription and diarisation pipeline', amountCents: 188_000 },
      { label: 'PII redaction, verified against a held-out set', amountCents: 141_000 },
      { label: 'Batch throughput target and handover', amountCents: 47_000 },
    ],
  },
  {
    key: 'mlops-models-to-production',
    client: 'lumen-manufacturing',
    title: 'MLOps: get three PyTorch models off a laptop and into production',
    category: 'AI & Machine Learning',
    skills: ['MLOps', 'Model Deployment', 'ONNX', 'PyTorch', 'Docker'],
    budgetCents: 350_000,
    durationDays: 28,
    description:
      'We have three models that work. They live in notebooks on one data '
      + 'scientist’s laptop, they are retrained by hand when someone '
      + 'remembers, and nobody can say which version produced last month’s '
      + 'numbers. That data scientist is going on leave for two months.\n\n'
      + 'Scope:\n'
      + '• Containerised inference services for all three, with a versioning '
      + 'scheme that ties a prediction to the exact model that made it\n'
      + '• A retraining pipeline that runs on a schedule and can be triggered '
      + 'manually, with the training data snapshotted\n'
      + '• Monitoring for input drift, alerting a human rather than silently '
      + 'degrading\n'
      + '• A rollback path that takes minutes, not a rebuild\n\n'
      + 'This is not glamorous work and we are not pretending otherwise. It is '
      + 'the difference between three useful models and three liabilities.\n\n'
      + 'We are on AWS. No Kubernetes unless you can argue we need it.',
    milestones: [
      { label: 'Containerised inference for all three models', amountCents: 140_000 },
      { label: 'Scheduled retraining with data snapshotting', amountCents: 105_000 },
      { label: 'Drift monitoring, alerting and rollback', amountCents: 105_000 },
    ],
  },

];
