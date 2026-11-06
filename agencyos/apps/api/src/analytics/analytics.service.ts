import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScope } from '../common/decorators/scope.decorator';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService, private projects: ProjectsService) {}
  async dashboard(s: TenantScope) {
    const orgId = s.organizationId;
    const now = new Date();
    const projectWhere = this.projects.projectWhere(s);
    const clientWhere = { organizationId: orgId, ...(s.role === 'CLIENT' ? { id: s.clientId ?? '__none__' } : {}) };
    const taskWhere = { organizationId: orgId, project: projectWhere };
    const invoiceWhere = { organizationId: orgId, ...(s.role === 'CLIENT' ? { clientId: s.clientId ?? '__none__', status: { not: 'DRAFT' as const } } : {}) };
    const [activeProjects, totalProjects, totalTasks, doneTasks, overdueTasks, totalClients, activeClients, openTickets, invoices, payments, recentProjects, workload, projectPerformance] = await Promise.all([
      this.prisma.project.count({ where: { ...projectWhere, status: 'ACTIVE' } }),
      this.prisma.project.count({ where: projectWhere }),
      this.prisma.task.count({ where: taskWhere }),
      this.prisma.task.count({ where: { ...taskWhere, status: 'DONE' } }),
      this.prisma.task.count({ where: { ...taskWhere, status: { not: 'DONE' }, dueDate: { lt: now } } }),
      this.prisma.client.count({ where: clientWhere }),
      this.prisma.client.count({ where: { ...clientWhere, status: 'ACTIVE' } }),
      this.prisma.supportTicket.count({ where: { organizationId: orgId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] }, ...(s.role === 'CLIENT' ? { clientId: s.clientId ?? '__none__' } : {}) } }),
      this.prisma.invoice.findMany({ where: invoiceWhere, select: { status: true, total: true, dueDate: true } }),
      this.prisma.payment.findMany({ where: { organizationId: orgId, status: 'SUCCEEDED', createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }, ...(s.role === 'CLIENT' ? { invoice: { clientId: s.clientId ?? '__none__' } } : {}) }, select: { amount: true, createdAt: true } }),
      this.prisma.project.findMany({ where: projectWhere, orderBy: { updatedAt: 'desc' }, take: 6, include: { client: { select: { name: true } }, tasks: { select: { status: true, dueDate: true } } } }),
      s.role === 'CLIENT' ? Promise.resolve([]) : this.prisma.user.findMany({ where: { memberships: { some: { organizationId: orgId, role: { in: ['OWNER', 'MANAGER', 'DEVELOPER'] } } } }, select: { id: true, name: true, assignedTasks: { where: { organizationId: orgId, status: { not: 'DONE' } }, select: { id: true, priority: true, dueDate: true } } } }),
      this.prisma.project.findMany({ where: projectWhere, take: 50, select: { id: true, name: true, status: true, dueDate: true, budget: true, tasks: { select: { status: true, dueDate: true } }, client: { select: { name: true } } } }),
    ]);
    const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = invoices.filter((i) => ['SENT', 'OVERDUE'].includes(i.status)).reduce((sum, i) => sum + Number(i.total), 0);
    const overdueInvoices = invoices.filter((i) => ['SENT', 'OVERDUE'].includes(i.status) && i.dueDate < now).length;
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = d.toISOString().slice(0, 7); revenueByMonth.push({ month: key, revenue: Math.round(payments.filter((p) => p.createdAt.toISOString().slice(0, 7) === key).reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100 }); }
    const tasksByStatus = await this.prisma.task.groupBy({ by: ['status'], where: taskWhere, _count: { _all: true } });
    return {
      kpis: { activeProjects, totalProjects, completionRate: totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0, overdueTasks, totalClients, activeClients, openTickets, revenue: Math.round(revenue * 100) / 100, outstanding: Math.round(outstanding * 100) / 100, overdueInvoices },
      revenueByMonth,
      tasksByStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count._all })),
      recentProjects: recentProjects.map((p) => { const done = p.tasks.filter((t) => t.status === 'DONE').length; return { id: p.id, name: p.name, client: p.client.name, status: p.status, progress: p.tasks.length ? Math.round(done / p.tasks.length * 100) : 0, overdue: p.tasks.filter((t) => t.status !== 'DONE' && t.dueDate && t.dueDate < now).length, dueDate: p.dueDate }; }),
      workload: workload.map((u) => ({ userId: u.id, name: u.name, openTasks: u.assignedTasks.length, urgent: u.assignedTasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length, overdue: u.assignedTasks.filter((t) => t.dueDate && t.dueDate < now).length })),
      projectPerformance: projectPerformance.map((p) => { const done = p.tasks.filter((t) => t.status === 'DONE').length; return { id: p.id, name: p.name, client: p.client.name, status: p.status, progress: p.tasks.length ? Math.round(done / p.tasks.length * 100) : 0, overdue: p.tasks.filter((t) => t.status !== 'DONE' && t.dueDate && t.dueDate < now).length, budget: p.budget ? Number(p.budget) : null, dueDate: p.dueDate }; }),
      generatedAt: now.toISOString(),
    };
  }
}
