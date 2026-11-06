'use client';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import type { Dashboard } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatDate, formatMoney, titleCase } from '@/lib/utils';
const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];
export default function AnalyticsPage() {
  const { org, isClient } = useAuth();
  const q = useQuery({ queryKey: ['dashboard', org?.id], queryFn: () => api<Dashboard>('/analytics/dashboard'), enabled: !!org });
  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  return <div><PageHeader title="Analytics" description="Database-backed reporting. No hardcoded demonstration numbers." />
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Revenue by month</CardTitle><CardDescription>Succeeded payments, trailing six months</CardDescription></CardHeader><CardContent className="h-72"><ResponsiveContainer><LineChart data={d.revenueByMonth}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} /><Tooltip formatter={(v) => formatMoney(Number(v))} /><Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Tasks by status</CardTitle><CardDescription>Visible projects</CardDescription></CardHeader><CardContent className="h-72">{d.tasksByStatus.length ? <ResponsiveContainer><PieChart><Pie data={d.tasksByStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>{d.tasksByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend formatter={(v) => titleCase(String(v))} /></PieChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground">No tasks.</p>}</CardContent></Card>
      {!isClient && <Card><CardHeader><CardTitle>Team workload</CardTitle><CardDescription>Open, high-priority, and overdue tasks</CardDescription></CardHeader><CardContent className="h-72">{d.workload.length ? <ResponsiveContainer><BarChart data={d.workload}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Bar dataKey="openTasks" name="Open" fill="#6366f1" radius={[4, 4, 0, 0]} /><Bar dataKey="urgent" name="High/urgent" fill="#f59e0b" radius={[4, 4, 0, 0]} /><Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground">No team data.</p>}</CardContent></Card>}
      <Card><CardHeader><CardTitle>Outstanding invoices</CardTitle><CardDescription>{formatMoney(d.kpis.outstanding)} across unpaid sent invoices</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 gap-4"><div className="rounded-md bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="mt-1 text-2xl font-semibold">{formatMoney(d.kpis.outstanding)}</p></div><div className="rounded-md bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Overdue invoices</p><p className="mt-1 text-2xl font-semibold text-destructive">{d.kpis.overdueInvoices}</p></div><div className="rounded-md bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Active clients</p><p className="mt-1 text-2xl font-semibold">{d.kpis.activeClients} / {d.kpis.totalClients}</p></div><div className="rounded-md bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Open tickets</p><p className="mt-1 text-2xl font-semibold">{d.kpis.openTickets}</p></div></div></CardContent></Card>
    </div>
    <Card className="mt-6"><CardHeader><CardTitle>Project performance</CardTitle><CardDescription>Completion, overdue tasks, and budget</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead><TableHead>Overdue</TableHead><TableHead>Due</TableHead>{!isClient && <TableHead className="text-right">Budget</TableHead>}</TableRow></TableHeader><TableBody>{d.projectPerformance.map((p) => <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-sm">{p.client}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell><TableCell><div className="flex items-center gap-2"><Progress value={p.progress} className="w-24" /><span className="text-xs">{p.progress}%</span></div></TableCell><TableCell className={p.overdue ? 'text-destructive font-medium' : ''}>{p.overdue}</TableCell><TableCell className="text-sm">{formatDate(p.dueDate)}</TableCell>{!isClient && <TableCell className="text-right">{formatMoney(p.budget)}</TableCell>}</TableRow>)}</TableBody></Table></CardContent></Card>
  </div>;
}
