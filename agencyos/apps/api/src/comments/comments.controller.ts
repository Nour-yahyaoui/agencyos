import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, Length, IsOptional } from 'class-validator';
import { OrgGuard } from '../common/guards/org.guard';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { AuditService } from '../common/audit.service';
import { NotificationService } from '../notifications/notifications.service';
class CommentDto { @IsString() @Length(1, 5000) body: string; @IsString() @IsOptional() taskId?: string; @IsString() @IsOptional() ticketId?: string; }
@ApiTags('Comments') @ApiBearerAuth() @Controller('comments') @UseGuards(OrgGuard)
export class CommentsController {
  constructor(private prisma: PrismaService, private projects: ProjectsService, private audit: AuditService, private notifications: NotificationService) {}
  @Get() async list(@Scope() s: TenantScope, @Query('taskId') taskId?: string, @Query('ticketId') ticketId?: string) {
    if (!taskId && !ticketId) throw new BadRequestException('taskId or ticketId is required');
    if (taskId) await this.assertTask(s, taskId);
    if (ticketId) await this.assertTicket(s, ticketId);
    return this.prisma.comment.findMany({ where: { organizationId: s.organizationId, ...(taskId ? { taskId } : {}), ...(ticketId ? { ticketId } : {}) }, orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true, email: true } } } });
  }
  @Post() async create(@Scope() s: TenantScope, @Body() dto: CommentDto) {
    if ((!dto.taskId && !dto.ticketId) || (dto.taskId && dto.ticketId)) throw new BadRequestException('Provide exactly one of taskId or ticketId');
    let task: any = null; let ticket: any = null;
    if (dto.taskId) task = await this.assertTask(s, dto.taskId);
    if (dto.ticketId) ticket = await this.assertTicket(s, dto.ticketId);
    const comment = await this.prisma.comment.create({ data: { organizationId: s.organizationId, taskId: dto.taskId, ticketId: dto.ticketId, authorId: s.userId, body: dto.body }, include: { author: { select: { id: true, name: true } } } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'comment.created', entityType: dto.taskId ? 'Task' : 'SupportTicket', entityId: dto.taskId ?? dto.ticketId, metadata: { projectId: task?.projectId } });
    if (task?.assigneeId && task.assigneeId !== s.userId) await this.notifications.notify({ organizationId: s.organizationId, userId: task.assigneeId, type: 'PROJECT_ACTIVITY', title: `New comment on ${task.title}`, body: dto.body.slice(0, 200), link: `/projects/${task.projectId}` });
    if (ticket) {
      const recipients = new Set<string>();
      if (ticket.assigneeId && ticket.assigneeId !== s.userId) recipients.add(ticket.assigneeId);
      const clientMembers = await this.prisma.membership.findMany({ where: { organizationId: s.organizationId, clientId: ticket.clientId, role: 'CLIENT' }, select: { userId: true } });
      if (s.role !== 'CLIENT') clientMembers.forEach((m) => recipients.add(m.userId));
      for (const userId of recipients) await this.notifications.notify({ organizationId: s.organizationId, userId, type: 'SUPPORT', title: `Update on ticket: ${ticket.subject}`, body: dto.body.slice(0, 200), link: `/support/${ticket.id}` });
    }
    return comment;
  }
  @Delete(':id') async remove(@Scope() s: TenantScope, @Param('id') id: string) {
    const c = await this.prisma.comment.findFirst({ where: { id, organizationId: s.organizationId } });
    if (!c) throw new NotFoundException('Comment not found');
    if (c.authorId !== s.userId && !['OWNER', 'MANAGER'].includes(s.role)) throw new ForbiddenException('Only the author or a manager can delete this comment');
    if (c.taskId) await this.assertTask(s, c.taskId); if (c.ticketId) await this.assertTicket(s, c.ticketId);
    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Comment deleted' };
  }
  private async assertTask(s: TenantScope, id: string) { const t = await this.prisma.task.findFirst({ where: { id, organizationId: s.organizationId, project: this.projects.projectWhere(s) }, include: { project: true } }); if (!t) throw new NotFoundException('Task not found'); return t; }
  private async assertTicket(s: TenantScope, id: string) { const t = await this.prisma.supportTicket.findFirst({ where: { id, organizationId: s.organizationId, ...(s.role === 'CLIENT' ? { clientId: s.clientId ?? '__none__' } : {}) } }); if (!t) throw new NotFoundException('Ticket not found'); return t; }
}
