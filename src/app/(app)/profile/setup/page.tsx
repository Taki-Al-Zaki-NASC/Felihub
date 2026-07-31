'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session';
import { isVerified, type UserRoleKey } from '@/lib/types';
import type { ExperienceEntry } from '@/lib/schema';
import { completeProfile, describeError } from '@/lib/mutations';
import { signOut } from '@/lib/auth-actions';
import { Button, ErrorState, Loading } from '@/components/ui';
import { useToast } from '@/components/toast';

/**
 * Profile setup — the page that clears the `onboarding` stage.
 *
 * signUp writes onboarded:false, so without this every new web account lands
 * on a blocking screen with nothing behind it. This is the way out.
 */
export default function ProfileSetup() {
  const { user } = useSession();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [skillText, setSkillText] = useState('');
  const [rate, setRate] = useState('');
  const [role, setRole] = useState<UserRoleKey>(user?.role ?? 'freelancer');
  const [languages, setLanguages] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <Loading />;

  const isFreelancer = role === 'freelancer';
  const ready = displayName.trim().length > 1 && bio.trim().length > 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || busy || !ready) return;
    setBusy(true); setError(null);
    try {
      const parsed = Number(rate.replace(/[^0-9.]/g, ''));
      await completeProfile({
        uid: user.uid,
        displayName, title, bio, location,
        skills: skillText.split(',').map((s) => s.trim()).filter(Boolean),
        languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
        portfolioUrl: portfolio.trim() || null,
        // Blank rows are what a repeater always accumulates; storing them
        // would render as empty entries on the public profile.
        experience: experience.filter((e) => e.role.trim()),
        hourlyRate: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
        role,
        verified: isVerified(user),
      });
      toast.success('Profile saved.');
      // No redirect needed: the session snapshot moves the stage on, and the
      // gate routes from there.
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-1">
      <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Finish your profile</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        {isFreelancer
          ? 'This is what clients see when you bid.'
          : 'This is what freelancers see when you post work.'}
      </p>

      <fieldset className="mt-6">
        <legend className="text-xs font-semibold text-ink-muted">Account type</legend>
        <p className="mt-1 text-xs text-ink-faint">
          Decides what the app shows you: a freelancer bids on work, everyone
          else posts it and browses talent. Changeable here — nothing else on
          the site could change it, which left accounts stuck on the wrong side
          of the marketplace.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ROLE_CHOICES.map((r) => (
            <button type="button" key={r.key} onClick={() => setRole(r.key)}
              aria-pressed={role === r.key}
              className={`rounded-card border px-4 py-3 text-left transition ${
                role === r.key ? 'border-teal bg-teal-tint' : 'border-border bg-surface hover:border-border-strong'
              }`}>
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="mt-0.5 block text-xs text-ink-muted">{r.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Display name" value={displayName} onChange={setDisplayName} />
        <Field label={isFreelancer ? 'Headline' : 'Company or role'}
          value={title} onChange={setTitle}
          hint={isFreelancer ? 'e.g. Flutter developer, 6 years' : 'e.g. Nimbus Labs'} />
        <Area label="About" value={bio} onChange={setBio}
          hint="At least a sentence or two — this is the part people actually read." />
        <Field label="Location" value={location} onChange={setLocation}
          hint="City and country." />

        {isFreelancer && (
          <>
            <Field label="Skills" value={skillText} onChange={setSkillText}
              hint="Comma separated." />
            <Field label="Hourly rate" value={rate} onChange={setRate}
              hint="Optional. Leave blank if you quote per project." />
            <Field label="Languages" value={languages} onChange={setLanguages}
              hint="Comma separated. Optional." />
            <Field label="Portfolio link" value={portfolio} onChange={setPortfolio}
              hint="Optional. A site, a repository, a reel." />

            <div>
              <span className="text-xs font-semibold text-ink-muted">Work experience</span>
              <p className="mt-0.5 text-xs text-ink-faint">
                Optional, and shown on your public profile.
              </p>
              <div className="mt-2 space-y-2">
                {experience.map((e, i) => (
                  <div key={i} className="rounded-card border border-border bg-surface p-3">
                    <div className="flex gap-2">
                      <input value={e.role} placeholder="Role"
                        onChange={(ev) => setExperience(experience.map((x, j) =>
                          j === i ? { ...x, role: ev.target.value } : x))}
                        className="min-w-0 flex-1 rounded-field border border-border px-3 py-2 text-base outline-none focus:border-teal sm:text-sm" />
                      <button type="button" aria-label={`Remove experience ${i + 1}`}
                        onClick={() => setExperience(experience.filter((_, j) => j !== i))}
                        className="px-2 text-sm text-ink-faint hover:text-danger">×</button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input value={e.company ?? ''} placeholder="Company"
                        onChange={(ev) => setExperience(experience.map((x, j) =>
                          j === i ? { ...x, company: ev.target.value } : x))}
                        className="min-w-0 flex-1 rounded-field border border-border px-3 py-2 text-base outline-none focus:border-teal sm:text-sm" />
                      <input value={e.period ?? ''} placeholder="2021–2024"
                        onChange={(ev) => setExperience(experience.map((x, j) =>
                          j === i ? { ...x, period: ev.target.value } : x))}
                        className="w-32 rounded-field border border-border px-3 py-2 text-base outline-none focus:border-teal sm:text-sm" />
                    </div>
                    <textarea value={e.summary ?? ''} rows={2} placeholder="What you did there"
                      onChange={(ev) => setExperience(experience.map((x, j) =>
                        j === i ? { ...x, summary: ev.target.value } : x))}
                      className="mt-2 w-full rounded-field border border-border px-3 py-2 text-base outline-none focus:border-teal sm:text-sm" />
                  </div>
                ))}
              </div>
              <button type="button"
                onClick={() => setExperience([...experience, { role: '' }])}
                className="mt-2 text-xs font-bold text-teal-deep">+ Add a role</button>
            </div>
          </>
        )}

        {error && <ErrorState message={error} />}

        <Button type="submit" busy={busy} disabled={!ready} className="w-full">
          Save and continue
        </Button>
        {!ready && (
          <p className="text-center text-xs text-ink-faint">
            A display name and a short description are required.
          </p>
        )}
      </form>

      <button onClick={() => void signOut()}
        className="mx-auto mt-6 block text-xs font-semibold text-ink-faint hover:text-danger">
        Sign out
      </button>
    </div>
  );
}

function Field({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-field border border-border bg-surface px-3.5 py-3 text-base outline-none focus:border-teal sm:text-sm" />
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

function Area({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <textarea value={value} rows={5} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-field border border-border bg-surface px-3.5 py-3 text-base outline-none focus:border-teal sm:text-sm" />
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

const ROLE_CHOICES: { key: UserRoleKey; label: string; blurb: string }[] = [
  { key: 'freelancer', label: 'Freelancer', blurb: 'Bid on work. Appears in the talent directory.' },
  { key: 'client', label: 'Client', blurb: 'Post jobs and browse talent.' },
  { key: 'agency', label: 'Agency', blurb: 'Hire as a team.' },
  { key: 'startup', label: 'Startup', blurb: 'Build a team.' },
];
