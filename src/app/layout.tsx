import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Newsreader } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Sans({
  subsets: ['latin'], weight: ['400', '500', '600', '700'],
  variable: '--font-plex', display: 'swap',
});
const newsreader = Newsreader({
  subsets: ['latin'], weight: ['500', '600', '700'],
  variable: '--font-newsreader', display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Felicek — verified freelance marketplace', template: '%s · Felicek' },
  description:
    'Every account is identity-verified and deposit-backed before it can post '
    + 'or bid. Escrow milestones and a flat 1% fee, itemised separately from '
    + 'payment processing.',
};

/**
 * Without this, mobile browsers assume a ~980px desktop width and scale the
 * page down, which makes every responsive breakpoint moot. v1 shipped without
 * it and read as "not responsive at all" no matter what the classes said.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f5f0',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
