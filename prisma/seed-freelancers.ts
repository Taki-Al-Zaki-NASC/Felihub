import type { SeedBid, SeedFreelancer } from './seed-types';

/**
 * The people side of the marketplace.
 *
 * `/talent` was empty: a client would sign up, click "Find talent", and be
 * shown a blank page with an encouraging sentence. That is the least
 * marketplace-like thing a marketplace can do — a board of jobs with nobody to
 * do them is a noticeboard.
 *
 * These are weighted towards applied AI and data work because that is what the
 * jobs are, and a directory that does not match the board is worse than an
 * empty one. Rates are plausible for the stated location and seniority rather
 * than uniformly Californian.
 */
export const FREELANCERS: SeedFreelancer[] = [
  {
    key: 'arif-hossain',
    displayName: 'Arif Hossain (sample)',
    headline: 'Computer vision engineer — PyTorch, edge deployment',
    bio:
      'Eight years on vision systems that run on a factory floor rather than a '
      + 'benchmark. Most of my work is the unglamorous half: class imbalance, '
      + 'labelling that disagrees with itself, and getting a model under a '
      + 'latency budget on hardware nobody would choose.\n\n'
      + 'I will tell you when a problem does not need deep learning. That has '
      + 'happened twice and both clients were better off.',
    location: 'Dhaka, Bangladesh',
    category: 'AI & Machine Learning',
    skills: ['PyTorch', 'Computer Vision', 'ONNX', 'Model Deployment', 'MLOps', 'Python'],
    languages: ['Bengali', 'English'],
    hourlyRateCents: 4_500,
    portfolioUrl: 'https://example.com/arif-hossain',
    experience: [
      {
        title: 'Senior ML Engineer',
        organisation: 'Contract — industrial inspection',
        period: '2021 — present',
        summary:
          'Defect detection on production lines for four manufacturers. '
          + 'Typical engagement: 90k–400k labelled images, 2–5% positives, an '
          + 'inference budget under 50ms on a workstation GPU.',
      },
      {
        title: 'Machine Learning Engineer',
        organisation: 'Rangpur Robotics',
        period: '2018 — 2021',
        summary: 'Vision stack for automated sorting. Built the labelling '
          + 'pipeline that made the models possible in the first place.',
      },
    ],
  },
  {
    key: 'priya-raman',
    displayName: 'Priya Raman (sample)',
    headline: 'LLM fine-tuning and evaluation — Hugging Face, PyTorch',
    bio:
      'I fine-tune open-weights models and, more importantly, I measure them. '
      + 'Most fine-tuning engagements I inherit have no evaluation set at all, '
      + 'which means nobody can say whether the last three weeks helped.\n\n'
      + 'I build the evaluation first, with the people who will judge the '
      + 'output, and then train against it. Slower to start and much faster to '
      + 'finish.',
    location: 'Bengaluru, India',
    category: 'AI & Machine Learning',
    skills: ['LLM Fine-tuning', 'Hugging Face', 'PyTorch', 'NLP', 'Model Evaluation', 'RAG'],
    languages: ['English', 'Tamil', 'Hindi'],
    hourlyRateCents: 6_200,
    portfolioUrl: 'https://example.com/priya-raman',
    experience: [
      {
        title: 'Applied Research Engineer',
        organisation: 'Independent',
        period: '2022 — present',
        summary:
          'Domain fine-tunes for support, legal and clinical text. Quantised '
          + 'deployments on single-GPU hosts where the budget did not stretch '
          + 'to a fleet.',
      },
      {
        title: 'NLP Engineer',
        organisation: 'Vertex Language Systems',
        period: '2019 — 2022',
        summary: 'Intent classification and retrieval over multilingual '
          + 'support transcripts.',
      },
    ],
  },
  {
    key: 'tomasz-wieczorek',
    displayName: 'Tomasz Wieczorek (sample)',
    headline: 'Data engineer — Airflow, dbt, Snowflake, Kafka',
    bio:
      'I rebuild the pipeline that breaks every Tuesday. Usually the fix is not '
      + 'a new tool: it is idempotent loads, tests on the way in, and alerting '
      + 'that reaches a person before it reaches a customer.\n\n'
      + 'I leave a runbook written for whoever is on call at 3am and did not '
      + 'build the thing. That is part of the job, not an extra.',
    location: 'Kraków, Poland',
    category: 'Data Engineering',
    skills: ['Airflow', 'dbt', 'Snowflake', 'Kafka', 'Apache Spark', 'Data Quality', 'ETL'],
    languages: ['Polish', 'English', 'German'],
    hourlyRateCents: 5_500,
    experience: [
      {
        title: 'Freelance Data Engineer',
        organisation: 'Independent',
        period: '2020 — present',
        summary:
          'Warehouse and pipeline work for retail and fintech. Longest '
          + 'engagement: 14 months migrating a cron-and-bash loader for 40 '
          + 'sources onto Airflow and dbt with no downtime.',
      },
      {
        title: 'Data Platform Lead',
        organisation: 'Sygnal Analytics',
        period: '2016 — 2020',
        summary: 'Streaming and batch platforms on Kafka and Spark.',
      },
    ],
  },
  {
    key: 'nadia-benali',
    displayName: 'Nadia Benali (sample)',
    headline: 'Model evaluation and red-teaming',
    bio:
      'Independent evaluation: I did not build your model and I have no stake '
      + 'in it passing. Red-teaming, bias audits, reward-model review and '
      + 'benchmarks you can run in CI afterwards without me.\n\n'
      + 'I write up negative results in the same detail as positive ones. If '
      + 'the honest answer is "this is not ready", that is the deliverable.',
    location: 'Tunis, Tunisia',
    category: 'AI Research & Evaluation',
    skills: [
      'Model Evaluation', 'Red-teaming', 'Benchmark Design', 'Bias Auditing',
      'RLHF', 'Statistical Significance',
    ],
    languages: ['Arabic', 'French', 'English'],
    hourlyRateCents: 5_800,
    portfolioUrl: 'https://example.com/nadia-benali',
    experience: [
      {
        title: 'Evaluation Consultant',
        organisation: 'Independent',
        period: '2021 — present',
        summary:
          'Pre-deployment audits for fine-tuned assistants: prompt injection, '
          + 'system-prompt exfiltration, refusal bypass, demographic bias, and '
          + 'what the fine-tune made worse rather than only what it improved.',
      },
      {
        title: 'Research Engineer',
        organisation: 'Institut Numérique',
        period: '2017 — 2021',
        summary: 'Benchmark construction and reproduction studies.',
      },
    ],
  },
  {
    key: 'sofia-navarro',
    displayName: 'Sofia Navarro (sample)',
    headline: 'Data scientist — experimentation and causal inference',
    bio:
      'Experiments and forecasting, with the statistics done properly. I have '
      + 'read a lot of A/B tests that were called wins and were underpowered '
      + 'noise, and telling a client that is most of the value I add.\n\n'
      + 'I hand over the standard as well as the analysis, so the next '
      + 'experiment does not need me.',
    location: 'Valencia, Spain',
    category: 'Data Science & Analytics',
    skills: ['Python', 'SQL', 'A/B Testing', 'Causal Inference', 'Statistics', 'Forecasting'],
    languages: ['Spanish', 'English'],
    hourlyRateCents: 4_800,
    experience: [
      {
        title: 'Freelance Data Scientist',
        organisation: 'Independent',
        period: '2019 — present',
        summary:
          'Churn modelling, retention experiments and revenue forecasting for '
          + 'subscription businesses. Evaluation on forward time splits, '
          + 'because a random split on time-ordered data flatters everything.',
      },
      {
        title: 'Analytics Lead',
        organisation: 'Meridiano SaaS',
        period: '2015 — 2019',
        summary: 'Built the experimentation platform and the standard for '
          + 'reading it.',
      },
    ],
  },
  {
    key: 'daniel-okoye',
    displayName: 'Daniel Okoye (sample)',
    headline: 'RAG systems — retrieval, reranking, citations that hold up',
    bio:
      'Retrieval-augmented systems over documentation that was never written '
      + 'to be retrieved from: tables, diagrams, and twelve years of bulletins '
      + 'that contradict each other.\n\n'
      + 'Every answer cites its source, and the system refuses when the corpus '
      + 'does not contain one. A confident guess to someone working under a '
      + 'machine is the failure mode worth engineering against.',
    location: 'Lagos, Nigeria',
    category: 'AI & Machine Learning',
    skills: ['RAG', 'Vector Databases', 'LangChain', 'Prompt Engineering', 'Python', 'NLP'],
    languages: ['English', 'Igbo'],
    hourlyRateCents: 4_000,
    portfolioUrl: 'https://example.com/daniel-okoye',
    experience: [
      {
        title: 'ML Engineer, Contract',
        organisation: 'Independent',
        period: '2022 — present',
        summary:
          'Production retrieval systems over technical corpora of 10k–200k '
          + 'documents. Chunking that survives tables, reranking, and '
          + 'evaluation on real questions from a support inbox.',
      },
      {
        title: 'Backend Engineer',
        organisation: 'Kolo Systems',
        period: '2018 — 2022',
        summary: 'Search and document infrastructure.',
      },
    ],
  },
  {
    key: 'mei-lin-chow',
    displayName: 'Mei Lin Chow (sample)',
    headline: 'Speech and audio ML — ASR, diarisation, noisy telephony',
    bio:
      'Speech recognition on the audio people actually have: 8kHz telephony, '
      + 'two speakers talking over each other, code-switching mid-sentence.\n\n'
      + 'I report word error rate broken out by language and by the '
      + 'code-switched portions, because one averaged number hides exactly the '
      + 'part you needed to know about.',
    location: 'Kuala Lumpur, Malaysia',
    category: 'AI & Machine Learning',
    skills: ['Speech Recognition', 'PyTorch', 'NLP', 'Model Deployment', 'Python'],
    languages: ['English', 'Malay', 'Mandarin'],
    hourlyRateCents: 5_200,
    experience: [
      {
        title: 'Speech ML Engineer',
        organisation: 'Independent',
        period: '2020 — present',
        summary:
          'Transcription and diarisation pipelines for contact centres, '
          + 'including PII redaction before storage — which is the part that '
          + 'turns a transcript archive from a liability into an asset.',
      },
      {
        title: 'Research Engineer',
        organisation: 'Selatan Audio Lab',
        period: '2016 — 2020',
        summary: 'Acoustic modelling for low-resource languages.',
      },
    ],
  },
  {
    key: 'rahul-verma',
    displayName: 'Rahul Verma (sample)',
    headline: 'Recommender systems and MLOps — PyTorch in production',
    bio:
      'Recommendation over implicit feedback, and the plumbing that keeps it '
      + 'alive: versioning that ties a prediction to the model that made it, '
      + 'scheduled retraining, drift alerts, and a rollback that takes minutes.\n\n'
      + 'I insist on an A/B test with the sample size worked out in advance. '
      + 'I would rather find out the model is flat than ship a story about it.',
    location: 'Pune, India',
    category: 'AI & Machine Learning',
    skills: ['Recommender Systems', 'PyTorch', 'MLOps', 'A/B Testing', 'Docker', 'Python'],
    languages: ['English', 'Hindi', 'Marathi'],
    hourlyRateCents: 5_000,
    experience: [
      {
        title: 'ML Platform Consultant',
        organisation: 'Independent',
        period: '2021 — present',
        summary:
          'Taking models off laptops and into production: containerised '
          + 'inference, snapshotted retraining data, drift monitoring that '
          + 'alerts a human instead of degrading quietly.',
      },
      {
        title: 'Senior Engineer, Personalisation',
        organisation: 'Trikon Commerce',
        period: '2017 — 2021',
        summary: 'Recommendation serving at 40k requests per minute.',
      },
    ],
  },
  {
    key: 'yusuf-karaman',
    displayName: 'Yusuf Karaman (sample)',
    headline: 'Full-stack engineer — TypeScript, React, Postgres',
    bio:
      'Product engineering: the dashboard the model feeds, the API in front of '
      + 'it, and the schema underneath. A lot of ML work stalls at the point '
      + 'where somebody has to use it, and that is the part I do.',
    location: 'Istanbul, Türkiye',
    category: 'Development & IT',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    languages: ['Turkish', 'English'],
    hourlyRateCents: 4_400,
    experience: [
      {
        title: 'Freelance Engineer',
        organisation: 'Independent',
        period: '2019 — present',
        summary: 'Internal tools and customer-facing apps, mostly for teams '
          + 'shipping data or ML products.',
      },
    ],
  },
];

