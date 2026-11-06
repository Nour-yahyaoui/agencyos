import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScope } from '../common/decorators/scope.decorator';
import { ProjectsService } from '../projects/projects.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { AuditService } from '../common/audit.service';

export type AssistantAction = 'project_summary' | 'overdue_analysis' | 'status_report' | 'prioritize_tasks' | 'ticket_summary' | 'delivery_risks';
const ACTIONS: AssistantAction[] = ['project_summary', 'overdue_analysis', 'status_report', 'prioritize_tasks', 'ticket_summary', 'delivery_risks'];

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService, private projects: ProjectsService, private integrations: IntegrationsService, private config: ConfigService, private audit: AuditService) {}
  status() { return this.integrations.status().openai; }
  async assist(s: TenantScope, action: AssistantAction, projectId?: string, ticketId?: string) {
    if (!ACTIONS.includes(action)) throw new BadRequestException('Unsupported assistant action');
    const openai = this.integrations.getOpenAI(); // throws explicit 503 when unconfigured; never fabricates output
    const context = await this.buildContext(s, action, projectId, ticketId);
    const system = `You are AgencyOS, an operations assistant for a software agency. Use ONLY the provided JSON context. Do not invent facts, dates, people, or metrics. If data is insufficient, say so. Be concise, actionable, and professional. Output plain text with short headings and bullet points. Action: ${action}.`;
    const response = await openai.chat.completions.create({ model: this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(context) }], temperature: 0.2, max_tokens: 900 });
    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new BadRequestException('AI provider returned an empty response');
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'ai.assist', entityType: 'AiRequest', metadata: { action, projectId, ticketId, model: response.model, promptTokens: response.usage?.prompt_tokens, completionTokens: response.usage?.completion_tokens } });
    return { action, result: text, model: response.model, usage: response.usage, contextCounts: context.counts, generatedAt: new Date().toISOString() };
  }
  async buildContext(s: TenantScope, action: AssistantAction, projectId?: string, ticketId?: string) {
    const projectWhere = this.projects.projectWhere(s, projectId ? { id: projectId } : {});
    const now = new Date();
    const [projects, tasks, tickets] = await Promise.all([
      this.prisma.project.findMany({ where: projectWhere, take: 20, select: { id: true, name: true, status: true, dueDate: true, budget: true, client: { select: { name: true } }, tasks: { select: { status: true, dueDate: true, priority: true } } } }),
      this.prisma.task.findMany({ where: { organizationId: s.organizationId, project: projectWhere, ...(action === 'overdue_analysis' ? { status: { not: 'DONE' }, dueDate: { lt: now } } : { status: { not: 'DONE' } }) }, take: 100, select: { id: true, title: true, status: true, priority: true, dueDate: true, project: { select: { name: true } }, assignee: { select: { name: true } }, dependencies: { select: { prerequisite: { select: { title: true, status: true } } } } } }),
      this.prisma.supportTicket.findMany({ where: { organizationId: s.organizationId, ...(ticketId ? { id: ticketId } : {}), ...(s.role === 'CLIENT' ? { clientId: s.clientId ?? '__none__' } : {}), status: { not: 'CLOSED' } }, take: 30, select: { id: true, subject: true, status: true, priority: true, createdAt: true, client: { select: { name: true } }, comments: { take: 5, orderBy: { createdAt: 'desc' }, select: { body: true, createdAt: true } } } }),
    ]);
    return { action, asOf: now.toISOString(), counts: { projects: projects.length, openTasks: tasks.length, tickets: tickets.length }, projects: projects.map((p) => ({ name: p.name, client: p.client.name, status: p.status, dueDate: p.dueDate, budget: p.budget ? Number(p.budget) : null, totalTasks: p.tasks.length, doneTasks: p.tasks.filter((t) => t.status === 'DONE').length, overdueTasks: p.tasks.filter((t) => t.status !== 'DONE' && t.dueDate && t.dueDate < now).length })), tasks: tasks.map((t) => ({ title: t.title, project: t.project.name, status: t.status, priority: t.priority, dueDate: t.dueDate, assignee: t.assignee?.name ?? null, blockedBy: t.dependencies.map((d) => d.prerequisite.title) })), tickets: tickets.map((t) => ({ subject: t.subject, client: t.client.name, status: t.status, priority: t.priority, createdAt: t.createdAt, recentComments: t.comments.map((c) => c.body.slice(0, 300)) })) };
  }
}
