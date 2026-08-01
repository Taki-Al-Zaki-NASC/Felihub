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
  'AI & Machine Learning',
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
  'Data Science & Analytics': 'Pipelines, dashboards, statistics, forecasting',
  'AI & Machine Learning': 'LLMs, computer vision, NLP, model training',
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
    'dbt', 'Apache Spark', 'Airflow', 'Statistics', 'A/B Testing', 'Forecasting',
  ],
  'AI & Machine Learning': [
    'PyTorch', 'TensorFlow', 'scikit-learn', 'LLM Fine-tuning', 'RAG',
    'Prompt Engineering', 'Computer Vision', 'NLP', 'Hugging Face',
    'MLOps', 'Model Evaluation', 'Reinforcement Learning',
  ],
  'Research & Academic Work': [
    'Literature Review', 'Experiment Design', 'LaTeX', 'Systematic Review',
    'Data Collection', 'Qualitative Research', 'Survey Design',
    'Statistical Analysis', 'Academic Writing', 'Citation Management',
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
  'Copywriting', 'SEO', 'pandas', 'LLM Fine-tuning', 'Flutter', 'Excel',
] as const;

export function skillsFor(category: string | null | undefined): readonly string[] {
  if (category && category in SKILLS_BY_CATEGORY) {
    return SKILLS_BY_CATEGORY[category as Category];
  }
  return COMMON_SKILLS;
}