/**
 * Live bids on the open jobs.
 *
 * A board where every job says "0 proposals" reads as abandoned. These are
 * real Proposal rows, so the counts on the cards are counts and not decoration
 * — and the privacy boundary is exercised against a populated table rather
 * than an empty one: a freelancer browsing sees who applied, never what they
 * asked for.
 */
export const BIDS: SeedBid[] = [
  /* PyTorch defect detection — the flagship AI post, so it draws a crowd. */
  {
    job: 'pytorch-vit-defect-detection',
    freelancer: 'arif-hossain',
    bidCents: 560_000,
    timelineDays: 40,
    note:
      'I have done this exact shape of problem four times: heavy class '
      + 'imbalance, seven-ish defect classes, an inference budget on a '
      + 'workstation card. Two things I would want to settle in week one.\n\n'
      + 'First, the evaluation. Per-class recall on a held-out week is the '
      + 'right measure and I would like it agreed in writing before I train '
      + 'anything, including what false-positive rate the operators will '
      + 'tolerate — that number, not accuracy, decides whether the system stays '
      + 'switched on.\n\n'
      + 'Second, the labels. At 4% positives on 90k images, a 1% labelling '
      + 'disagreement on the rare classes is a quarter of your signal. I would '
      + 'spend the first milestone measuring that before anyone commits to a '
      + 'target.\n\n'
      + 'On the A2000 and ONNX: 40ms is comfortable for a small ViT at your '
      + 'resolution. I would rather trade a point of recall for headroom than '
      + 'ship something that only just fits.',
  },
  {
    job: 'pytorch-vit-defect-detection',
    freelancer: 'rahul-verma',
    bidCents: 598_000,
    timelineDays: 45,
    note:
      'My angle here is less the model and more what happens after it. You '
      + 'have said you want a retraining script your engineer can run when a '
      + 'defect class is added — in my experience that is where these projects '
      + 'quietly die, six months in, when nobody can reproduce the model that '
      + 'is currently running the line.\n\n'
      + 'I would build the training as a versioned pipeline from day one, with '
      + 'the data snapshotted per run, so any prediction traces back to the '
      + 'exact weights and exact images behind it. Same total effort, and you '
      + 'keep the thing after I leave.',
  },
  {
    job: 'pytorch-vit-defect-detection',
    freelancer: 'mei-lin-chow',
    bidCents: 542_000,
    timelineDays: 44,
    note:
      'Most of my work is audio rather than vision, so I will be direct about '
      + 'where I am strong and where I am not. The imbalance handling, the '
      + 'evaluation design and the ONNX export are all things I do routinely. '
      + 'A ViT backbone is not my daily driver.\n\n'
      + 'If you want someone who has shipped a dozen of these, take Arif. If '
      + 'the harder half of this job turns out to be the measurement — and on a '
      + 'four-percent positive rate it usually is — I would be glad to be '
      + 'considered.',
  },

  /* RAG assistant. */
  {
    job: 'rag-support-assistant',
    freelancer: 'daniel-okoye',
    bidCents: 428_000,
    timelineDays: 33,
    note:
      'The tables are the job. A 900-page manual where the useful content is '
      + 'in tables will be destroyed by any off-the-shelf chunker, and you will '
      + 'get a system that answers fluently and wrongly.\n\n'
      + 'My plan: parse to a structured representation first, keep table rows '
      + 'intact with their headers attached, and index the caption and the '
      + 'surrounding prose alongside. Retrieval then reranking, and the '
      + 'citation is enforced at generation — if no retrieved chunk supports a '
      + 'claim, it does not get made.\n\n'
      + 'Superseded documents I would handle with an explicit effective-date '
      + 'field rather than hoping recency ranking sorts it out. A 2014 bulletin '
      + 'outranking its 2023 replacement is a safety problem, not a relevance '
      + 'problem.',
  },
  {
    job: 'rag-support-assistant',
    freelancer: 'priya-raman',
    bidCents: 440_000,
    timelineDays: 35,
    note:
      'I would want to build the 100-question evaluation set before writing '
      + 'any retrieval code, and I would want the known-unanswerable cases in '
      + 'it from the start. Refusal is the behaviour you are actually buying '
      + 'here and it is the one nobody measures.\n\n'
      + 'Beyond that: hybrid retrieval, a cross-encoder reranker, and an answer '
      + 'that is assembled from cited spans rather than summarised freely. '
      + 'Happy to work to your budget as posted.',
  },

  /* Bengali fine-tune — the language requirement genuinely narrows this. */
  {
    job: 'llm-finetune-bengali-support',
    freelancer: 'priya-raman',
    bidCents: 645_000,
    timelineDays: 48,
    note:
      'I should say up front that my Bengali is limited — I read it, I do not '
      + 'write it well. You have said fluency matters and you are right, so I '
      + 'would propose bringing in a Bengali-speaking annotator for the '
      + 'evaluation work rather than pretending otherwise, costed inside this '
      + 'bid.\n\n'
      + 'What I bring is the training and measurement side. Romanised Bengali '
      + 'is the interesting problem: it has no standard orthography, so the '
      + 'same word arrives spelled six ways and a tokeniser trained on Bengali '
      + 'script does badly on it. I would look at vocabulary extension and '
      + 'transliteration-aware augmentation before reaching for more data.\n\n'
      + 'Single A10 with a quantised deployment is realistic for an 8B model '
      + 'at your volumes.',
  },
  {
    job: 'llm-finetune-bengali-support',
    freelancer: 'arif-hossain',
    bidCents: 620_000,
    timelineDays: 50,
    note:
      'Bengali is my first language and I have worked on romanised Bengali '
      + 'text before, which is the part of this that will consume your budget '
      + 'if it is underestimated.\n\n'
      + 'Concretely: "amar" and "aamar" and "amaar" are the same word, and the '
      + 'evaluation set has to contain that variation or the numbers will look '
      + 'better than the product. I would build the eval with your support '
      + 'leads first, in the messy form your customers actually type, and hold '
      + 'the fine-tune to it.\n\n'
      + 'Draft-for-a-human rather than autonomous replies is the right call and '
      + 'it changes what to optimise: obvious failures are recoverable, subtle '
      + 'plausible ones are not.',
  },

  /* Recommender. */
  {
    job: 'recommender-pytorch-rebuild',
    freelancer: 'rahul-verma',
    bidCents: 505_000,
    timelineDays: 42,
    note:
      'Cold start at a third of monthly traffic is the headline here, not the '
      + 'model architecture. Any reasonable implicit-feedback approach will '
      + 'beat a 2019 rules table on warm users; the question is whether it '
      + 'still beats it on the third of traffic where you have no history.\n\n'
      + 'So I would set the bar as: beat the rules table on cold users, match '
      + 'or beat it on warm, and prove both offline before we spend traffic on '
      + 'an A/B test. Sample size worked out in advance, and I will tell you '
      + 'the minimum detectable effect before we start rather than after we '
      + 'fail to find one.\n\n'
      + '80ms at p99 is fine with precomputed candidates and a light reranker.',
  },
  {
    job: 'recommender-pytorch-rebuild',
    freelancer: 'sofia-navarro',
    bidCents: 470_000,
    timelineDays: 45,
    note:
      'I am bidding on the experimentation half of this rather than the '
      + 'modelling half, and if you would rather have one person do both then I '
      + 'am the wrong bid.\n\n'
      + 'What I would bring: an A/B design that survives contact with a '
      + 'recommender — interference between arms, novelty effects that fade '
      + 'after two weeks, and the fact that conversion is a poor proxy for '
      + 'whether the recommendation was good. Those are the three things that '
      + 'make recommender tests read as wins when they are not.',
  },

  /* Speech. */
  {
    job: 'speech-recognition-call-centre',
    freelancer: 'mei-lin-chow',
    bidCents: 452_000,
    timelineDays: 35,
    note:
      '6,000 hours a month of 8kHz two-speaker telephony with code-switching '
      + 'is squarely what I do.\n\n'
      + 'The order I would work in: redaction first, then transcription '
      + 'quality. That is the reverse of how these are usually scoped, and the '
      + 'reason is that the moment the first batch lands you have an archive '
      + 'with card numbers in it, and a good WER on an archive you should not '
      + 'be keeping is not progress.\n\n'
      + 'On measurement: separate WER for Bengali, for English, and for the '
      + 'code-switched spans. A single averaged number on this audio will read '
      + 'around 20% and tell you nothing about which calls are unusable.',
  },
  {
    job: 'speech-recognition-call-centre',
    freelancer: 'daniel-okoye',
    bidCents: 465_000,
    timelineDays: 38,
    note:
      'My core strength is the search and retrieval layer — you said you want '
      + 'the calls searchable, and in my experience that half gets three days '
      + 'at the end and then nobody uses the system.\n\n'
      + 'Transcripts are not documents: they have no headings, the speaker '
      + 'changes matter, and QA wants to find "the moment the customer asked '
      + 'for a refund" rather than a keyword. I would design the index around '
      + 'that from the start, alongside the ASR work.',
  },

  /* MLOps. */
  {
    job: 'mlops-models-to-production',
    freelancer: 'rahul-verma',
    bidCents: 348_000,
    timelineDays: 26,
    note:
      'Your data scientist going on leave in two months is the real deadline, '
      + 'and it changes the order of work. I would do the versioning and the '
      + 'containerised inference first — that is what stops the models becoming '
      + 'unreproducible the day the notebooks stop being touched — and the '
      + 'drift monitoring after.\n\n'
      + 'Agreed on Kubernetes: three models on AWS does not need it, and I am '
      + 'not going to argue you into a control plane you would then have to '
      + 'operate. ECS with scheduled tasks does all of this.\n\n'
      + 'I would want two days with the data scientist before they go, '
      + 'recorded.',
  },
  {
    job: 'mlops-models-to-production',
    freelancer: 'tomasz-wieczorek',
    bidCents: 335_000,
    timelineDays: 28,
    note:
      'This is a pipeline problem wearing an ML hat, which is most of what I '
      + 'do. Snapshotted training data, scheduled retraining with backfill, '
      + 'alerting that reaches a person — same primitives as a warehouse load, '
      + 'different payload.\n\n'
      + 'One thing I would push back on: "monitoring for input drift" is easy '
      + 'to build and easy to ignore. I would rather define, with you, the two '
      + 'or three drift conditions that would actually justify waking someone '
      + 'up, and alert on only those.',
  },

  /* Data engineering and analytics — the original board should not look dead
     next to the new AI work. */
  {
    job: 'etl-airflow-snowflake',
    freelancer: 'tomasz-wieczorek',
    bidCents: 462_000,
    timelineDays: 42,
    note:
      'Forty sources each with its own idea of a CSV, loaded by a cron job '
      + 'written by someone who left — I have taken over this exact system '
      + 'twice.\n\n'
      + 'The part I would insist on is the idempotency, early. Re-running '
      + 'yesterday must not double-count, and until that is true you cannot '
      + 'safely backfill, which means you cannot safely fix anything. Everything '
      + 'else follows from it.\n\n'
      + 'Your deliberately-corrupted-file test is a good one and I would like '
      + 'to extend it: a source that stops arriving entirely should page '
      + 'someone. Silence is the failure that hurts, because nothing looks '
      + 'wrong until a customer asks.',
  },
  {
    job: 'streaming-kafka-pyspark',
    freelancer: 'tomasz-wieczorek',
    bidCents: 605_000,
    timelineDays: 58,
    note:
      'The reconciliation against the nightly batch is the requirement I would '
      + 'build the design around, and I am glad it is in your scope — most '
      + 'streaming projects discover it eighteen months in when finance '
      + 'notices two numbers.\n\n'
      + 'Exactly-once into the serving layer with stores that go offline for '
      + 'hours and replay means watermarks generous enough to accept them and '
      + 'idempotent writes keyed on the event, not the arrival. I would rather '
      + 'be a minute late than double a sale, as you say.\n\n'
      + '15k events/second peak is comfortable; I would size for 30k and load '
      + 'test at that.',
  },
  {
    job: 'churn-model-ab-testing',
    freelancer: 'sofia-navarro',
    bidCents: 372_000,
    timelineDays: 33,
    note:
      'Two pieces of work and I would do the re-analysis first, because it '
      + 'changes what the churn model is for.\n\n'
      + 'Six experiments over eighteen months all read as wins is, on its own, '
      + 'evidence of a reading problem — with typical retention effect sizes '
      + 'you would expect at least a couple of nulls. I will check power, '
      + 'multiple comparisons and whether randomisation actually held, and I '
      + 'will tell you plainly if the answer is that you do not know whether '
      + 'your retention offers work.\n\n'
      + 'On the model: forward time split, and I optimise for which accounts '
      + 'and why rather than the last two points of AUC, since the output is '
      + 'someone deciding who to call.',
  },
  {
    job: 'financial-forecasting-dashboard',
    freelancer: 'sofia-navarro',
    bidCents: 308_000,
    timelineDays: 30,
    note:
      'Prediction intervals shown as intervals is the line in your brief I '
      + 'would hold you to, gently, when the board asks for the single number '
      + 'anyway — because they will.\n\n'
      + 'Backtesting over three years gives us the honest error to quote, and '
      + 'I would put last month\'s forecast against actuals on the front page '
      + 'of the dashboard rather than buried. A forecast that never shows its '
      + 'own track record drifts back to being an argument.\n\n'
      + 'Handover to a numerate non-coding finance team is the part I would '
      + 'budget properly for, not the modelling.',
  },
  {
    job: 'rag-benchmark-hallucination',
    freelancer: 'nadia-benali',
    bidCents: 522_000,
    timelineDays: 34,
    note:
      'Evaluating retrieval and generation separately is the right instinct '
      + 'and it is where I would start. Averaging them is how a team spends a '
      + 'quarter improving a generator that was never the bottleneck.\n\n'
      + 'On the benchmark: known-unanswerable cases need to be a substantial '
      + 'share, not a token few, and they need to be plausible-looking — a '
      + 'question that is obviously outside the corpus tests nothing. I would '
      + 'build them by taking answerable questions and moving one detail.\n\n'
      + 'Confidence intervals on every intervention, and I will report the ones '
      + 'that did nothing with the same prominence as the ones that helped.',
  },
  {
    job: 'rlhf-red-team-llama3',
    freelancer: 'nadia-benali',
    bidCents: 698_000,
    timelineDays: 38,
    note:
      'Independent means independent: I have not worked on your fine-tune and '
      + 'I have no interest in it passing.\n\n'
      + 'The comparison against the base model is the piece I would emphasise. '
      + 'Preference tuning on internal support data reliably makes a model more '
      + 'agreeable, and more agreeable is a refusal regression that headline '
      + 'safety benchmarks will not catch. I would measure that explicitly.\n\n'
      + 'Reward model review: length bias and sycophancy first, since those are '
      + 'both common and cheap to detect, then reward hacking on the specific '
      + 'shape of your preference data.\n\n'
      + 'Everything reproducible — attack prompts, seeds, harness — so you can '
      + 'rerun it on the next checkpoint without me.',
  },
  {
    job: 'paper-reproduction-cv',
    freelancer: 'nadia-benali',
    bidCents: 448_000,
    timelineDays: 40,
    note:
      'Reproductions live or die on documenting the deviations. Released code '
      + 'without released weights almost always means some detail of the '
      + 'training recipe is missing, and the honest deliverable is a list of '
      + 'every choice I had to make and what each one cost.\n\n'
      + 'Your out-of-domain dataset is the most valuable part of this scope. '
      + 'Headline benchmark numbers reproduce far more often than the '
      + 'improvement transfers, and knowing which of the two you have is worth '
      + 'more than the reproduction itself.\n\n'
      + 'I will report the failed runs and the total compute honestly, '
      + 'including the ones that were my fault.',
  },
  {
    job: 'paper-reproduction-cv',
    freelancer: 'arif-hossain',
    bidCents: 435_000,
    timelineDays: 42,
    note:
      'I would take the ablations seriously rather than as a formality. In '
      + 'detection papers the reported gain frequently comes from the training '
      + 'schedule or the augmentation rather than the architectural '
      + 'contribution, and the ablation table in the paper is usually run at a '
      + 'setting that flatters it.\n\n'
      + 'On the 30k out-of-domain images: I would want to know how the label '
      + 'distribution compares before we read anything into the numbers.\n\n'
      + '4x A100 is enough for this if the schedule is what I expect.',
  },
  {
    job: 'postgres-optimisation',
    freelancer: 'tomasz-wieczorek',
    bidCents: 248_000,
    timelineDays: 20,
    note:
      'Eleven hours from two in a year, on a database that has grown to 900GB, '
      + 'is usually not twenty slow queries — it is one or two access patterns '
      + 'that stopped fitting in memory, plus index bloat nobody has looked at.\n\n'
      + 'I would start with pg_stat_statements ordered by total time rather '
      + 'than mean, because the query that runs 40,000 times at 200ms is '
      + 'invisible in a list sorted by the slow ones.\n\n'
      + 'Deliverable as you describe it: written report, before/after timings '
      + 'on a restored copy, migrations you apply yourselves. No application '
      + 'rewrite proposed.',
  },
];
