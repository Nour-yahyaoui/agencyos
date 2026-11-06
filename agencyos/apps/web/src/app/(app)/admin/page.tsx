'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Building2, Users, FolderKanban, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Organization, Paginated, User } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatDate, formatMoney } from '@/lib/utils';
export default function AdminPage() {
  const { isSuperAdmin } = useAuth(); const [tab, setTab] = useState('orgs');
  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<{ users: number; organizations: number; projects: number; invoices: number; processedPayments: number }>('/admin/overview', { orgId: null }), enabled: isSuperAdmin });
  const orgs = useQuery({ queryKey: ['admin-orgs'], queryFn: () => api<Paginated<Organization>>('/admin/organizations?limit=50', { orgId: null }), enabled: isSuperAdmin });
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => api<Paginated<User & { isActive: boolean; _count: { memberships: number } }>>('/admin/users?limit=50', { orgId: null }), enabled: isSuperAdmin });
  const toggle = useToastMutation({ mutationFn: (u: { id: string; isActive: boolean }) => api(`/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: u.isActive }), orgId: null }), success: 'User updated', invalidate: [['admin-users']] });
  if (!isSuperAdmin) return <div className="flex flex-col items-center py-20 text-center"><Shield className="mb-3 h-10 w-10 text-muted-foreground" /><h2 className="font-semibold">Platform administrator access required</h2><p className="mt-1 text-sm text-muted-foreground">This area is separate from organization roles.</p></div>;
  return <div><PageHeader title="Platform administration" description="Cross-organization configuration. Actions are recorded in the global audit log." />
    {overview.data && <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Users" value={overview.data.users} icon={Users} /><StatCard label="Organizations" value={overview.data.organizations} icon={Building2} /><StatCard label="Projects" value={overview.data.projects} icon={FolderKanban} /><StatCard label="Invoices" value={overview.data.invoices} icon={CreditCard} /><StatCard label="Processed payments" value={formatMoney(overview.data.processedPayments)} icon={CreditCard} /></div>}
    <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="orgs">Organizations</TabsTrigger><TabsTrigger value="users">Users</TabsTrigger></TabsList>
      <TabsContent value="orgs">{orgs.isLoading ? <Skeleton className="h-64" /> : orgs.isError ? <ErrorState error={orgs.error} onRetry={() => orgs.refetch()} /> : <Card><Table><TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Plan</TableHead><TableHead>Members</TableHead><TableHead>Clients</TableHead><TableHead>Projects</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>{orgs.data!.data.map((o) => <TableRow key={o.id}><TableCell className="font-medium">{o.name}<p className="text-xs text-muted-foreground">{o.slug}</p></TableCell><TableCell>{o.subscription ? <StatusBadge status={o.subscription.status} /> : '—'}</TableCell><TableCell>{o._count?.memberships}</TableCell><TableCell>{o._count?.clients}</TableCell><TableCell>{o._count?.projects}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate((o as Organization & { createdAt?: string }).createdAt)}</TableCell></TableRow>)}</TableBody></Table></Card>}</TabsContent>
      <TabsContent value="users">{users.isLoading ? <Skeleton className="h-64" /> : users.isError ? <ErrorState error={users.error} onRetry={() => users.refetch()} /> : <Card><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Platform role</TableHead><TableHead>Organizations</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead /></TableRow></TableHeader><TableBody>{users.data!.data.map((u) => <TableRow key={u.id}><TableCell className="font-medium">{u.name}<p className="text-xs text-muted-foreground">{u.email}</p></TableCell><TableCell><Badge variant={u.platformRole === 'SUPER_ADMIN' ? 'purple' : 'secondary'}>{u.platformRole}</Badge></TableCell><TableCell>{u._count.memberships}</TableCell><TableCell><Badge variant={u.isActive ? 'success' : 'destructive'}>{u.isActive ? 'Active' : 'Disabled'}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => toggle.mutate({ id: u.id, isActive: !u.isActive })}>{u.isActive ? 'Disable' : 'Enable'}</Button></TableCell></TableRow>)}</TableBody></Table></Card>}</TabsContent>
    </Tabs>
  </div>;
}
