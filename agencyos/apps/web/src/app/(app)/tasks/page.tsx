'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import type { Paginated, Task } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { DataPagination } from '@/components/shared/data-pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
export default function TasksPage() {
  const { org, user, isClient } = useAuth(); const [page, setPage] = useState(1); const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [mine, setMine] = useState(true); const [overdue, setOverdue] = useState(false);
  const query = useQuery({ queryKey: ['tasks', org?.id, page, q, status, mine, overdue], queryFn: () => api<Paginated<Task>>(`/tasks?page=${page}&limit=20&q=${encodeURIComponent(q)}${status !== 'all' ? `&status=${status}` : ''}${mine && !isClient ? `&assigneeId=${user!.id}` : ''}${overdue ? '&overdue=true' : ''}`), enabled: !!org });
  return <div><PageHeader title={isClient ? 'Tasks' : 'My tasks'} description="Assignment, priority, and deadline tracking across projects." actions={<Button variant={overdue ? 'destructive' : 'outline'} onClick={() => { setOverdue(!overdue); setPage(1); }}><AlertTriangle />Overdue only</Button>} />
    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search tasks…" /><Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{['all', 'BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>{!isClient && <Button variant={mine ? 'default' : 'outline'} onClick={() => { setMine(!mine); setPage(1); }}>{mine ? 'Assigned to me' : 'All visible tasks'}</Button>}</div>
    {query.isLoading ? <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data!.data.length === 0 ? <EmptyState icon={CheckSquare} title="No tasks match" description="Adjust filters or create tasks from a project board." /> : <Card><Table><TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Assignee</TableHead><TableHead>Due</TableHead></TableRow></TableHeader><TableBody>{query.data!.data.map((t) => <TableRow key={t.id}><TableCell><Link href={`/projects/${t.projectId}`} className="font-medium hover:text-primary">{t.title}</Link></TableCell><TableCell className="text-sm text-muted-foreground">{t.project?.name}</TableCell><TableCell><StatusBadge status={t.status} /></TableCell><TableCell><StatusBadge status={t.priority} /></TableCell><TableCell className="text-sm">{t.assignee?.name ?? '—'}</TableCell><TableCell className={t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date() ? 'text-destructive font-medium' : 'text-sm'}>{formatDate(t.dueDate)}</TableCell></TableRow>)}</TableBody></Table><div className="px-3 pb-3"><DataPagination page={query.data!.meta.page} totalPages={query.data!.meta.totalPages} total={query.data!.meta.total} onChange={setPage} /></div></Card>}
  </div>;
}
