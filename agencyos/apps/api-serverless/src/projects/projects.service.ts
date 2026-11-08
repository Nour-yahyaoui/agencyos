import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScope } from '../common/decorators/scope.decorator';
import { AuditService } from '../common/audit.service';
import { NotificationService } from '../notifications/notifications.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';

export interface TaskStats { taskCount: number; doneCount: number; overdueCount: number }
export const progressOf = (st: TaskStats) => (st.taskCount ? Math.round(st.doneCount / st.taskCount * 100) : 0);

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notifications: NotificationService) {}

  projectWhere(s: TenantScope, extra: Prisma.ProjectWhereInput = {}): Prisma.ProjectWhereInput {
    const base: Prisma.ProjectWhereInput = { organizationId: s.organizationId, ...extra };
    if (s.role === 'CLIENT') return { ...base, clientId: s.clientId ?? '__none__' };
    if (s.role === 'DEVELOPER') return { ...base, members: { some: { userId: s.userId } } };
    return base;
  }
  async assertAccess(s: TenantScope, id: string) {
    const p = await this.prisma.project.findFirst({ where: this.projectWhere(s, { id }) });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }
  async list(s: TenantScope, query: { q?: string; status?: string; clientId?: string; page: number; limit: number; skip: number }) {
    const where = this.projectWhere(s, { ...(query.status ? { status: query.status as ProjectStatus } : {}), ...(query.clientId ? { clientId: query.clientId } : {}), ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }, { client: { name: { contains: query.q, mode: 'insensitive' } } }] } : {}) });
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({ where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' }, include: { client: { select: { id: true, name: true, company: true } }, members: { include: { user: { select: { id: true, name: true, email: true } } } }, _count: { select: { tasks: true, milestones: true } } } }),
      this.prisma.project.count({ where }),
    ]);
    // Aggregate per-project task counts in the database instead of loading every task row.
    const stats = await this.taskStats(data.map((p) => p.id));
    return { data: data.map((p) => { const st = stats.get(p.id)!; return { ...p, progress: progressOf(st), taskCount: st.taskCount, doneCount: st.doneCount, overdueCount: st.overdueCount }; }), meta: { total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) } };
  }
  async get(s: TenantScope, id: string) {
    await this.assertAccess(s, id);
    const p = await this.prisma.project.findUniqueOrThrow({ where: { id }, include: { client: { select: { id: true, name: true, company: true } }, members: { include: { user: { select: { id: true, name: true, email: true } } } }, milestones: { orderBy: { dueDate: 'asc' } }, tasks: { orderBy: [{ status: 'asc' }, { position: 'asc' }], include: { assignee: { select: { id: true, name: true, email: true } }, milestone: { select: { id: true, name: true } }, dependencies: { select: { prerequisiteId: true } }, _count: { select: { comments: true } } } }, documents: { orderBy: { createdAt: 'desc' } }, _count: { select: { invoices: true } } } });
    const done = p.tasks.filter((t) => t.status === 'DONE').length;
    return { ...p, progress: p.tasks.length ? Math.round(done / p.tasks.length * 100) : 0 };
  }
  async create(s: TenantScope, dto: CreateProjectDto) {
    const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, organizationId: s.organizationId, status: { not: 'ARCHIVED' } } });
    if (!client) throw new BadRequestException('Client not found in this organization');
    const memberIds = Array.from(new Set([...(dto.memberIds ?? []), s.userId]));
    await this.assertMembers(s, memberIds);
    const project = await this.prisma.project.create({ data: { organizationId: s.organizationId, clientId: dto.clientId, name: dto.name, description: dto.description, budget: dto.budget, currency: dto.currency ?? 'USD', startDate: dto.startDate ? new Date(dto.startDate) : undefined, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, status: 'PLANNED', members: { create: memberIds.map((userId) => ({ userId })) } }, include: { client: true, members: true } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'project.created', entityType: 'Project', entityId: project.id, metadata: { clientId: dto.clientId, name: dto.name } });
    await Promise.all(memberIds.filter((id) => id !== s.userId).map((userId) => this.notifications.notify({ organizationId: s.organizationId, userId, type: 'PROJECT_ACTIVITY', title: `Added to project ${project.name}`, body: `You have been assigned to ${project.name}.`, link: `/projects/${project.id}` })));
    return project;
  }
  async update(s: TenantScope, id: string, dto: UpdateProjectDto) {
    await this.assertAccess(s, id);
    const { clientId, memberIds, ...rest } = dto;
    if (clientId) { const c = await this.prisma.client.findFirst({ where: { id: clientId, organizationId: s.organizationId } }); if (!c) throw new BadRequestException('Client not found'); }
    const data: Prisma.ProjectUpdateInput = { ...rest, budget: dto.budget, startDate: dto.startDate ? new Date(dto.startDate) : undefined, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, ...(clientId ? { client: { connect: { id: clientId } } } : {}) };
    const project = await this.prisma.project.update({ where: { id }, data });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'project.updated', entityType: 'Project', entityId: id, metadata: { clientId: project.clientId, status: project.status } });
    return project;
  }
  async addMember(s: TenantScope, projectId: string, userId: string) {
    await this.assertAccess(s, projectId); await this.assertMembers(s, [userId]);
    const member = await this.prisma.projectMember.upsert({ where: { projectId_userId: { projectId, userId } }, create: { projectId, userId }, update: {} });
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await this.notifications.notify({ organizationId: s.organizationId, userId, type: 'PROJECT_ACTIVITY', title: `Added to project ${project.name}`, body: `You have been assigned to ${project.name}.`, link: `/projects/${projectId}` });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'project.member_added', entityType: 'Project', entityId: projectId, metadata: { userId } });
    return member;
  }
  async removeMember(s: TenantScope, projectId: string, userId: string) {
    await this.assertAccess(s, projectId);
    await this.prisma.$transaction([this.prisma.projectMember.deleteMany({ where: { projectId, userId } }), this.prisma.task.updateMany({ where: { projectId, assigneeId: userId }, data: { assigneeId: null } })]);
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'project.member_removed', entityType: 'Project', entityId: projectId, metadata: { userId } });
    return { message: 'Member removed from project' };
  }
  /**
   * Previously this loaded the organization's latest 100 audit events and filtered them in memory,
   * so a project's history disappeared as soon as other projects produced 100 newer events.
   */
  async activity(s: TenantScope, projectId: string) {
    await this.assertAccess(s, projectId);
    return this.prisma.auditEvent.findMany({ where: { organizationId: s.organizationId, OR: [{ entityId: projectId }, { metadata: { path: ['projectId'], equals: projectId } }] }, orderBy: { createdAt: 'desc' }, take: 100, include: { actor: { select: { id: true, name: true, email: true } } } });
  }
  /** Task totals per project, computed with two grouped queries regardless of task volume. */
  async taskStats(projectIds: string[]): Promise<Map<string, TaskStats>> {
    const stats = new Map<string, TaskStats>(projectIds.map((id) => [id, { taskCount: 0, doneCount: 0, overdueCount: 0 }]));
    if (!projectIds.length) return stats;
    const [byStatus, overdue] = await Promise.all([
      this.prisma.task.groupBy({ by: ['projectId', 'status'], where: { projectId: { in: projectIds } }, _count: { _all: true } }),
      this.prisma.task.groupBy({ by: ['projectId'], where: { projectId: { in: projectIds }, status: { not: 'DONE' }, dueDate: { lt: new Date() } }, _count: { _all: true } }),
    ]);
    for (const row of byStatus) { const st = stats.get(row.projectId); if (!st) continue; st.taskCount += row._count._all; if (row.status === 'DONE') st.doneCount += row._count._all; }
    for (const row of overdue) { const st = stats.get(row.projectId); if (st) st.overdueCount = row._count._all; }
    return stats;
  }
  private async assertMembers(s: TenantScope, ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.membership.count({ where: { organizationId: s.organizationId, userId: { in: ids }, role: { in: ['OWNER', 'MANAGER', 'DEVELOPER'] } } });
    if (count !== ids.length) throw new BadRequestException('All project members must be agency members of this organization');
  }
}
