import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgGuard } from '../common/guards/org.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, ProjectMemberDto, ProjectQueryDto, UpdateProjectDto } from './dto';
@ApiTags('Projects') @ApiBearerAuth() @Controller('projects') @UseGuards(OrgGuard, RolesGuard)
export class ProjectsController {
  constructor(private service: ProjectsService) {}
  @Get() list(@Scope() s: TenantScope, @Query() q: ProjectQueryDto) { return this.service.list(s, { page: q.page, limit: q.limit, skip: q.skip, q: q.q, status: q.status, clientId: q.clientId }); }
  @Get(':id') get(@Scope() s: TenantScope, @Param('id') id: string) { return this.service.get(s, id); }
  @Get(':id/activity') activity(@Scope() s: TenantScope, @Param('id') id: string) { return this.service.activity(s, id); }
  @Post() @Roles('OWNER', 'MANAGER') create(@Scope() s: TenantScope, @Body() dto: CreateProjectDto) { return this.service.create(s, dto); }
  @Patch(':id') @Roles('OWNER', 'MANAGER') update(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: UpdateProjectDto) { return this.service.update(s, id, dto); }
  @Post(':id/members') @Roles('OWNER', 'MANAGER') addMember(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: ProjectMemberDto) { return this.service.addMember(s, id, dto.userId); }
  @Delete(':id/members/:userId') @Roles('OWNER', 'MANAGER') removeMember(@Scope() s: TenantScope, @Param('id') id: string, @Param('userId') userId: string) { return this.service.removeMember(s, id, userId); }
}
