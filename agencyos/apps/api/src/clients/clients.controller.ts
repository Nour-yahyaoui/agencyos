import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { OrgGuard } from '../common/guards/org.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';
import { CreateClientDto, OnboardingDto, UpdateClientDto, ContactDto } from './dto';
import { AuditService } from '../common/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@ApiTags('Clients') @ApiBearerAuth() @Controller('clients') @UseGuards(OrgGuard, RolesGuard)
export class ClientsController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}
  private where(s: TenantScope, q?: string, status?: string): Prisma.ClientWhereInput {
    return { organizationId: s.organizationId, ...(s.role === 'CLIENT' ? { id: s.clientId ?? '__none__' } : {}), ...(status ? { status: status as any } : {}), ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { company: { contains: q, mode: 'insensitive' } }, { contacts: { some: { email: { contains: q, mode: 'insensitive' } } } }] } : {}) };
  }
  @Get() async list(@Scope() s: TenantScope, @Query() query: PaginationDto, @Query('status') status?: string) {
    const where = this.where(s, query.q, status);
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({ where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' }, include: { contacts: true, accountManager: { select: { id: true, name: true, email: true } }, _count: { select: { projects: true, invoices: true, tickets: true } } } }),
      this.prisma.client.count({ where }),
    ]);
    // Internal client notes are not part of the client portal.
    const visible = s.role === 'CLIENT' ? data.map(({ notes: _notes, ...client }) => client) : data;
    return paginated(visible, total, query.page, query.limit);
  }
  @Get(':id') async get(@Scope() s: TenantScope, @Param('id') id: string) {
    const client = await this.prisma.client.findFirst({ where: { AND: [{ id }, this.where(s)] }, include: { contacts: true, accountManager: { select: { id: true, name: true, email: true } }, projects: { include: { _count: { select: { tasks: true } } }, orderBy: { createdAt: 'desc' } }, invoices: { ...(s.role === 'CLIENT' ? { where: { status: { not: 'DRAFT' as const } } } : {}), orderBy: { createdAt: 'desc' }, take: 10 }, tickets: { orderBy: { createdAt: 'desc' }, take: 10 }, documents: { orderBy: { createdAt: 'desc' }, take: 20 } } });
    if (!client) throw new NotFoundException('Client not found');
    if (s.role === 'CLIENT') { const { notes: _notes, ...visible } = client; return visible; }
    return client;
  }
  @Get(':id/activity') @Roles('OWNER', 'MANAGER', 'DEVELOPER') async activity(@Scope() s: TenantScope, @Param('id') id: string) {
    await this.get(s, id);
    return this.prisma.auditEvent.findMany({ where: { organizationId: s.organizationId, OR: [{ entityId: id }, { metadata: { path: ['clientId'], equals: id } }] }, orderBy: { createdAt: 'desc' }, take: 50, include: { actor: { select: { name: true } } } });
  }
  @Post() @Roles('OWNER', 'MANAGER') async create(@Scope() s: TenantScope, @Body() dto: CreateClientDto) {
    if (dto.accountManagerId) await this.assertMember(s, dto.accountManagerId);
    const defaultSteps = [{ key: 'discovery', label: 'Discovery call completed', done: false }, { key: 'contract', label: 'Contract signed', done: false }, { key: 'portal', label: 'Client portal access sent', done: false }, { key: 'kickoff', label: 'Project kickoff scheduled', done: false }];
    const client = await this.prisma.client.create({ data: { organizationId: s.organizationId, name: dto.name, company: dto.company, website: dto.website, notes: dto.notes, accountManagerId: dto.accountManagerId, onboardingSteps: defaultSteps, contacts: dto.contacts ? { create: dto.contacts } : undefined }, include: { contacts: true } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'client.created', entityType: 'Client', entityId: client.id, metadata: { name: client.name } });
    return client;
  }
  @Patch(':id') @Roles('OWNER', 'MANAGER') async update(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    await this.get(s, id);
    if (dto.accountManagerId) await this.assertMember(s, dto.accountManagerId);
    const { contacts, ...data } = dto;
    const client = await this.prisma.client.update({ where: { id }, data: data as any });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'client.updated', entityType: 'Client', entityId: id, metadata: { clientId: id } });
    return client;
  }
  @Patch(':id/onboarding') @Roles('OWNER', 'MANAGER') async onboarding(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: OnboardingDto) {
    await this.get(s, id);
    const steps = dto.steps.map((x) => ({ key: String(x.key).slice(0, 40), label: String(x.label).slice(0, 120), done: !!x.done }));
    const allDone = steps.length > 0 && steps.every((x) => x.done);
    const client = await this.prisma.client.update({ where: { id }, data: { onboardingSteps: steps, ...(allDone ? { status: 'ACTIVE' } : {}) } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'client.onboarding_updated', entityType: 'Client', entityId: id });
    return client;
  }
  @Post(':id/contacts') @Roles('OWNER', 'MANAGER') async addContact(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: ContactDto) {
    await this.get(s, id);
    return this.prisma.contact.create({ data: { clientId: id, ...dto } });
  }
  @Delete(':id/contacts/:contactId') @Roles('OWNER', 'MANAGER') async removeContact(@Scope() s: TenantScope, @Param('id') id: string, @Param('contactId') contactId: string) {
    await this.get(s, id);
    await this.prisma.contact.deleteMany({ where: { id: contactId, clientId: id } });
    return { message: 'Contact removed' };
  }
  @Delete(':id') @Roles('OWNER') async archive(@Scope() s: TenantScope, @Param('id') id: string) {
    await this.get(s, id);
    const client = await this.prisma.client.update({ where: { id }, data: { status: 'ARCHIVED' } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'client.archived', entityType: 'Client', entityId: id });
    return client;
  }
  private async assertMember(s: TenantScope, userId: string) {
    const m = await this.prisma.membership.findFirst({ where: { organizationId: s.organizationId, userId, role: { in: ['OWNER', 'MANAGER', 'DEVELOPER'] } } });
    if (!m) throw new BadRequestException('Account manager must be an agency member');
  }
}
