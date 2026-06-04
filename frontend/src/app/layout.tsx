import type { Metadata } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';

import { Providers } from './providers';
import './globals.css';

// Inter Tight — primary UI font, matches app.definable.ai
const fontSans = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'SinAble',
  description: 'Electronic signature platform.',
  themeColor: '#c65d3a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
