'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextArea } from '@/components/ui/field';
import { TagInput } from '@/components/ui/tag-input';
import { MilestoneEditor } from '@/components/jobs/milestone-editor';
import { CATEGORIES } from '@/lib/categories';
import { createJobAction } from '@/server/actions/jobs';
import type { FormResult } from '@/server/actions/profile';

/** Same list the profile form offers, so a job's skills and a freelancer's
 *  skills are spelled the same way and actually match. */
const SKILL_SUGGESTIONS = [
  'Flutter', 'React', 'TypeScript', 'Node.js', 'Python', 'Figma',
  'UI Design', 'Copywriting', 'SEO', 'Firebase', 'PostgreSQL', 'Android',
] as const;

export function JobForm() {
  const [state, action] = useActionState<FormResult | null, FormData>(
    createJobAction, null,
  );
  const [budget, setBudget] = useState('');
  const fieldError = (k: string) => state?.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError>{state?.error}</FormError>

      <Field label="Title" name="title"
        placeholder="Build a five-screen onboarding flow in Flutter"
        hint="What you need done, in one line."
        error={fieldError('title')} />

      <div>
        <label htmlFor="category" className="block text-sm font-semibold">
          Category
        </label>
        <select id="category" name="category" defaultValue=""
          className="mt-1.5 min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
          <option value="" disabled>Choose one</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {fieldError('category') && (
          <p className="mt-1.5 text-sm text-danger">{fieldError('category')}</p>
        )}
      </div>

      <TextArea label="Description" name="description" rows={8}
        placeholder="The scope, what you expect delivered, and how you will judge it finished."
        hint="Detail here is what separates useful bids from guesses."
        error={fieldError('description')} />

      <TagInput label="Skills needed" name="skills"
        placeholder="Flutter"
        hint="Type a skill and press Enter. These are what freelancers search on."
        suggestions={SKILL_SUGGESTIONS}
        error={fieldError('skills')} />

      <Field label="Budget" name="budget" inputMode="decimal"
        placeholder="$1,200" value={budget}
        onChange={(e) => setBudget(e.target.value)}
        hint="The total. You fund it one milestone at a time, not all at once."
        error={fieldError('budget')} />

      <MilestoneEditor budget={budget} error={fieldError('milestones')} />

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}>
      {pending ? 'Posting…' : 'Post job'}
    </Button>
  );
}
