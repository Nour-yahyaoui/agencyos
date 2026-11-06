'use client';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Membership, Ticket } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatDate } from '@/lib/utils';
export default function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { org, isClient, isManagement, user } = useAuth(); const [text, setText] = useState('');
  const q = useQuery({ queryKey: ['ticket', id, org?.id], queryFn: () => api<Ticket>(`/support/tickets/${id}`), enabled: !!org });
  const members = useQuery({ queryKey: ['members', org?.id], queryFn: () => api<Membership[]>('/memberships'), enabled: !!org && !isClient });
  const invalidate = [['ticket', id], ['tickets'], ['dashboard']];
  const update = useToastMutation({ mutationFn: (d: Record<string, unknown>) => api(`/support/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(d) }), success: 'Ticket updated', invalidate });
  const comment = useToastMutation({ mutationFn: (body: string) => api('/comments', { method: 'POST', body: JSON.stringify({ ticketId: id, body }) }), success: 'Reply posted', invalidate: [['ticket', id]], onSuccess: () => setText('') });
  const del = useToastMutation({ mutationFn: (cid: string) => api(`/comments/${cid}`, { method: 'DELETE' }), success: 'Comment deleted', invalidate: [['ticket', id]] });
  if (q.isLoading) return <Skeleton className="h-96" />; if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const t = q.data!;
  return <div><PageHeader title={t.subject} description={`${t.client.name} · opened ${formatDate(t.createdAt)} by ${t.createdBy.name}`} actions={<><StatusBadge status={t.status} /><StatusBadge status={t.priority} /></>} />
    <div className="grid gap-6 lg:grid-cols-3"><div className="space-y-4 lg:col-span-2"><Card><CardHeader><CardTitle>Description</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm">{t.description}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Conversation ({t.comments?.length ?? 0})</CardTitle></CardHeader><CardContent className="space-y-3">{t.comments?.map((c) => <div key={c.id} className="rounded-md border p-3"><div className="flex items-center gap-2"><Avatar name={c.author.name} className="h-6 w-6 text-[10px]" /><span className="text-sm font-medium">{c.author.name}</span><span className="ml-auto text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>{(c.author.id === user?.id || isManagement) && <button onClick={() => del.mutate(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete comment"><Trash2 className="h-3.5 w-3.5" /></button>}</div><p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p></div>)}<form method="post" onSubmit={(e) => { e.preventDefault(); if (text.trim()) comment.mutate(text); }} className="space-y-2 pt-2"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={isClient ? 'Reply to the agency…' : 'Reply to the client…'} rows={3} /><div className="flex justify-end"><Button type="submit" loading={comment.isPending} disabled={!text.trim()}><Send />Post reply</Button></div></form></CardContent></Card></div>
      <Card className="h-fit"><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{formatDate(t.createdAt)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span>{formatDate(t.updatedAt)}</span></div>{!isClient ? <><div className="space-y-1.5"><p className="text-muted-foreground">Status</p><Select value={t.status} onValueChange={(v) => update.mutate({ status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><p className="text-muted-foreground">Priority</p><Select value={t.priority} onValueChange={(v) => update.mutate({ priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><p className="text-muted-foreground">Assignee</p><Select value={t.assignee?.id ?? 'none'} onValueChange={(v) => update.mutate({ assigneeId: v === 'none' ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{members.data?.filter((m) => m.role !== 'CLIENT').map((m) => <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>)}</SelectContent></Select></div></> : <div className="flex justify-between"><span className="text-muted-foreground">Assignee</span><span>{t.assignee?.name ?? 'Unassigned'}</span></div>}</CardContent></Card></div>
  </div>;
}
