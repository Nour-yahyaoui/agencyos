import { cookies } from 'next/headers';
import { AppShell } from '@/components/layout/app-shell';
import { SIDEBAR_COOKIE, parseSidebarCookie } from '@/lib/sidebar';

/**
 * The persisted sidebar width is read on the server so the very first paint already has the
 * right content offset. Doing this in an effect would shift the whole page after hydration.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const initialSidebar = parseSidebarCookie(store.get(SIDEBAR_COOKIE)?.value);
  return <AppShell initialSidebar={initialSidebar}>{children}</AppShell>;
}
