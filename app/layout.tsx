import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, Outfit } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { SilkBackground } from '@/components/ui/silk-background-animation';
import { SiteSonar } from '@/components/site/site-sonar';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-outfit', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-inter', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f9f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d0e' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${inter.variable}`}>
      <body>
        {/* Light (whitish gradient) is the default look; the choice is remembered per visitor. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SilkBackground />
          <SiteSonar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
