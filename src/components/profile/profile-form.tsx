'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextArea } from '@/components/ui/field';
import { TagInput } from '@/components/ui/tag-input';
import { CATEGORIES, skillsFor } from '@/lib/categories';
import { TEAM_SIZES, flowFor } from '@/lib/onboarding';
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
  teamSize?: string;
}

/**
 * One form, four flows.
 *
 * Every label, placeholder and hint comes from `src/lib/onboarding.ts` rather
 * than from a boolean in here. The four account types are not the same kind of
 * account, and asking a startup founder to fill in a box called "Headline" is
 * what happens when a form has one switch called `isFreelancer`.
 */
export function ProfileForm({
  defaults, role, submitLabel,
}: {
  defaults: ProfileDefaults;
  role: string;
  submitLabel: string;
}) {
  const flow = flowFor(role);
  const isFreelancer = role === 'FREELANCER';
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
        label={flow.labels.headline}
        name="headline"
        defaultValue={defaults.headline}
        placeholder={flow.labels.headlinePlaceholder}
        hint={flow.labels.headlineHint}
        error={fieldError('headline')} />

      <TextArea label={flow.labels.bio} name="bio" defaultValue={defaults.bio} authored
        placeholder={flow.labels.bioPlaceholder}
        hint={flow.labels.bioHint}
        error={fieldError('bio')} />

      <Field label={flow.labels.location} name="location" defaultValue={defaults.location}
        placeholder="Dhaka, Bangladesh" error={fieldError('location')} />

      {flow.asksTeamSize && (
        <div>
          <label htmlFor="teamSize" className="block text-sm font-semibold">
            How many of you
          </label>
          <select id="teamSize" name="teamSize" defaultValue={defaults.teamSize ?? ''}
            className="mt-1.5 min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
            <option value="">Prefer not to say</option>
            {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-ink-muted">
            Shown on your profile. People ask anyway, and the answer changes
            what they bring you.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="category" className="block text-sm font-semibold">
          {flow.labels.category}
        </label>
        <select id="category" name="category" value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1.5 min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal">
          <option value="" disabled>Choose one</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="mt-1.5 text-xs text-ink-muted">{flow.labels.categoryHint}</p>
        {fieldError('category') && (
          <p className="mt-1.5 text-sm text-danger">{fieldError('category')}</p>
        )}
      </div>

      <TagInput
        label={flow.labels.skills}
        name="skills"
        defaultValue={defaults.skills}
        placeholder={flow.labels.skillsPlaceholder}
        hint={flow.labels.skillsHint}
        suggestions={skillsFor(category)}
        error={fieldError('skills')} />

      {flow.asksHourlyRate && (
        <Field label={isFreelancer ? 'Hourly rate' : 'Typical day rate'}
          name="hourlyRate" inputMode="decimal"
          defaultValue={defaults.hourlyRate} placeholder="$45"
          hint={isFreelancer
            ? 'Your asking rate. You can still bid a fixed price per job.'
            : 'A starting point for a conversation, not a quote.'}
          error={fieldError('hourlyRate')} />
      )}

      {flow.asksWebsite && (
        <Field label={isFreelancer ? 'Portfolio or website' : 'Website'}
          name="portfolioUrl"
          type="url" defaultValue={defaults.portfolioUrl}
          placeholder="https://example.com" hint="Optional."
          error={fieldError('portfolioUrl')} />
      )}

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
