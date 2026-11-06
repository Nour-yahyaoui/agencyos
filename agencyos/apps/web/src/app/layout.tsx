import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/lib/providers';
import './globals.css';
const inter = Inter({ subsets: ['latin'], display: 'swap' });
export const metadata: Metadata = { title: { default: 'AgencyOS — Agency operations platform', template: '%s · AgencyOS' }, description: 'Multi-tenant SaaS for client delivery, projects, billing, and analytics.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={inter.className}><Providers>{children}</Providers><Toaster richColors position="top-right" /></body></html>;
}
