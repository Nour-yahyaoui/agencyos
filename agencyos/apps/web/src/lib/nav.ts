import {
  BarChart3,
  Bell,
  CheckSquare,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Shield,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavSection = 'Workspace' | 'Delivery' | 'Finance';

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the 56px bottom bar, where "My tasks" would wrap. */
  shortLabel?: string;
  icon: LucideIcon;
  section: NavSection;
  management?: boolean;
  /** One of the four fixed slots in the mobile bottom bar; everything else lives in "More". */
  bottom?: boolean;
  /** Show the unread-notifications count on this item. */
  badge?: 'notifications';
}

/**
 * The single source of truth for navigation. The sidebar, the bottom bar, the "More" sheet and
 * the tablet overlay all read this array, so a destination is never added in one place and
 * forgotten in another.
 */
export const AGENCY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Workspace', bottom: true },
  { href: '/clients', label: 'Clients', icon: Users, section: 'Workspace', bottom: true },
  { href: '/team', label: 'Team', icon: UserCog, section: 'Workspace', management: true },
  { href: '/projects', label: 'Projects', icon: FolderKanban, section: 'Delivery', bottom: true },
  { href: '/tasks', label: 'My tasks', shortLabel: 'Tasks', icon: CheckSquare, section: 'Delivery', bottom: true },
  { href: '/documents', label: 'Documents', icon: FileText, section: 'Delivery' },
  { href: '/support', label: 'Support', icon: LifeBuoy, section: 'Delivery' },
  { href: '/assistant', label: 'AI assistant', shortLabel: 'Assistant', icon: Sparkles, section: 'Delivery' },
  { href: '/billing', label: 'Billing', icon: CreditCard, section: 'Finance' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, section: 'Finance' },
];

export const CLIENT_NAV: NavItem[] = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard, section: 'Workspace', bottom: true },
  { href: '/projects', label: 'Projects', icon: FolderKanban, section: 'Delivery', bottom: true },
  { href: '/documents', label: 'Documents', icon: FileText, section: 'Delivery' },
  { href: '/support', label: 'Support', icon: LifeBuoy, section: 'Delivery', bottom: true },
  { href: '/billing', label: 'Invoices', icon: CreditCard, section: 'Finance', bottom: true },
];

/** Pinned below the scrolling region so these are never clipped, at any sidebar height. */
export const FOOTER_NAV: NavItem[] = [
  { href: '/notifications', label: 'Notifications', icon: Bell, section: 'Workspace', badge: 'notifications' },
  { href: '/settings', label: 'Settings', icon: Settings, section: 'Workspace' },
];

export const ADMIN_NAV: NavItem = { href: '/admin', label: 'Platform admin', icon: Shield, section: 'Workspace' };

export const NAV_SECTIONS: NavSection[] = ['Workspace', 'Delivery', 'Finance'];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function visibleNav(items: NavItem[], opts: { isManagement: boolean }) {
  return items.filter((item) => !item.management || opts.isManagement);
}
