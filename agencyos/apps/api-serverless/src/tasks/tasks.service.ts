import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScope } from '../common/decorators/scope.decorator';
import { ProjectsService } from '../projects/projects.service';
import { AuditService } from '../common/audit.service';
import { NotificationService } from '../notifications/notifications.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService, private projects: ProjectsService, private audit: AuditService, private notifications: NotificationService) {}
  async list(s: TenantScope, q: { projectId?: string; status?: string; assigneeId?: string; overdue?: string; page: number; limit: number; skip: number; q?: string }) {
    const where: Prisma.TaskWhereInput = { organizationId: s.organizationId, project: this.projects.projectWhere(s), ...(q.projectId ? { projectId: q.projectId } : {}), ...(q.status ? { status: q.status as TaskStatus } : {}), ...(q.assigneeId ? { assigneeId: q.assigneeId } : {}), ...(q.overdue === 'true' ? { status: { not: 'DONE' }, dueDate: { lt: new Date() } } : {}), ...(q.q ? { title: { contains: q.q, mode: 'insensitive' } } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({ where, skip: q.skip, take: q.limit, orderBy: [{ dueDate: 'asc' }, { position: 'asc' }], include: { project: { select: { id: true, name: true, client: { select: { name: true } } } }, assignee: { select: { id: true, name: true, email: true } }, milestone: { select: { id: true, name: true } }, dependencies: { select: { prerequisiteId: true } } } }),
      this.prisma.task.count({ where }),
    ]);
    return { data, meta: { total, page: q.page, limit: q.limit, totalPages: Math.max(1, Math.ceil(total / q.limit)) } };
  }
  async get(s: TenantScope, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, organizationId: s.organizationId, project: this.projects.projectWhere(s) }, include: { project: { select: { id: true, name: true, clientId: true } }, assignee: { select: { id: true, name: true, email: true } }, milestone: true, dependencies: { include: { prerequisite: { select: { id: true, title: true, status: true } } } }, comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true } } } } } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
  async create(s: TenantScope, dto: CreateTaskDto) {
    await this.projects.assertAccess(s, dto.projectId);
    await this.validateRefs(s, dto);
    const position = await this.prisma.task.count({ where: { projectId: dto.projectId, status: dto.status ?? 'TODO' } });
    const task = await this.prisma.task.create({ data: { organizationId: s.organizationId, projectId: dto.projectId, title: dto.title, description: dto.description, status: dto.status ?? 'TODO', priority: dto.priority ?? 'MEDIUM', assigneeId: dto.assigneeId || null, milestoneId: dto.milestoneId || null, dueDate: dto.dueDate ? new Date(dto.dueDate) : null, estimatedHours: dto.estimatedHours, position, completedAt: dto.status === 'DONE' ? new Date() : null }, include: { assignee: { select: { id: true, name: true } }, project: { select: { name: true } } } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'task.created', entityType: 'Task', entityId: task.id, metadata: { projectId: dto.projectId, title: dto.title } });
    if (task.assigneeId && task.assigneeId !== s.userId) await this.notifications.notify({ organizationId: s.organizationId, userId: task.assigneeId, type: 'PROJECT_ACTIVITY', title: `New task: ${task.title}`, body: `You were assigned "${task.title}" in ${task.project.name}.`, link: `/projects/${task.projectId}`, email: true });
    return task;
  }
  async update(s: TenantScope, id: string, dto: UpdateTaskDto) {
    const existing = await this.get(s, id);
    await this.projects.assertAccess(s, dto.projectId);
    const movedProject = dto.projectId !== existing.projectId;
    // When a task changes project its milestone, assignee and dependencies belong to the old one.
    // Re-validate the effective references against the new project instead of keeping them silently.
    const assigneeId = dto.assigneeId === undefined ? existing.assigneeId : dto.assigneeId || null;
    const milestoneId = dto.milestoneId === undefined ? (movedProject ? null : existing.milestoneId) : dto.milestoneId || null;
    await this.validateRefs(s, { ...dto, assigneeId, milestoneId });
    const status = dto.status ?? existing.status;
    // PATCH used to bypass the prerequisite rule that the Kanban move endpoint enforces.
    if (status === 'DONE' && existing.status !== 'DONE' && !movedProject) await this.assertNoOpenPrerequisites(id);
    const task = await this.prisma.$transaction(async (tx) => {
      if (movedProject) await tx.taskDependency.deleteMany({ where: { OR: [{ taskId: id }, { prerequisiteId: id }] } });
      return tx.task.update({ where: { id }, data: { projectId: dto.projectId, title: dto.title, description: dto.description, status, priority: dto.priority ?? existing.priority, assigneeId, milestoneId, dueDate: dto.dueDate === undefined ? existing.dueDate : dto.dueDate ? new Date(dto.dueDate) : null, estimatedHours: dto.estimatedHours, completedAt: status === 'DONE' ? existing.completedAt ?? new Date() : null }, include: { assignee: { select: { id: true, name: true } }, project: { select: { name: true } } } });
    });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'task.updated', entityType: 'Task', entityId: id, metadata: { projectId: task.projectId } });
    if (task.assigneeId && task.assigneeId !== existing.assigneeId && task.assigneeId !== s.userId) await this.notifications.notify({ organizationId: s.organizationId, userId: task.assigneeId, type: 'PROJECT_ACTIVITY', title: `Task assigned: ${task.title}`, body: `You were assigned "${task.title}".`, link: `/projects/${task.projectId}`, email: true });
    return task;
  }
  async move(s: TenantScope, id: string, status: TaskStatus, position: number) {
    const task = await this.get(s, id);
    if (s.role === 'CLIENT') throw new BadRequestException('Clients cannot move tasks');
    if (status === 'DONE') await this.assertNoOpenPrerequisites(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.task.updateMany({ where: { projectId: task.projectId, status, position: { gte: position }, id: { not: id } }, data: { position: { increment: 1 } } });
      return tx.task.update({ where: { id }, data: { status, position, completedAt: status === 'DONE' ? new Date() : null } });
    });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'task.moved', entityType: 'Task', entityId: id, metadata: { projectId: task.projectId, from: task.status, to: status } });
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: task.projectId } });
    const allDone = await this.prisma.task.count({ where: { projectId: task.projectId, status: { not: 'DONE' } } }) === 0;
    if (allDone && project.status !== 'COMPLETED') await this.prisma.project.update({ where: { id: project.id }, data: { status: 'COMPLETED' } });
    return updated;
  }
  async remove(s: TenantScope, id: string) { const t = await this.get(s, id); await this.prisma.task.delete({ where: { id } }); await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'task.deleted', entityType: 'Task', entityId: id, metadata: { projectId: t.projectId } }); return { message: 'Task deleted' }; }
  async addDependency(s: TenantScope, id: string, prerequisiteId: string) {
    const task = await this.get(s, id); const pre = await this.get(s, prerequisiteId);
    if (id === prerequisiteId) throw new BadRequestException('A task cannot depend on itself');
    if (task.projectId !== pre.projectId) throw new BadRequestException('Dependencies must be within the same project');
    if (await this.wouldCycle(task.projectId, id, prerequisiteId)) throw new BadRequestException('Dependency would create a cycle');
    const dep = await this.prisma.taskDependency.upsert({ where: { taskId_prerequisiteId: { taskId: id, prerequisiteId } }, create: { taskId: id, prerequisiteId }, update: {} });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'task.dependency_added', entityType: 'Task', entityId: id, metadata: { projectId: task.projectId, prerequisiteId } });
    return dep;
  }
  async removeDependency(s: TenantScope, id: string, prerequisiteId: string) { await this.get(s, id); await this.prisma.taskDependency.deleteMany({ where: { taskId: id, prerequisiteId } }); return { message: 'Dependency removed' }; }
  private async assertNoOpenPrerequisites(taskId: string) {
    const blockers = await this.prisma.taskDependency.count({ where: { taskId, prerequisite: { status: { not: 'DONE' } } } });
    if (blockers) throw new BadRequestException('Cannot complete a task with unfinished prerequisites');
  }
  private async wouldCycle(projectId: string, taskId: string, prerequisiteId: string) {
    // Dependencies are always within one project, so load that graph once (one query) instead of
    // issuing a query per visited node. If we can reach taskId from the prerequisite, it's a cycle.
    const edges = await this.prisma.taskDependency.findMany({ where: { task: { projectId } }, select: { taskId: true, prerequisiteId: true } });
    const graph = new Map<string, string[]>();
    for (const e of edges) graph.set(e.taskId, [...(graph.get(e.taskId) ?? []), e.prerequisiteId]);
    const seen = new Set<string>(); const stack = [prerequisiteId];
    while (stack.length) { const current = stack.pop()!; if (current === taskId) return true; if (seen.has(current)) continue; seen.add(current); stack.push(...(graph.get(current) ?? [])); }
    return false;
  }
  private async validateRefs(s: TenantScope, dto: CreateTaskDto) {
    if (dto.assigneeId) { const m = await this.prisma.membership.findFirst({ where: { organizationId: s.organizationId, userId: dto.assigneeId, role: { in: ['OWNER', 'MANAGER', 'DEVELOPER'] } } }); if (!m) throw new BadRequestException('Assignee must be an agency member'); const pm = await this.prisma.projectMember.findFirst({ where: { projectId: dto.projectId, userId: dto.assigneeId } }); if (!pm) throw new BadRequestException('Assignee must be a project member'); }
    if (dto.milestoneId) { const m = await this.prisma.milestone.findFirst({ where: { id: dto.milestoneId, projectId: dto.projectId, organizationId: s.organizationId } }); if (!m) throw new BadRequestException('Milestone not found in project'); }
  }
}
