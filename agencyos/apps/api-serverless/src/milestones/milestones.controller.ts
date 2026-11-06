import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { OrgGuard } from '../common/guards/org.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { AuditService } from '../common/audit.service';
class MilestoneDto { @IsString() projectId: string; @IsString() @Length(2, 120) name: string; @IsString() @MaxLength(2000) @IsOptional() description?: string; @IsDateString() dueDate: string; }
@ApiTags('Milestones') @ApiBearerAuth() @Controller('milestones') @UseGuards(OrgGuard, RolesGuard)
export class MilestonesController {
  constructor(private prisma: PrismaService, private projects: ProjectsService, private audit: AuditService) {}
  @Get() async list(@Scope() s: TenantScope, @Query('projectId') projectId?: string) {
    if (projectId) await this.projects.assertAccess(s, projectId);
    return this.prisma.milestone.findMany({ where: { organizationId: s.organizationId, ...(projectId ? { projectId } : {}), project: this.projects.projectWhere(s) }, orderBy: { dueDate: 'asc' }, include: { project: { select: { id: true, name: true } }, _count: { select: { tasks: true } } } });
  }
  @Post() @Roles('OWNER', 'MANAGER') async create(@Scope() s: TenantScope, @Body() dto: MilestoneDto) {
    await this.projects.assertAccess(s, dto.projectId);
    const m = await this.prisma.milestone.create({ data: { organizationId: s.organizationId, projectId: dto.projectId, name: dto.name, description: dto.description, dueDate: new Date(dto.dueDate) } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'milestone.created', entityType: 'Milestone', entityId: m.id, metadata: { projectId: dto.projectId } });
    return m;
  }
  @Patch(':id') @Roles('OWNER', 'MANAGER') async update(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: Partial<MilestoneDto> & { completed?: boolean }) {
    const m = await this.prisma.milestone.findFirst({ where: { id, organizationId: s.organizationId, project: this.projects.projectWhere(s) } });
    if (!m) throw new NotFoundException('Milestone not found');
    const updated = await this.prisma.milestone.update({ where: { id }, data: { ...(dto.name ? { name: dto.name } : {}), ...(dto.description !== undefined ? { description: dto.description } : {}), ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}), ...(dto.completed !== undefined ? { completedAt: dto.completed ? new Date() : null } : {}) } });
    await this.audit.record({ organizationId: s.organizationId, actorId: s.userId, action: 'milestone.updated', entityType: 'Milestone', entityId: id, metadata: { projectId: m.projectId } });
    return updated;
  }
  @Delete(':id') @Roles('OWNER', 'MANAGER') async remove(@Scope() s: TenantScope, @Param('id') id: string) {
    const m = await this.prisma.milestone.findFirst({ where: { id, organizationId: s.organizationId } });
    if (!m) throw new NotFoundException('Milestone not found');
    await this.prisma.milestone.delete({ where: { id } });
    return { message: 'Milestone deleted' };
  }
}
