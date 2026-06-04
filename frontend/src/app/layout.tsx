import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'SinAble',
  description: 'Electronic signature platform.',
  themeColor: '#6366F1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body
        style={{
          fontFamily: GeistSans.style.fontFamily,
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
