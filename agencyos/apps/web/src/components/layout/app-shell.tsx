'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Bell, Menu, PanelLeftOpen, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { cn } from '@/lib/utils';
import { CLIENT_NAV, AGENCY_NAV, isActivePath, visibleNav } from '@/lib/nav';
import { SIDEBAR_RAIL, type SidebarState } from '@/lib/sidebar';
import type { Notification } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme/theme';
import { AppFooter } from '@/components/layout/app-footer';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { useSidebarResize } from '@/components/layout/use-sidebar-resize';

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/**
 * The one layout shell. It owns sidebar width and collapse state, which navigation is mounted
 * at the current breakpoint, the top bar, and the CSS variables that content padding and toast
 * offsets read. Pages never reimplement navigation.
 *
 * Before hydration both navs are in the tree but CSS-gated, so the first paint is correct on
 * every device; after hydration only the active one stays mounted.
 */
export function AppShell({ children, initialSidebar }: { children: React.ReactNode; initialSidebar: SidebarState }) {
  const { user, org, role, isLoading, isClient, isManagement } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const tabletUp = useMediaQuery('(min-width: 768px)');
  const desktop = useMediaQuery('(min-width: 1024px)');
  const resize = useSidebarResize(initialSidebar);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!isLoading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isLoading, user, router, pathname]);
  React.useEffect(() => setDrawerOpen(false), [pathname]);

  const notifications = useQuery({
    queryKey: ['notifications', org?.id],
    queryFn: () => api<Notification[]>('/notifications?unread=true'),
    enabled: !!org,
    refetchInterval: 60_000,
  });
  const unread = notifications.data?.length ?? 0;

  const items = visibleNav(isClient ? CLIENT_NAV : AGENCY_NAV, { isManagement });

  // Content offset and toast clearance are derived here, once, as CSS variables.
  const sidebarWidth = !tabletUp ? 0 : desktop ? (resize.collapsed ? SIDEBAR_RAIL : resize.width) : SIDEBAR_RAIL;
  React.useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  if (isLoading || !user) return <ShellSkeleton />;

  const activeItem = items.find((item) => isActivePath(pathname, item.href));
  const deep = Boolean(activeItem && pathname !== activeItem.href);

  const showSidebar = !mounted || tabletUp;
  const showBottomNav = !mounted || !tabletUp;

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={150}>
      <div className="min-h-dvh">
        <a href="#main" className="skip-link">
          Skip to content
        </a>

        {showSidebar && (
          <aside
            className="fixed inset-y-0 start-0 z-30 hidden md:block"
            style={{ width: desktop ? (resize.collapsed ? SIDEBAR_RAIL : resize.width) : SIDEBAR_RAIL }}
          >
            <Sidebar
              items={items}
              collapsed={!desktop || resize.collapsed}
              unread={unread}
              width={resize.width}
              dragging={resize.dragging}
              onToggle={() => (desktop ? resize.toggle() : setDrawerOpen(true))}
              handleProps={desktop ? resize.handleProps : undefined}
            />
          </aside>
        )}

        {/* Tablet: the rail stays put and the full sidebar opens over the content. */}
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-overlay bg-ink/50 motion-safe:animate-fade-in lg:hidden" />
            <Dialog.Content
              className="fixed inset-y-0 start-0 z-modal w-[272px] shadow-3 motion-safe:animate-fade-in lg:hidden"
              aria-describedby={undefined}
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Sidebar items={items} collapsed={false} unread={unread} onToggle={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} overlay />
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close navigation"
                  className="absolute end-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-sm text-rail-muted hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div
          className={cn('flex min-h-dvh min-w-0 flex-col', !resize.dragging && 'transition-[margin] duration-base ease-out')}
          style={{ marginInlineStart: mounted ? 'var(--sidebar-w)' : undefined }}
        >
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-surface/75 sm:h-16 sm:px-6">
            {tabletUp && !desktop ? (
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
                <Menu aria-hidden />
              </Button>
            ) : null}
            {!tabletUp && deep ? (
              <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
                <ArrowLeft aria-hidden />
              </Button>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium sm:hidden">{activeItem?.label ?? org?.name}</p>
              <p className="hidden truncate text-sm text-ink-muted sm:block">
                <span className="text-ink">{org?.name}</span>
                <span className="mx-2 text-ink-faint">/</span>
                <span className="capitalize">{role?.toLowerCase().replace('_', ' ')}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {desktop && <ThemeToggle compact className="me-1" />}
              <Tooltip content="Notifications" side="bottom">
                <Button variant="ghost" size="icon" asChild className="relative">
                  <Link href="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                    <Bell aria-hidden />
                    {unread > 0 && (
                      <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-accent-contrast">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </Link>
                </Button>
              </Tooltip>
              {desktop && !resize.collapsed ? null : desktop ? (
                <Tooltip content="Expand sidebar (⌘B)" side="bottom">
                  <Button variant="ghost" size="icon" onClick={resize.toggle} aria-label="Expand sidebar">
                    <PanelLeftOpen aria-hidden />
                  </Button>
                </Tooltip>
              ) : null}
              <Avatar name={user.name} />
            </div>
          </header>

          <main id="main" className="min-w-0 flex-1 px-4 pb-[calc(var(--bottom-nav-h)+1.5rem)] pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">
            {children}
          </main>

          <AppFooter className="pb-[calc(var(--bottom-nav-h)+1.25rem)] lg:pb-5" />
        </div>

        {showBottomNav && <BottomNav items={items} unread={unread} />}
      </div>
    </TooltipProvider>
  );
}

/** Mirrors the real shell so the swap to content causes no layout shift. */
function ShellSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true">
      <div className="fixed inset-y-0 start-0 hidden w-[272px] border-e border-rail-border bg-rail md:block" aria-hidden />
      <div className="md:ms-[272px]">
        <div className="flex h-14 items-center gap-3 border-b border-border px-4 sm:h-16 sm:px-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ms-auto h-8 w-8 rounded-full" />
        </div>
        <div className="space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 lg:col-span-2" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">
        Loading your workspace
      </span>
    </div>
  );
}
