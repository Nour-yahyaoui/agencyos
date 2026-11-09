import type { Metadata, Viewport } from 'next';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import { Providers } from '@/lib/providers';
import { ThemeProvider } from '@/components/theme/theme';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AgencyOS — agency operations', template: '%s · AgencyOS' },
  description: 'Client delivery, project tracking, billing, and analytics for digital agencies. Built by Nour Yahyaoui.',
  authors: [{ name: 'Nour Yahyaoui', url: 'https://github.com/nour-yahyaoui' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#14161a' },
  ],
};

/**
 * Runs before first paint. Without it a dark-mode user sees a white flash on every navigation,
 * because React only applies the theme after hydration.
 */
const themeScript = `(function(){try{var s=localStorage.getItem('agencyos.theme');var d=s==='dark'||((!s||s==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.dataset.theme=d?'dark':'light';e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <Providers>{children}</Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
