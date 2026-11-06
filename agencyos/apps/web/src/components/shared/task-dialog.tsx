'use client';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, Send, Trash2, Link2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Comment, Milestone, Project, Task } from '@/lib/types';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from './status-badge';
const schema = z.object({ title: z.string().min(2), description: z.string().optional(), status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']), priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']), assigneeId: z.string().optional(), milestoneId: z.string().optional(), dueDate: z.string().optional(), estimatedHours: z.coerce.number().min(0).optional() });
type Form = z.infer<typeof schema>;
export function TaskDialog({ project, task, open, onOpenChange }: { project: Project; task: Task | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { isClient, isManagement, user } = useAuth();
  const canEdit = !isClient;
  const milestones = useQuery({ queryKey: ['milestones', project.id], queryFn: () => api<Milestone[]>(`/milestones?projectId=${project.id}`), enabled: open });
  const comments = useQuery({ queryKey: ['comments', task?.id], queryFn: () => api<Comment[]>(`/comments?taskId=${task!.id}`), enabled: open && !!task });
  const detail = useQuery({ queryKey: ['task', task?.id], queryFn: () => api<Task>(`/tasks/${task!.id}`), enabled: open && !!task });
  const full = detail.data ?? task;
  const form = useForm<Form>({ resolver: zodResolver(schema), values: { title: task?.title ?? '', description: task?.description ?? '', status: task?.status ?? 'TODO', priority: task?.priority ?? 'MEDIUM', assigneeId: task?.assignee?.id ?? task?.assigneeId ?? '', milestoneId: task?.milestone?.id ?? task?.milestoneId ?? '', dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '', estimatedHours: task?.estimatedHours ?? undefined } });
  React.useEffect(() => { if (!open) form.reset(); }, [open, form]);
  const invalidate = [['project', project.id], ['projects'], ['tasks'], ['dashboard'], ['task', task?.id], ['comments', task?.id]];
  const save = useToastMutation({ mutationFn: (d: Form) => { const body = { projectId: project.id, title: d.title, description: d.description || undefined, status: d.status, priority: d.priority, assigneeId: d.assigneeId || null, milestoneId: d.milestoneId || null, dueDate: d.dueDate || null, estimatedHours: d.estimatedHours }; return task ? api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(body) }) : api('/tasks', { method: 'POST', body: JSON.stringify(body) }); }, success: task ? 'Task updated' : 'Task created', invalidate, onSuccess: () => onOpenChange(false) });
  const remove = useToastMutation({ mutationFn: () => api(`/tasks/${task!.id}`, { method: 'DELETE' }), success: 'Task deleted', invalidate, onSuccess: () => onOpenChange(false) });
  const comment = useToastMutation({ mutationFn: (body: string) => api('/comments', { method: 'POST', body: JSON.stringify({ taskId: task!.id, body }) }), success: 'Comment posted', invalidate: [['comments', task?.id], ['project', project.id]] });
  const deleteComment = useToastMutation({ mutationFn: (id: string) => api(`/comments/${id}`, { method: 'DELETE' }), success: 'Comment deleted', invalidate: [['comments', task?.id]] });
  const addDep = useToastMutation({ mutationFn: (prerequisiteId: string) => api(`/tasks/${task!.id}/dependencies`, { method: 'POST', body: JSON.stringify({ prerequisiteId }) }), success: 'Dependency added', invalidate });
  const removeDep = useToastMutation({ mutationFn: (prerequisiteId: string) => api(`/tasks/${task!.id}/dependencies/${prerequisiteId}`, { method: 'DELETE' }), success: 'Dependency removed', invalidate });
  const [commentText, setCommentText] = React.useState(''); const [depId, setDepId] = React.useState('');
  const others = (project.tasks ?? []).filter((t) => t.id !== task?.id && !full?.dependencies?.some((d) => d.prerequisiteId === t.id));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{task ? (canEdit ? 'Edit task' : 'Task details') : 'New task'}</DialogTitle></DialogHeader>
    <div className="grid gap-6 md:grid-cols-5"><form onSubmit={form.handleSubmit((d) => save.mutate(d))} className="space-y-4 md:col-span-3">
      <FormField label="Title" required error={form.formState.errors.title?.message}><Input {...form.register('title')} disabled={!canEdit} /></FormField>
      <FormField label="Description"><Textarea {...form.register('description')} disabled={!canEdit} rows={4} /></FormField>
      <div className="grid grid-cols-2 gap-3"><FormField label="Status"><Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as Form['status'])} disabled={!canEdit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></FormField><FormField label="Priority"><Select value={form.watch('priority')} onValueChange={(v) => form.setValue('priority', v as Form['priority'])} disabled={!canEdit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormField></div>
      <div className="grid grid-cols-2 gap-3"><FormField label="Assignee"><Select value={form.watch('assigneeId') || 'none'} onValueChange={(v) => form.setValue('assigneeId', v === 'none' ? '' : v)} disabled={!canEdit}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{project.members.map((m) => <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>)}</SelectContent></Select></FormField><FormField label="Milestone"><Select value={form.watch('milestoneId') || 'none'} onValueChange={(v) => form.setValue('milestoneId', v === 'none' ? '' : v)} disabled={!canEdit}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{milestones.data?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></FormField></div>
      <div className="grid grid-cols-2 gap-3"><FormField label="Due date"><Input type="date" {...form.register('dueDate')} disabled={!canEdit} /></FormField><FormField label="Estimate (hours)"><Input type="number" min={0} step="0.5" {...form.register('estimatedHours')} disabled={!canEdit} /></FormField></div>
      {canEdit && <DialogFooter className="pt-2">{task && isManagement && <Button type="button" variant="destructive" onClick={() => remove.mutate()} loading={remove.isPending}><Trash2 />Delete</Button>}<Button type="submit" loading={save.isPending}>{task ? 'Save changes' : 'Create task'}</Button></DialogFooter>}
    </form>
    <div className="space-y-4 md:col-span-2">{task && <>
      <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4" />Dependencies</p><div className="space-y-1.5">{full?.dependencies?.length ? full.dependencies.map((d) => <div key={d.prerequisiteId} className="flex items-center justify-between rounded-md border p-2 text-xs"><span className="truncate">{d.prerequisite?.title ?? d.prerequisiteId}</span><div className="flex items-center gap-1">{d.prerequisite && <StatusBadge status={d.prerequisite.status} />}{canEdit && <button onClick={() => removeDep.mutate(d.prerequisiteId)} className="text-muted-foreground hover:text-destructive" aria-label="Remove dependency"><X className="h-3.5 w-3.5" /></button>}</div></div>) : <p className="text-xs text-muted-foreground">No prerequisites.</p>}{canEdit && others.length > 0 && <div className="flex gap-1"><Select value={depId} onValueChange={setDepId}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add prerequisite" /></SelectTrigger><SelectContent>{others.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" className="h-8" disabled={!depId} onClick={() => { addDep.mutate(depId); setDepId(''); }}>Add</Button></div>}</div></div>
      <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" />Comments</p><div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">{comments.data?.length ? comments.data.map((c) => <div key={c.id} className="rounded-md border p-2"><div className="flex items-center gap-2"><Avatar name={c.author.name} className="h-5 w-5 text-[9px]" /><span className="text-xs font-medium">{c.author.name}</span><span className="ml-auto text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>{(c.author.id === user?.id || isManagement) && <button onClick={() => deleteComment.mutate(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete comment"><Trash2 className="h-3 w-3" /></button>}</div><p className="mt-1 whitespace-pre-wrap text-xs">{c.body}</p></div>) : <p className="text-xs text-muted-foreground">No comments yet.</p>}</div><form onSubmit={(e) => { e.preventDefault(); if (!commentText.trim()) return; comment.mutate(commentText, { onSuccess: () => setCommentText('') }); }} className="mt-2 flex gap-1"><Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment…" className="h-8 text-xs" /><Button size="sm" className="h-8" type="submit" loading={comment.isPending} aria-label="Post comment"><Send /></Button></form></div>
    </>}</div></div></DialogContent></Dialog>;
}
