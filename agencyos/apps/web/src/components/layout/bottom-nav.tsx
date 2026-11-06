'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Building2, Check, LogOut, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '@/lib/providers';
import { cn } from '@/lib/utils';
import { ADMIN_NAV, FOOTER_NAV, NAV_SECTIONS, isActivePath, type NavItem } from '@/lib/nav';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme/theme';

/**
 * The phone navigation: four destinations plus "More".
 *
 * Everything that doesn't fit lives in a bottom sheet rather than a hamburger, so the four
 * things people actually open stay one tap away. The bar owns `--bottom-nav-h`; content
 * padding and the toast offset both read that variable, so nothing ever sits behind it.
 */
export function BottomNav({ items, unread }: { items: NavItem[]; unread: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const { isClient, isSuperAdmin } = useAuth();

  const slots = items.filter((item) => item.bottom).slice(0, 4);
  const rest = items.filter((item) => !slots.includes(item));
  const footerItems = FOOTER_NAV.filter((item) => !(isClient && item.href === '/settings'));
  const hiddenUnread = [...rest, ...footerItems].some((item) => item.badge === 'notifications' && unread > 0);
  const moreActive = moreOpen || [...rest, ...footerItems].some((item) => isActivePath(pathname, item.href));

  React.useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {slots.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => {
                    // Tapping where you already are takes you back to the top of the section.
                    if (active) {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    'relative flex h-14 min-w-12 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors duration-fast',
                    active ? 'font-medium text-accent' : 'text-ink-muted',
                  )}
                >
                  {active && <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />}
                  <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.5} aria-hidden />
                  <span className="truncate px-1">{item.shortLabel ?? item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                'relative flex h-14 w-full min-w-12 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors duration-fast',
                moreActive ? 'font-medium text-accent' : 'text-ink-muted',
              )}
            >
              <span className="relative">
                <MoreHorizontal className="h-6 w-6" strokeWidth={moreActive ? 2 : 1.5} aria-hidden />
                {hiddenUnread && (
                  <span aria-hidden className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
                )}
              </span>
              <span>More</span>
              {hiddenUnread && <span className="sr-only">{unread} unread notifications</span>}
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} items={rest} footerItems={footerItems} unread={unread} showAdmin={isSuperAdmin && !isClient} />
    </>
  );
}

function MoreSheet({
  open,
  onOpenChange,
  items,
  footerItems,
  unread,
  showAdmin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: NavItem[];
  footerItems: NavItem[];
  unread: number;
  showAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, org, organizations, role, logout, switchOrg } = useAuth();

  const row = (item: NavItem) => {
    const active = isActivePath(pathname, item.href);
    const Icon = item.icon;
    const count = item.badge === 'notifications' ? unread : 0;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex min-h-12 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-fast',
            active ? 'bg-accent-soft font-medium text-accent' : 'text-ink hover:bg-sunken',
          )}
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
          {item.label}
          {count > 0 && (
            <span className="ms-auto rounded-xs bg-accent px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent-contrast">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-overlay bg-ink/40 motion-safe:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-modal max-h-[85dvh] overflow-y-auto rounded-t-lg border-t border-border bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] shadow-3',
            'motion-safe:animate-rise-in',
          )}
        >
          <div className="sticky top-0 z-10 bg-surface px-4 pb-2 pt-3">
            <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-border-strong" />
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold">More</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-ink-muted hover:bg-sunken hover:text-ink"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Remaining destinations, workspace, and appearance</Dialog.Description>
          </div>

          <div className="space-y-5 px-4 pb-4">
            {NAV_SECTIONS.map((section) => {
              const group = items.filter((item) => item.section === section);
              if (group.length === 0) return null;
              return (
                <section key={section}>
                  <h3 className="px-3 pb-1 text-[11px] font-medium text-ink-faint">{section}</h3>
                  <ul className="space-y-0.5">{group.map(row)}</ul>
                </section>
              );
            })}

            <section>
              <h3 className="px-3 pb-1 text-[11px] font-medium text-ink-faint">Account</h3>
              <ul className="space-y-0.5">
                {footerItems.map(row)}
                {showAdmin && row(ADMIN_NAV)}
              </ul>
            </section>

            <section className="rounded-md border border-border p-3">
              <h3 className="pb-2 text-[11px] font-medium text-ink-faint">Workspace</h3>
              <ul className="space-y-0.5">
                {organizations.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => {
                        switchOrg(o.id);
                        onOpenChange(false);
                      }}
                      className={cn(
                        'flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-start text-sm transition-colors duration-fast',
                        o.id === org?.id ? 'bg-accent-soft font-medium text-accent' : 'text-ink hover:bg-sunken',
                      )}
                    >
                      <Building2 className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{o.name}</span>
                      {o.id === org?.id && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      router.push('/settings?newOrg=1');
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-start text-sm text-ink-muted transition-colors duration-fast hover:bg-sunken hover:text-ink"
                  >
                    <Building2 className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
                    Create workspace
                  </button>
                </li>
              </ul>
            </section>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-muted">Appearance</span>
              <ThemeToggle />
            </div>

            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Avatar name={user?.name ?? ''} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs capitalize text-ink-muted">{role?.toLowerCase().replace('_', ' ')}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border px-3 text-sm text-ink-muted transition-colors duration-fast hover:bg-sunken hover:text-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
