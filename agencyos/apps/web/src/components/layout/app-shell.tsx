'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Users, FolderKanban, CheckSquare, UserCog, LifeBuoy, CreditCard, BarChart3, Sparkles, Bell, Settings, Shield, Menu, X, LogOut, ChevronDown, FileText, Building2, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { Notification } from '@/lib/types';

const agencyNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'My tasks', icon: CheckSquare },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/team', label: 'Team', icon: UserCog, management: true },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/assistant', label: 'AI assistant', icon: Sparkles },
];
const clientNav = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/billing', label: 'Invoices', icon: CreditCard },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, org, organizations, role, isLoading, logout, switchOrg, isManagement, isClient, isSuperAdmin } = useAuth();
  const pathname = usePathname(); const router = useRouter(); const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useEffect(() => { if (!isLoading && !user) router.replace('/login'); }, [isLoading, user, router]);
  React.useEffect(() => { setMobileOpen(false); }, [pathname]);
  const notifications = useQuery({ queryKey: ['notifications', org?.id], queryFn: () => api<Notification[]>('/notifications?unread=true'), enabled: !!org, refetchInterval: 60000 });
  const unread = notifications.data?.length ?? 0;
  if (isLoading || !user) return <div className="flex min-h-screen items-center justify-center"><div className="space-y-3 w-72"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div></div>;
  const nav = (isClient ? clientNav : agencyNav).filter((n) => !('management' in n) || !n.management || isManagement);
  const Sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-white/10"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 font-bold text-white">A</div><span className="text-lg font-semibold tracking-tight">AgencyOS</span></div>
      <div className="px-3 py-3">
        <DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10 focus-ring"><span className="flex items-center gap-2 truncate"><Building2 className="h-4 w-4 shrink-0 opacity-70" /><span className="truncate">{org?.name ?? 'Select organization'}</span></span><ChevronDown className="h-4 w-4 opacity-60" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64"><DropdownMenuLabel>Organizations</DropdownMenuLabel>{organizations.map((o) => <DropdownMenuItem key={o.id} onClick={() => switchOrg(o.id)}><span className="flex-1 truncate">{o.name}</span><span className="text-xs text-muted-foreground">{o.role}</span>{o.id === org?.id && <Check className="h-4 w-4" />}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => router.push('/settings?newOrg=1')}><Building2 />Create organization</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main navigation">
        {nav.map((item) => { const active = pathname === item.href || pathname.startsWith(item.href + '/'); return <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors', active ? 'bg-white/10 text-white' : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white')}><item.icon className="h-4 w-4" />{item.label}{item.href === '/support' && unread > 0 && isClient && <Badge variant="destructive" className="ml-auto">{unread}</Badge>}</Link>; })}
        {isSuperAdmin && !isClient && <Link href="/admin" className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium', pathname.startsWith('/admin') ? 'bg-white/10 text-white' : 'text-sidebar-foreground/70 hover:bg-white/5')}><Shield className="h-4 w-4" />Platform admin</Link>}
      </nav>
      <div className="border-t border-white/10 p-3 space-y-0.5">
        <Link href="/notifications" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"><Bell className="h-4 w-4" />Notifications{unread > 0 && <Badge className="ml-auto bg-indigo-500 text-white">{unread}</Badge>}</Link>
        {!isClient && <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"><Settings className="h-4 w-4" />Settings</Link>}
        <div className="flex items-center gap-3 px-3 pt-3"><Avatar name={user.name} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{user.name}</p><p className="truncate text-xs text-sidebar-foreground/60">{role?.replace('_', ' ')}</p></div><button onClick={logout} title="Sign out" className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-white/10 hover:text-white focus-ring"><LogOut className="h-4 w-4" /></button></div>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 lg:block fixed inset-y-0 left-0 z-30">{Sidebar}</aside>
      {mobileOpen && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} /><aside className="absolute inset-y-0 left-0 w-72">{Sidebar}<button className="absolute right-3 top-4 text-white" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></aside></div>}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></Button>
          <div className="hidden sm:block text-sm text-muted-foreground">{org?.name} <span className="mx-1">/</span> <span className="capitalize">{role?.toLowerCase().replace('_', ' ')}</span></div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative" onClick={async () => { await qc.invalidateQueries({ queryKey: ['notifications'] }); router.push('/notifications'); }} aria-label={`Notifications, ${unread} unread`}><Bell />{unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}</Button>
            <DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-full focus-ring"><Avatar name={user.name} /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>{user.email}</DropdownMenuLabel><DropdownMenuSeparator />{!isClient && <DropdownMenuItem onClick={() => router.push('/settings')}><Settings />Settings</DropdownMenuItem>}<DropdownMenuItem onClick={logout}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
