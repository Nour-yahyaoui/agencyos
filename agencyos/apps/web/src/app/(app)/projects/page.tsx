'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FolderKanban, Plus, Calendar, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Client, Membership, Paginated, Project } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { DataPagination } from '@/components/shared/data-pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { formatDate, formatMoney } from '@/lib/utils';
const schema = z.object({ name: z.string().min(2), clientId: z.string().min(1, 'Select a client'), description: z.string().optional(), budget: z.coerce.number().min(0).optional(), dueDate: z.string().optional(), memberIds: z.array(z.string()).optional() });
type Form = z.infer<typeof schema>;
function ProjectsInner() {
  const { org, isManagement, isClient } = useAuth(); const params = useSearchParams();
  const [page, setPage] = useState(1); const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [open, setOpen] = useState(false);
  const clientId = params.get('clientId') || '';
  const query = useQuery({ queryKey: ['projects', org?.id, page, q, status, clientId], queryFn: () => api<Paginated<Project>>(`/projects?page=${page}&limit=12&q=${encodeURIComponent(q)}${status !== 'all' ? `&status=${status}` : ''}${clientId ? `&clientId=${clientId}` : ''}`), enabled: !!org });
  const clients = useQuery({ queryKey: ['clients-all', org?.id], queryFn: () => api<Paginated<Client>>('/clients?limit=100'), enabled: !!org && isManagement });
  const members = useQuery({ queryKey: ['members', org?.id], queryFn: () => api<Membership[]>('/memberships'), enabled: !!org && isManagement });
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: '', clientId, description: '', memberIds: [] } });
  const create = useToastMutation({ mutationFn: (d: Form) => api<Project>('/projects', { method: 'POST', body: JSON.stringify({ ...d, budget: d.budget || undefined, dueDate: d.dueDate || undefined }) }), success: 'Project created', invalidate: [['projects'], ['dashboard']], onSuccess: () => { setOpen(false); form.reset(); } });
  const toggleMember = (id: string) => { const cur = form.getValues('memberIds') ?? []; form.setValue('memberIds', cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]); };
  return <div>
    <PageHeader title="Projects" description={isClient ? 'Track delivery progress and milestones.' : 'Delivery pipeline across all clients.'} actions={isManagement && <Button onClick={() => setOpen(true)}><Plus />New project</Button>} />
    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search projects or clients…" /><Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent>{['all', 'PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'].map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data!.data.length === 0 ? <EmptyState icon={FolderKanban} title="No projects found" description="Create a project to organize tasks, milestones, and delivery." action={isManagement && <Button onClick={() => setOpen(true)}><Plus />New project</Button>} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data!.data.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="group"><Card className="h-full transition-shadow group-hover:shadow-pop"><CardContent className="p-5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold group-hover:text-primary">{p.name}</p><p className="text-xs text-muted-foreground">{p.client.name}</p></div><StatusBadge status={p.status} /></div><p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">{p.description || 'No description.'}</p><div className="mt-4 flex items-center gap-3"><Progress value={p.progress ?? 0} className="flex-1" /><span className="text-xs font-medium">{p.progress ?? 0}%</span></div><div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(p.dueDate)}</span>{(p.overdueCount ?? 0) > 0 && <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{p.overdueCount} overdue</span>}</div><div className="mt-4 flex items-center justify-between"><div className="flex -space-x-2">{p.members.slice(0, 4).map((m) => <Avatar key={m.id} name={m.user.name} className="h-7 w-7 border-2 border-card text-[10px]" />)}</div>{!isClient && <span className="text-sm font-medium">{formatMoney(p.budget, p.currency)}</span>}</div></CardContent></Card></Link>)}</div>}
    {query.data && <div className="mt-4"><DataPagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} total={query.data.meta.total} onChange={setPage} /></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader><form method="post" onSubmit={form.handleSubmit((d) => create.mutate(d))} className="space-y-4"><FormField label="Project name" required error={form.formState.errors.name?.message}><Input {...form.register('name')} /></FormField><FormField label="Client" required error={form.formState.errors.clientId?.message}><Select value={form.watch('clientId')} onValueChange={(v) => form.setValue('clientId', v)}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.data?.data.filter((c) => c.status !== 'ARCHIVED').map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormField><FormField label="Description"><Textarea {...form.register('description')} /></FormField><div className="grid grid-cols-2 gap-4"><FormField label="Budget (USD)" error={form.formState.errors.budget?.message}><Input type="number" min={0} step="0.01" {...form.register('budget')} /></FormField><FormField label="Due date"><Input type="date" {...form.register('dueDate')} /></FormField></div><FormField label="Team members"><div className="flex flex-wrap gap-2">{members.data?.filter((m) => m.role !== 'CLIENT').map((m) => { const selected = (form.watch('memberIds') ?? []).includes(m.user.id); return <button type="button" key={m.user.id} onClick={() => toggleMember(m.user.id)} className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>{m.user.name}</button>; })}</div></FormField><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create project</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}
export default function ProjectsPage() { return <Suspense><ProjectsInner /></Suspense>; }
