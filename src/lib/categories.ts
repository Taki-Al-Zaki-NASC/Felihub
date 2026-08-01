/**
 * The job taxonomy.
 *
 * One list, imported by the posting form, the freelancer's profile, the match
 * score and the landing page — so a category cannot exist in one place and not
 * another. The landing page used to keep its own copy with its own blurbs,
 * which is exactly how a "Data Science" category ends up advertised on the
 * home page and unselectable in the form.
 */
export const CATEGORIES = [
  'Development & IT',
  'Data Science & Analytics',
  'Data Engineering',
  'AI & Machine Learning',
  'AI Research & Evaluation',
  'Research & Academic Work',
  'Design & Creative',
  'Writing & Translation',
  'Sales & Marketing',
  'Finance & Accounting',
  'Admin & Support',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The one-line explanation shown on the landing page. */
export const CATEGORY_BLURBS: Record<Category, string> = {
  'Development & IT': 'Mobile, web, backend, DevOps',
  'Data Science & Analytics': 'Dashboards, statistics, forecasting, experimentation',
  'Data Engineering': 'Pipelines, warehouses, streaming, data quality',
  'AI & Machine Learning': 'LLM apps, computer vision, NLP, model training',
  'AI Research & Evaluation': 'Benchmarks, red-teaming, papers, reproductions',
  'Research & Academic Work': 'Literature reviews, papers, experiment design',
  'Design & Creative': 'Product, brand, illustration, motion',
  'Writing & Translation': 'Technical, editorial, localisation',
  'Sales & Marketing': 'Growth, SEO, paid, lifecycle',
  'Finance & Accounting': 'Bookkeeping, modelling, audit prep',
  'Admin & Support': 'Operations, research, assistance',
};

/**
 * Suggested skills per category.
 *
 * A nudge, not a restriction — the tag input accepts anything typed. It exists
 * so the common skills are spelled the same way across profiles and postings,
 * which is the whole reason search and the match score find anything. "PyTorch"
 * and "pytorch" and "Py Torch" are three different tags to a database.
 */
export const SKILLS_BY_CATEGORY: Record<Category, readonly string[]> = {
  'Development & IT': [
    'Flutter', 'React', 'TypeScript', 'Node.js', 'Python', 'Go',
    'PostgreSQL', 'Firebase', 'Android', 'iOS', 'AWS', 'Docker',
  ],
  'Data Science & Analytics': [
    'Python', 'pandas', 'SQL', 'R', 'Tableau', 'Power BI',
    'Statistics', 'A/B Testing', 'Forecasting', 'Causal Inference',
    'Bayesian Modelling', 'Time Series',
  ],
  'Data Engineering': [
    'Airflow', 'dbt', 'Apache Spark', 'Kafka', 'Snowflake', 'BigQuery',
    'Databricks', 'ETL', 'Data Modelling', 'Data Quality', 'Redshift',
    'ClickHouse',
  ],
  'AI & Machine Learning': [
    'PyTorch', 'TensorFlow', 'scikit-learn', 'LLM Fine-tuning', 'RAG',
    'Prompt Engineering', 'Computer Vision', 'NLP', 'Hugging Face',
    'MLOps', 'Vector Databases', 'LangChain', 'Speech Recognition',
    'Recommender Systems', 'ONNX', 'Model Deployment',
  ],
  'AI Research & Evaluation': [
    'Benchmark Design', 'Model Evaluation', 'Red-teaming', 'Ablation Studies',
    'Reinforcement Learning', 'RLHF', 'Interpretability', 'Paper Reproduction',
    'Dataset Curation', 'Annotation Guidelines', 'Bias Auditing',
    'Statistical Significance',
  ],
  'Research & Academic Work': [
    'Literature Review', 'Experiment Design', 'LaTeX', 'Systematic Review',
    'Data Collection', 'Qualitative Research', 'Survey Design',
    'Statistical Analysis', 'Academic Writing', 'Citation Management',
    'Meta-analysis', 'Grant Writing',
  ],
  'Design & Creative': [
    'Figma', 'UI Design', 'UX Research', 'Branding', 'Illustration',
    'Motion Design', 'Design Systems', 'Prototyping',
  ],
  'Writing & Translation': [
    'Copywriting', 'Technical Writing', 'Editing', 'Localisation',
    'SEO Writing', 'Bengali', 'Proofreading',
  ],
  'Sales & Marketing': [
    'SEO', 'Google Ads', 'Meta Ads', 'Email Marketing', 'Analytics',
    'Content Strategy', 'Lead Generation', 'CRM',
  ],
  'Finance & Accounting': [
    'Bookkeeping', 'Financial Modelling', 'QuickBooks', 'Xero',
    'Tax Preparation', 'Excel', 'Audit Support',
  ],
  'Admin & Support': [
    'Data Entry', 'Customer Support', 'Virtual Assistance', 'Scheduling',
    'Research', 'Transcription',
  ],
};

/** A broad default for a form where no category has been chosen yet. */
export const COMMON_SKILLS = [
  'Python', 'TypeScript', 'React', 'PyTorch', 'SQL', 'Figma',
  'Copywriting', 'SEO', 'pandas', 'RAG', 'Flutter', 'Model Evaluation',
] as const;

export function skillsFor(category: string | null | undefined): readonly string[] {
  if (category && category in SKILLS_BY_CATEGORY) {
    return SKILLS_BY_CATEGORY[category as Category];
  }
  return COMMON_SKILLS;
}
