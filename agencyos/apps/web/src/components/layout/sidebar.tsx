'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Check, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/lib/providers';
import { cn } from '@/lib/utils';
import { ADMIN_NAV, FOOTER_NAV, NAV_SECTIONS, isActivePath, type NavItem } from '@/lib/nav';
import { SIDEBAR_MAX, SIDEBAR_MIN } from '@/lib/sidebar';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function NavLink({
  item,
  collapsed,
  unread,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  unread: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  const count = item.badge === 'notifications' ? unread : 0;
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-tour={`nav-${item.href.slice(1)}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-fast',
        'text-rail-muted hover:bg-white/[0.06] hover:text-rail-text',
        active && 'bg-white/[0.08] font-medium text-white',
        collapsed && 'justify-center px-0',
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-accent" />}
      <span className="relative shrink-0">
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        {collapsed && count > 0 && (
          <span aria-hidden className="absolute -end-1 -top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-rail" />
        )}
      </span>
      <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
      {!collapsed && count > 0 && (
        <span className="ms-auto rounded-xs bg-accent px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent-contrast">
          {count > 9 ? '9+' : count}
        </span>
      )}
      {collapsed && count > 0 && <span className="sr-only">{count} unread</span>}
    </Link>
  );

  return (
    <Tooltip content={item.label} side="right" disabled={!collapsed}>
      {link}
    </Tooltip>
  );
}

export interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  unread: number;
  onToggle: () => void;
  onNavigate?: () => void;
  /** Overlay mode is the tablet/mobile drawer: always expanded, with its own close affordance. */
  overlay?: boolean;
  handleProps?: React.HTMLAttributes<HTMLDivElement>;
  dragging?: boolean;
  width?: number;
}

export function Sidebar({
  items,
  collapsed,
  unread,
  onToggle,
  onNavigate,
  overlay = false,
  handleProps,
  dragging = false,
  width,
}: SidebarProps) {
  const { user, org, organizations, role, logout, switchOrg, isSuperAdmin, isClient } = useAuth();
  const router = useRouter();
  const rail = collapsed && !overlay;

  const footerItems = FOOTER_NAV.filter((item) => !(isClient && item.href === '/settings'));

  return (
    <div className="relative flex h-dvh flex-col border-e border-rail-border bg-rail [color-scheme:dark]">
      {/* Fixed: identity + workspace switcher */}
      <div className={cn('flex h-16 shrink-0 items-center gap-2.5 border-b border-rail-border px-4', rail && 'justify-center px-0')}>
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent font-mono text-sm font-semibold text-accent-contrast"
        >
          A
        </span>
        {!rail && <span className="truncate text-[15px] font-semibold tracking-tight text-white">AgencyOS</span>}
        {!overlay && !rail && (
          <Tooltip content="Collapse sidebar (⌘B)" side="bottom">
            <button
              type="button"
              onClick={onToggle}
              className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-sm text-rail-muted transition-colors duration-fast hover:bg-white/[0.06] hover:text-white"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </Tooltip>
        )}
      </div>

      <div className={cn('shrink-0 px-3 py-3', rail && 'px-2')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-md border border-rail-border bg-white/[0.04] px-3 py-2 text-start text-sm text-rail-text transition-colors duration-fast hover:bg-white/[0.08]',
                rail && 'h-10 justify-center px-0',
              )}
              aria-label={`Workspace: ${org?.name ?? 'none selected'}. Change workspace`}
            >
              {rail ? (
                <span aria-hidden className="font-mono text-xs font-semibold uppercase text-accent">
                  {(org?.name ?? 'A').slice(0, 2)}
                </span>
              ) : (
                <>
                  <Building2 className="h-4 w-4 shrink-0 text-rail-muted" strokeWidth={1.5} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{org?.name ?? 'Select workspace'}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-rail-muted" aria-hidden />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {organizations.map((o) => (
              <DropdownMenuItem key={o.id} onSelect={() => switchOrg(o.id)}>
                <span className="flex-1 truncate">{o.name}</span>
                <span className="text-xs capitalize text-ink-muted">{o.role.toLowerCase().replace('_', ' ')}</span>
                {o.id === org?.id && <Check className="h-4 w-4 text-accent" aria-hidden />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/settings?newOrg=1')}>
              <Building2 aria-hidden />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scrolls, but never shows a scrollbar. The edge fade signals that more items exist. */}
      <nav
        aria-label="Primary"
        className="no-scrollbar scroll-fade min-h-0 flex-1 overflow-y-auto px-3 py-1"
      >
        {NAV_SECTIONS.map((section) => {
          const group = items.filter((item) => item.section === section);
          if (group.length === 0) return null;
          return (
            <div key={section} className="mb-1">
              {rail ? (
                <div aria-hidden className="mx-2 my-2 border-t border-rail-border first:hidden" />
              ) : (
                <p className="px-3 pb-1 pt-3 text-[11px] font-medium text-rail-muted/80">{section}</p>
              )}
              <ul className="space-y-0.5">
                {group.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} collapsed={rail} unread={unread} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {isSuperAdmin && !isClient && (
          <div className="mt-1">
            {rail ? (
              <div aria-hidden className="mx-2 my-2 border-t border-rail-border" />
            ) : (
              <p className="px-3 pb-1 pt-3 text-[11px] font-medium text-rail-muted/80">Platform</p>
            )}
            <NavLink item={ADMIN_NAV} collapsed={rail} unread={0} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      {/* Pinned: never clipped by the scrolling region above, at any height or width. */}
      <div className="shrink-0 border-t border-rail-border p-3">
        <ul className="space-y-0.5">
          {footerItems.map((item) => (
            <li key={item.href}>
              <NavLink item={item} collapsed={rail} unread={unread} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        {rail ? (
          <div className="mt-2 flex flex-col items-center gap-1">
            <Tooltip content="Expand sidebar (⌘B)" side="right">
              <button
                type="button"
                onClick={onToggle}
                aria-label="Expand sidebar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-rail-muted transition-colors duration-fast hover:bg-white/[0.06] hover:text-white"
              >
                <PanelLeftOpen className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </button>
            </Tooltip>
            <UserMenu user={user} role={role} logout={logout} rail />
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-3 px-1 pt-2">
            <UserMenu user={user} role={role} logout={logout} />
          </div>
        )}
      </div>

      {/* Resize handle: 12px hit area, 1px visible line, keyboard operable. */}
      {!overlay && handleProps && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          aria-valuenow={width}
          tabIndex={0}
          {...handleProps}
          className="group absolute inset-y-0 -end-1.5 z-10 hidden w-3 cursor-col-resize touch-none lg:block"
        >
          <span
            aria-hidden
            className={cn(
              'absolute inset-y-0 start-1/2 w-px transition-colors duration-fast',
              dragging ? 'bg-accent' : 'bg-transparent group-hover:bg-accent group-focus-visible:bg-accent',
            )}
          />
        </div>
      )}
    </div>
  );
}

function UserMenu({
  user,
  role,
  logout,
  rail = false,
}: {
  user: { name: string; email: string } | null;
  role: string | null;
  logout: () => void;
  rail?: boolean;
}) {
  const router = useRouter();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-w-0 items-center gap-3 rounded-md p-1 text-start transition-colors duration-fast hover:bg-white/[0.06]',
            rail ? 'h-10 w-10 justify-center' : 'flex-1',
          )}
          aria-label={`Account: ${user.name}`}
        >
          <Avatar name={user.name} />
          {!rail && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{user.name}</span>
              <span className="block truncate text-xs capitalize text-rail-muted">{role?.toLowerCase().replace('_', ' ')}</span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={rail ? 'end' : 'start'} side={rail ? 'right' : 'top'} className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/settings')}>Account settings</DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type { NavItem };
