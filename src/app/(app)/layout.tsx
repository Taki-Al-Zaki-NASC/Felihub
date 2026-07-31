import { Gate } from '@/components/gate';
import { Nav } from '@/components/nav';
import { IncomingCallListener } from '@/components/call-panel';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Gate>
      <Nav />
      {/* Rings wherever you are, not only inside the thread it came from. */}
      <IncomingCallListener />
      {/* pb-24 on phones clears the fixed bottom bar; without it the last
          row of any list sits underneath it and cannot be tapped. */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-5 sm:py-8 md:pb-8">
        {children}
      </main>
    </Gate>
  );
}
