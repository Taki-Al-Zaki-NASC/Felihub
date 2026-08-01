import Link from 'next/link';
import type { Metadata } from 'next';
import { Apple, Monitor, ShieldCheck, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DESKTOP_BUILDS, DESKTOP_VERSION, anyBuildAvailable } from '@/lib/desktop';

export const metadata: Metadata = {
  title: 'Download the desktop tracker',
  description:
    'The Felicek time tracker for Windows, macOS and Linux — hours, activity '
    + 'and optional screenshots, reported against your contracts.',
};

const ICONS = { windows: Monitor, macos: Apple, linux: Terminal } as const;

export default function Download() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
        The desktop tracker
      </h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        Tracks hours, samples activity, and reports both against the contracts
        you already have here. Pair it once from Settings → Apps → Desktop Time
        Tracker; it authenticates as a device, so the credential on your laptop
        can be revoked on its own and can do nothing except log time.
      </p>

      {!anyBuildAvailable && (
        // Said at the top, not in a footnote. A download page that looks like
        // a download page and has nothing to download wastes an afternoon.
        <div className="mt-6 rounded-lg border border-amber/30 bg-amber-tint p-4 text-sm text-amber">
          <strong className="font-semibold">
            There is no installer to download yet.
          </strong>{' '}
          The server side is finished and running — pairing, the ingest
          endpoint, activity samples, hours against a contract. The client that
          talks to it still has to be compiled and code-signed for each
          platform, which needs a build pipeline and a signing certificate.
          Until then these buttons stay off rather than pointing at a file that
          is not there.
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {DESKTOP_BUILDS.map((build) => {
          const Icon = ICONS[build.platform];
          return (
            <Card key={build.platform} className="flex flex-col p-5">
              <Icon className="h-6 w-6 text-ink-muted" />
              <h2 className="mt-3 font-serif text-base font-semibold">
                {build.label}
              </h2>
              <p className="mt-1 flex-1 text-xs text-ink-muted">
                {build.requirement}
              </p>
              {build.available ? (
                <>
                  <Button asChild className="mt-4 w-full">
                    <a href={build.url} download>
                      Download {DESKTOP_VERSION}
                    </a>
                  </Button>
                  {build.sizeMb && (
                    <p className="mt-1.5 text-center text-xs text-ink-faint">
                      {build.sizeMb} MB
                    </p>
                  )}
                </>
              ) : (
                <Button disabled className="mt-4 w-full" variant="outline">
                  Not built yet
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-5">
        <ShieldCheck className="h-5 w-5 text-teal-deep" />
        <h2 className="mt-2 font-serif text-lg font-semibold">
          What it does, and what it will not do
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm text-ink-muted">
          <li>
            <strong className="text-ink">Screenshots are the freelancer&rsquo;s
            switch, not the client&rsquo;s.</strong> They are off unless the
            person being tracked turns them on, from their own machine.
            Watching somebody&rsquo;s screen without their knowledge is not a
            setting this will ever have.
          </li>
          <li>
            <strong className="text-ink">It reports time, and only time.</strong>{' '}
            The device token can create time entries for the account that paired
            it. It cannot read messages, move money, bid, or hire.
          </li>
          <li>
            <strong className="text-ink">It stops when you close it.</strong> No
            service, no background agent that survives a reboot, nothing that
            keeps running after you quit.
          </li>
          <li>
            <strong className="text-ink">Checksums are published.</strong> Every
            release lists its SHA-256 so you can check the file you downloaded
            is the file we built.
          </li>
        </ul>
      </Card>

      <Card className="mt-5 p-5">
        <h2 className="font-serif text-base font-semibold">
          Building it yourself, or writing your own
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          The ingest endpoint is a documented HTTP API, so a client does not
          have to be ours. Post to{' '}
          <code className="rounded bg-neutral-tint px-1.5 py-0.5 text-xs">
            POST /api/tracker/ingest
          </code>{' '}
          with your device token as a bearer token and a JSON body of{' '}
          <code className="rounded bg-neutral-tint px-1.5 py-0.5 text-xs">
            startedAt, endedAt, seconds, jobId, samples[]
          </code>. It answers 201 with the entry id.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/settings?tab=apps">Turn the tracker on and pair a device</Link>
        </Button>
      </Card>
    </div>
  );
}
