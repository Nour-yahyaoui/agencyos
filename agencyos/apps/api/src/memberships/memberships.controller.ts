import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { OrgGuard } from '../common/guards/org.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { InviteMemberDto } from '../auth/dto';
import { IsIn } from 'class-validator';
import { randomToken, sha256 } from '../common/utils/security';
import { IntegrationsService } from '../integrations/integrations.service';
import { AuditService } from '../common/audit.service';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notifications/notifications.service';

class UpdateRoleDto { @IsIn(['OWNER', 'MANAGER', 'DEVELOPER', 'CLIENT']) role: 'OWNER' | 'MANAGER' | 'DEVELOPER' | 'CLIENT'; }

@ApiTags('Memberships') @ApiBearerAuth() @Controller('memberships') @UseGuards(OrgGuard, RolesGuard)
export class MembershipsController {
  constructor(private prisma: PrismaService, private integrations: IntegrationsService, private audit: AuditService, private config: ConfigService, private notifications: NotificationService) {}
  @Get() @Roles('OWNER', 'MANAGER', 'DEVELOPER') list(@Scope() s: TenantScope) { return this.prisma.membership.findMany({ where: { organizationId: s.organizationId }, include: { user: { select: { id: true, name: true, email: true, isActive: true } }, client: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }); }
  @Get('invitations') @Roles('OWNER', 'MANAGER') invitations(@Scope() s: TenantScope) { return this.prisma.invitation.findMany({ where: { organizationId: s.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, role: true, clientId: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); }
  @Post('invite') @Roles('OWNER', 'MANAGER') async invite(@Scope() s: TenantScope, @Body() dto: InviteMemberDto) {
    if (dto.role === 'CLIENT' && !dto.clientId) throw new BadRequestException('clientId is required for client invitations');
    // Only client memberships are linked to a client record; ignore a stray clientId for agency roles.
    if (dto.role !== 'CLIENT') dto.clientId = undefined;
    if (dto.clientId) { const c = await this.prisma.client.findFirst({ where: { id: dto.clientId, organizationId: s.organizationId } }); if (!c) throw new BadRequestException('Client not found'); }
    const sub = await this.prisma.subscription.findUnique({ where: { organizationId: s.organizationId } });
    const count = await this.prisma.membership.count({ where: { organizationId: s.organizationId, role: { not: 'CLIENT' } } });
    if (dto.role !== 'CLIENT' && sub && count >= sub.seatLimit) throw new BadRequestException('Seat limit reached for current subscription');
    const token = randomToken();
    const inv = await this.prisma.invitation.upsert({ where: { organizationId_email: { organizationId: s.organizationId, email: dto.email.toLowerCase() } }, create: { organizationId: s.organizationId, email: dto.email.toLowerCase(), role: dto.role, clientId: dto.clientId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 86400000) }, update: { role: dto.role, clientId: dto.clientId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 86400000), acceptedAt: null } });
    const url = `${this.config.getOrThrow('WEB_URL')}/accept-invitation?token=${token}`;
    const sent = await this.integrations.sendEmail(dto.email, 'You are invited to AgencyOS', `<p>You have been invited to join an agency workspace.</p><p><a href="${url}">Accept invitation</a></p><p>This link expires in 7 days.</p>`);
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'membership.invited', entityType: 'Invitation', entityId: inv.id, metadata: { email: dto.email, role: dto.role } });
    return { invitation: { id: inv.id, email: inv.email, role: inv.role, expiresAt: inv.expiresAt }, emailDelivered: sent, invitationUrl: url };
  }
  @Patch(':id') @Roles('OWNER') async updateRole(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const m = await this.prisma.membership.findFirst({ where: { id, organizationId: s.organizationId } });
    if (!m) throw new BadRequestException('Membership not found');
    if (m.role === 'OWNER' && dto.role !== 'OWNER') { const owners = await this.prisma.membership.count({ where: { organizationId: s.organizationId, role: 'OWNER' } }); if (owners <= 1) throw new BadRequestException('Organization must retain at least one owner'); }
    if (dto.role === 'CLIENT' && !m.clientId) throw new BadRequestException('Client membership requires a linked client');
    if (m.role === 'CLIENT' && dto.role !== 'CLIENT') {
      // Promoting a client to an agency role consumes a seat, like an invitation does.
      const sub = await this.prisma.subscription.findUnique({ where: { organizationId: s.organizationId } });
      const seats = await this.prisma.membership.count({ where: { organizationId: s.organizationId, role: { not: 'CLIENT' } } });
      if (sub && seats >= sub.seatLimit) throw new BadRequestException('Seat limit reached for current subscription');
    }
    const updated = await this.prisma.membership.update({ where: { id }, data: { role: dto.role, ...(dto.role !== 'CLIENT' ? { clientId: null } : {}) } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'membership.role_changed', entityType: 'Membership', entityId: id, metadata: { from: m.role, to: dto.role } });
    return updated;
  }
  @Delete(':id') @Roles('OWNER') async remove(@Scope() s: TenantScope, @Param('id') id: string) {
    const m = await this.prisma.membership.findFirst({ where: { id, organizationId: s.organizationId } });
    if (!m) throw new BadRequestException('Membership not found');
    if (m.userId === s.userId) throw new BadRequestException('Use ownership transfer before removing yourself');
    if (m.role === 'OWNER') { const owners = await this.prisma.membership.count({ where: { organizationId: s.organizationId, role: 'OWNER' } }); if (owners <= 1) throw new BadRequestException('Cannot remove the last owner'); }
    // Also drop the user's project memberships and assignments in this organization so removed
    // members don't linger on projects (and regain access to them if re-invited later).
    await this.prisma.$transaction([
      this.prisma.projectMember.deleteMany({ where: { userId: m.userId, project: { organizationId: s.organizationId } } }),
      this.prisma.task.updateMany({ where: { organizationId: s.organizationId, assigneeId: m.userId }, data: { assigneeId: null } }),
      this.prisma.supportTicket.updateMany({ where: { organizationId: s.organizationId, assigneeId: m.userId }, data: { assigneeId: null } }),
      this.prisma.membership.delete({ where: { id } }),
    ]);
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'membership.removed', entityType: 'Membership', entityId: id });
    return { message: 'Member removed' };
  }
}
