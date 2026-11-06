'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, AlertTriangle, FileText, ListChecks, LifeBuoy, ShieldAlert, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Paginated, Project } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
const actions = [
  { id: 'project_summary', label: 'Project progress summary', icon: BarChart3, desc: 'Summarize delivery status across visible projects.' },
  { id: 'overdue_analysis', label: 'Overdue task analysis', icon: AlertTriangle, desc: 'Explain overdue work and likely blockers.' },
  { id: 'status_report', label: 'Client status report', icon: FileText, desc: 'Draft a concise status update for stakeholders.' },
  { id: 'prioritize_tasks', label: 'Task prioritization', icon: ListChecks, desc: 'Suggest an order of work based on priority and dependencies.' },
  { id: 'ticket_summary', label: 'Support ticket summary', icon: LifeBuoy, desc: 'Summarize open support themes and urgency.' },
  { id: 'delivery_risks', label: 'Delivery risk identification', icon: ShieldAlert, desc: 'Identify schedule, dependency, and workload risks.' },
] as const;
export default function AssistantPage() {
  const { org, isClient } = useAuth(); const [action, setAction] = useState<typeof actions[number]['id']>('project_summary'); const [projectId, setProjectId] = useState('all');
  const status = useQuery({ queryKey: ['ai-status', org?.id], queryFn: () => api<{ configured: boolean; model: string | null }>('/ai/status'), enabled: !!org });
  const projects = useQuery({ queryKey: ['projects-all', org?.id], queryFn: () => api<Paginated<Project>>('/projects?limit=100'), enabled: !!org });
  const assist = useToastMutation({ mutationFn: () => api<{ result: string; model: string; usage?: { total_tokens: number }; contextCounts: { projects: number; openTasks: number; tickets: number }; generatedAt: string }>('/ai/assist', { method: 'POST', body: JSON.stringify({ action, projectId: projectId === 'all' ? undefined : projectId }) }) });
  if (isClient) return <div className="text-sm text-muted-foreground">The AI assistant is available to agency team members.</div>;
  return <div><PageHeader title="AI productivity assistant" description="Grounded in your workspace data. Results are generated only when OpenAI is configured." />
    <div className="grid gap-6 lg:grid-cols-3"><div className="space-y-4"><Card><CardHeader><CardTitle>Choose an analysis</CardTitle><CardDescription>The API assembles tenant-scoped context before calling the model.</CardDescription></CardHeader><CardContent className="space-y-2">{actions.map((a) => <button key={a.id} onClick={() => setAction(a.id)} className={cn('flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors', action === a.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40')}><a.icon className={cn('mt-0.5 h-4 w-4', action === a.id ? 'text-primary' : 'text-muted-foreground')} /><div><p className="text-sm font-medium">{a.label}</p><p className="text-xs text-muted-foreground">{a.desc}</p></div></button>)}</CardContent></Card>
      <Card><CardContent className="space-y-3 pt-5"><div className="space-y-1.5"><p className="text-sm font-medium">Project scope</p><Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All visible projects</SelectItem>{projects.data?.data.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div><Button className="w-full" onClick={() => assist.mutate()} loading={assist.isPending} disabled={status.isLoading}><Sparkles />Generate analysis</Button>{status.data && !status.data.configured && <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning"><p className="font-medium">OpenAI is not configured</p><p className="mt-1">Set OPENAI_API_KEY on the API to enable generation. The assistant will not fabricate results or return mock text.</p></div>}{status.data?.configured && <p className="text-xs text-muted-foreground">Model: {status.data.model}</p>}</CardContent></Card></div>
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Result</CardTitle><CardDescription>{assist.data ? `${assist.data.model} · context: ${assist.data.contextCounts.projects} projects, ${assist.data.contextCounts.openTasks} open tasks, ${assist.data.contextCounts.tickets} tickets · ${new Date(assist.data.generatedAt).toLocaleString()}` : 'Generated output appears here.'}</CardDescription></CardHeader><CardContent>{assist.isPending ? <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div> : assist.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{assist.error.message}</div> : assist.data ? <div className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">{assist.data.result}</div> : <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground"><Sparkles className="mb-3 h-10 w-10 opacity-40" /><p className="text-sm">Select an analysis and generate. Context is limited to your organization and project permissions.</p></div>}</CardContent></Card></div>
  </div>;
}
