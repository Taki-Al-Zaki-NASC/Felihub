'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextArea } from '@/components/ui/field';
import { TagInput } from '@/components/ui/tag-input';
import { saveProfileAction, type FormResult } from '@/server/actions/profile';

/** A nudge, not a taxonomy — the field accepts anything typed. It exists so
 *  the common skills are spelled the same way across profiles, which is what
 *  makes search find them. */
const SKILL_SUGGESTIONS = [
  'Flutter', 'React', 'TypeScript', 'Node.js', 'Python', 'Figma',
  'UI Design', 'Copywriting', 'SEO', 'Firebase', 'PostgreSQL', 'Android',
] as const;

export interface ProfileDefaults {
  displayName: string;
  headline: string;
  bio: string;
  location: string;
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

      <TagInput
        label={isFreelancer ? 'Skills' : 'What you hire for'}
        name="skills"
        defaultValue={defaults.skills}
        placeholder="Flutter"
        hint={isFreelancer
          ? 'Type a skill and press Enter. These are exactly what clients search on.'
          : 'Type a skill and press Enter, so freelancers know what you need.'}
        suggestions={SKILL_SUGGESTIONS}
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
