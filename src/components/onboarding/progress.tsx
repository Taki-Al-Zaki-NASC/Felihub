/**
 * The gates an account passes, shown up front so none of them feels like an
 * unexpected extra.
 *
 * The labels come from the role's flow — a startup's first step is "Startup",
 * a freelancer's is "Profile" — because the same three boxes with the same
 * three words is how four different account types end up feeling like one.
 */
export function Progress({ step, steps = ['Profile', 'Verification'] }: {
  step: 1 | 2;
  steps?: readonly string[];
}) {
  return (
    <ol className="flex items-center gap-3 text-sm">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                ${done ? 'bg-teal text-white'
                  : active ? 'bg-ink-strong text-canvas'
                    : 'bg-neutral-tint text-ink-faint'}`}>
                {done ? '✓' : n}
              </span>
              <span className={active ? 'font-semibold' : 'text-ink-muted'}>
                {label}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span className="h-px w-8 bg-border-strong" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
