import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgGuard } from '../common/guards/org.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';
import { CreateTicketDto, UpdateTicketDto } from './dto';
import { AuditService } from '../common/audit.service';
import { NotificationService } from '../notifications/notifications.service';
@ApiTags('Support') @ApiBearerAuth() @Controller('support/tickets') @UseGuards(OrgGuard, RolesGuard)
export class SupportController {
  constructor(private prisma: PrismaService, private audit: AuditService, private notifications: NotificationService) {}
  private where(s: TenantScope, status?: string, q?: string) { return { organizationId: s.organizationId, ...(s.role === 'CLIENT' ? { clientId: s.clientId ?? '__none__' } : {}), ...(status ? { status: status as any } : {}), ...(q ? { OR: [{ subject: { contains: q, mode: 'insensitive' as const } }, { description: { contains: q, mode: 'insensitive' as const } }] } : {}) }; }
  @Get() async list(@Scope() s: TenantScope, @Query() query: PaginationDto, @Query('status') status?: string) {
    const where = this.where(s, status, query.q);
    const [data, total] = await Promise.all([this.prisma.supportTicket.findMany({ where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' }, include: { client: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } }, _count: { select: { comments: true } } } }), this.prisma.supportTicket.count({ where })]);
    return paginated(data, total, query.page, query.limit);
  }
  @Get(':id') async get(@Scope() s: TenantScope, @Param('id') id: string) {
    const t = await this.prisma.supportTicket.findFirst({ where: { id, ...this.where(s) }, include: { client: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true } }, comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true, email: true } } } } } });
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }
  @Post() async create(@Scope() s: TenantScope, @Body() dto: CreateTicketDto) {
    const clientId = s.role === 'CLIENT' ? s.clientId : dto.clientId;
    if (!clientId) throw new BadRequestException('clientId is required');
    const client = await this.prisma.client.findFirst({ where: { id: clientId, organizationId: s.organizationId } });
    if (!client) throw new BadRequestException('Client not found');
    const ticket = await this.prisma.supportTicket.create({ data: { organizationId: s.organizationId, clientId, subject: dto.subject, description: dto.description, priority: dto.priority ?? 'MEDIUM', createdById: s.userId }, include: { client: { select: { name: true } } } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'ticket.created', entityType: 'SupportTicket', entityId: ticket.id, metadata: { clientId } });
    await this.notifications.notifyRoles(s.organizationId, ['OWNER', 'MANAGER'], { type: 'SUPPORT', title: `New support ticket: ${ticket.subject}`, body: `${ticket.client.name} opened a ticket.`, link: `/support/${ticket.id}`, dedupeKey: `ticket-created:${ticket.id}`, email: true });
    return ticket;
  }
  @Patch(':id') @Roles('OWNER', 'MANAGER', 'DEVELOPER') async update(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    const t = await this.prisma.supportTicket.findFirst({ where: { id, organizationId: s.organizationId } });
    if (!t) throw new NotFoundException('Ticket not found');
    if (dto.assigneeId) { const m = await this.prisma.membership.findFirst({ where: { organizationId: s.organizationId, userId: dto.assigneeId, role: { in: ['OWNER', 'MANAGER', 'DEVELOPER'] } } }); if (!m) throw new BadRequestException('Assignee must be an agency member'); }
    const updated = await this.prisma.supportTicket.update({ where: { id }, data: { ...(dto.status ? { status: dto.status } : {}), ...(dto.priority ? { priority: dto.priority } : {}), ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId || null } : {}) } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'ticket.updated', entityType: 'SupportTicket', entityId: id, metadata: { status: updated.status, clientId: t.clientId } });
    const clientMembers = await this.prisma.membership.findMany({ where: { organizationId: s.organizationId, clientId: t.clientId, role: 'CLIENT' }, select: { userId: true } });
    for (const m of clientMembers) await this.notifications.notify({ organizationId: s.organizationId, userId: m.userId, type: 'SUPPORT', title: `Ticket updated: ${t.subject}`, body: `Status is now ${updated.status.replace('_', ' ').toLowerCase()}.`, link: `/support/${id}`, email: true });
    return updated;
  }
}
