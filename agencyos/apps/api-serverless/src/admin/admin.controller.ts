import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';
import { AuditService } from '../common/audit.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
class AdminUserDto { @IsBoolean() @IsOptional() isActive?: boolean; @IsIn(['USER', 'SUPER_ADMIN']) @IsOptional() platformRole?: 'USER' | 'SUPER_ADMIN'; }
@ApiTags('Admin') @ApiBearerAuth() @Controller('admin') @UseGuards(PlatformAdminGuard)
export class AdminController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}
  @Get('overview') async overview() {
    const [users, organizations, projects, invoices, payments] = await Promise.all([this.prisma.user.count(), this.prisma.organization.count(), this.prisma.project.count(), this.prisma.invoice.count(), this.prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amount: true } })]);
    return { users, organizations, projects, invoices, processedPayments: payments._sum.amount ? Number(payments._sum.amount) : 0 };
  }
  @Get('organizations') async organizations(@Query() q: PaginationDto) { const where = q.q ? { name: { contains: q.q, mode: 'insensitive' as const } } : {}; const [data, total] = await Promise.all([this.prisma.organization.findMany({ where, skip: q.skip, take: q.limit, orderBy: { createdAt: 'desc' }, include: { subscription: true, _count: { select: { memberships: true, clients: true, projects: true } } } }), this.prisma.organization.count({ where })]); return paginated(data, total, q.page, q.limit); }
  @Get('users') async users(@Query() q: PaginationDto) { const where = q.q ? { OR: [{ email: { contains: q.q, mode: 'insensitive' as const } }, { name: { contains: q.q, mode: 'insensitive' as const } }] } : {}; const [data, total] = await Promise.all([this.prisma.user.findMany({ where, skip: q.skip, take: q.limit, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, name: true, platformRole: true, isActive: true, createdAt: true, _count: { select: { memberships: true } } } }), this.prisma.user.count({ where })]); return paginated(data, total, q.page, q.limit); }
  @Patch('users/:id') async updateUser(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: AdminUserDto) { const user = await this.prisma.user.update({ where: { id }, data: dto }); await this.audit.record({ actorId: actor.id, action: 'admin.user_updated', entityType: 'User', entityId: id, metadata: dto as any }); return { id: user.id, email: user.email, isActive: user.isActive, platformRole: user.platformRole }; }
  @Get('audit') auditEvents(@Query() q: PaginationDto) { return this.prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.limit, include: { actor: { select: { name: true, email: true } }, organization: { select: { name: true } } } }); }
}
