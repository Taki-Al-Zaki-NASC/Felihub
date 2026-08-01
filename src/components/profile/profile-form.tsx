'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextArea } from '@/components/ui/field';
import { TagInput } from '@/components/ui/tag-input';
import { CATEGORIES, skillsFor } from '@/lib/categories';
import { saveProfileAction, type FormResult } from '@/server/actions/profile';

export interface ProfileDefaults {
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  category: string;
  skills: string[];
  hourlyRate: string;
  portfolioUrl: string;
}

export function ProfileForm({
  defaults, isFreelancer, submitLabel,
}: {
  defaults: ProfileDefaults;
  isFreelancer: boolean;
  submitLabel: string;
}) {
  const [state, action] = useActionState<FormResult | null, FormData>(
    saveProfileAction, null,
  );
  // Suggestions follow the chosen category, so an AI researcher is offered
  // PyTorch rather than Figma.
  const [category, setCategory] = useState(defaults.category);
  const fieldError = (k: string) => state?.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError>{state?.error}</FormError>

      {state?.ok && (
        <p role="status"
          className="flex items-center gap-2 rounded-md border border-teal/30 bg-teal-tint px-3 py-2.5 text-sm font-medium text-teal-deep">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Saved.
        </p>
      )}

      <Field label="Display name" name="displayName" defaultValue={defaults.displayName}
        placeholder="How you want to be addressed"
        error={fieldError('displayName')} />

      <Field
        label={isFreelancer ? 'Headline' : 'Company or role'}
        name="headline"
        defaultValue={defaults.headline}
        placeholder={isFreelancer
          ? 'Flutter developer building offline-first apps'
          : 'Head of Product at a logistics startup'}
        hint={isFreelancer
          ? 'The line clients see under your name in search results.'
          : 'What you do, so freelancers know who they are talking to.'}
        error={fieldError('headline')} />

      <TextArea label="About" name="bio" defaultValue={defaults.bio}
        placeholder={isFreelancer
          ? 'What you build, the problems you are good at, and how you work.'
          : 'What your company does and the kind of help you usually need.'}
        hint="At least a couple of sentences. This is the first thing anyone reads."
        error={fieldError('bio')} />

      <Field label="Location" name="location" defaultValue={defaults.location}
        placeholder="Dhaka, Bangladesh" error={fieldError('location')} />

      <div>
        <label htmlFor="category" className="block text-sm font-semibold">
          {isFreelancer ? 'Category you work in' : 'Category you hire in'}
        </label>
        <select id="category" name="category" value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1.5 min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
          <option value="" disabled>Choose one</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="mt-1.5 text-xs text-ink-muted">
          {isFreelancer
            ? 'The same list jobs are posted under. Your board shows work in this category first.'
            : 'Helps the right freelancers find your postings.'}
        </p>
        {fieldError('category') && (
          <p className="mt-1.5 text-sm text-danger">{fieldError('category')}</p>
        )}
      </div>

      <TagInput
        label={isFreelancer ? 'Skills' : 'What you hire for'}
        name="skills"
        defaultValue={defaults.skills}
        placeholder="Flutter"
        hint={isFreelancer
          ? 'Type a skill and press Enter. These are exactly what clients search on.'
          : 'Type a skill and press Enter, so freelancers know what you need.'}
        suggestions={skillsFor(category)}
        error={fieldError('skills')} />

      {isFreelancer && (
        <Field label="Hourly rate" name="hourlyRate" inputMode="decimal"
          defaultValue={defaults.hourlyRate} placeholder="$45"
          hint="Your asking rate. You can still bid a fixed price per job."
          error={fieldError('hourlyRate')} />
      )}

      <Field label="Portfolio or website" name="portfolioUrl"
        type="url" defaultValue={defaults.portfolioUrl}
        placeholder="https://example.com" hint="Optional."
        error={fieldError('portfolioUrl')} />

      <Submit label={submitLabel} />
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}>
      {pending ? 'Saving…' : label}
    </Button>
  );
}
