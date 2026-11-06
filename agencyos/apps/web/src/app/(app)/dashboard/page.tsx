'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, CreditCard, FolderKanban, LifeBuoy, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import type { Dashboard } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@/lib/utils';
const colors = ['#94a3b8', '#6366f1', '#8b5cf6', '#f59e0b', '#10b981'];
export default function DashboardPage() {
  const { org, isClient, user } = useAuth();
  const q = useQuery({ queryKey: ['dashboard', org?.id], queryFn: () => api<Dashboard>('/analytics/dashboard'), enabled: !!org });
  if (q.isLoading) return <div className="space-y-6"><Skeleton className="h-9 w-64" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-80" /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  return <div>
    <PageHeader title={isClient ? 'Client overview' : `Good to see you, ${user?.name.split(' ')[0]}`} description={isClient ? 'Your projects, invoices, and support activity.' : 'Live operational and financial metrics from your workspace.'} actions={!isClient && <Button asChild><Link href="/projects">View projects <ArrowRight /></Link></Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active projects" value={d.kpis.activeProjects} hint={`${d.kpis.totalProjects} total`} icon={FolderKanban} />
      <StatCard label="Completion rate" value={`${d.kpis.completionRate}%`} hint="Tasks completed" icon={CheckCircle2} trend="up" />
      <StatCard label="Overdue tasks" value={d.kpis.overdueTasks} hint={d.kpis.overdueTasks ? 'Needs attention' : 'On track'} icon={AlertTriangle} trend={d.kpis.overdueTasks ? 'down' : 'neutral'} />
      {isClient ? <StatCard label="Open tickets" value={d.kpis.openTickets} icon={LifeBuoy} /> : <StatCard label="Revenue (6 mo)" value={formatMoney(d.kpis.revenue)} hint={`${formatMoney(d.kpis.outstanding)} outstanding`} icon={CreditCard} />}
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Revenue trend</CardTitle><CardDescription>Succeeded payments, last six months. {isClient ? 'Your invoices only.' : 'All workspace payments.'}</CardDescription></CardHeader><CardContent className="h-72">{d.revenueByMonth.every((m) => m.revenue === 0) ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No payments recorded in this period.</div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={d.revenueByMonth} margin={{ left: 0, right: 12, top: 8 }}><defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} /><Tooltip formatter={(v) => formatMoney(Number(v))} /><Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" /></AreaChart></ResponsiveContainer>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Task distribution</CardTitle><CardDescription>Across visible projects</CardDescription></CardHeader><CardContent className="h-72">{d.tasksByStatus.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No tasks yet.</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={d.tasksByStatus} layout="vertical" margin={{ left: 8 }}><XAxis type="number" hide /><YAxis type="category" dataKey="status" width={90} tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).replace('_', ' ')} /><Tooltip /><Bar dataKey="count" radius={[0, 4, 4, 0]}>{d.tasksByStatus.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer>}</CardContent></Card>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Recent projects</CardTitle><CardDescription>Progress computed from task completion</CardDescription></CardHeader><CardContent className="space-y-4">{d.recentProjects.length === 0 ? <p className="text-sm text-muted-foreground">No projects yet.</p> : d.recentProjects.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-md border p-3 hover:bg-muted/40"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.client} · due {formatDate(p.dueDate)}</p></div><div className="flex items-center gap-2"><StatusBadge status={p.status} />{p.overdue > 0 && <span className="text-xs text-destructive">{p.overdue} overdue</span>}</div></div><div className="mt-2 flex items-center gap-3"><Progress value={p.progress} className="flex-1" /><span className="text-xs font-medium">{p.progress}%</span></div></Link>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>{isClient ? 'Workspace health' : 'Team workload'}</CardTitle><CardDescription>{isClient ? 'Summary' : 'Open tasks per member'}</CardDescription></CardHeader><CardContent>{isClient ? <div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Projects</span><span className="font-medium">{d.kpis.totalProjects}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-medium">{formatMoney(d.kpis.outstanding)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Open tickets</span><span className="font-medium">{d.kpis.openTickets}</span></div></div> : d.workload.length === 0 ? <p className="text-sm text-muted-foreground">No team members.</p> : <div className="space-y-3">{d.workload.map((w) => <div key={w.userId} className="flex items-center justify-between text-sm"><span className="truncate">{w.name}</span><div className="flex items-center gap-2"><span className="rounded bg-muted px-2 py-0.5 text-xs">{w.openTasks} open</span>{w.overdue > 0 && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">{w.overdue} late</span>}</div></div>)}</div>}<div className="mt-5 flex items-center gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground"><Activity className="h-4 w-4" />Generated {new Date(d.generatedAt).toLocaleTimeString()}</div></CardContent></Card>
    </div>
  </div>;
}
