import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgGuard } from '../common/guards/org.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto, DependencyDto, MoveTaskDto, TaskQueryDto, UpdateTaskDto } from './dto';
@ApiTags('Tasks') @ApiBearerAuth() @Controller('tasks') @UseGuards(OrgGuard, RolesGuard)
export class TasksController {
  constructor(private service: TasksService) {}
  @Get() list(@Scope() s: TenantScope, @Query() q: TaskQueryDto) { return this.service.list(s, { page: q.page, limit: q.limit, skip: q.skip, q: q.q, projectId: q.projectId, status: q.status, assigneeId: q.assigneeId, overdue: q.overdue }); }
  @Get(':id') get(@Scope() s: TenantScope, @Param('id') id: string) { return this.service.get(s, id); }
  @Post() @Roles('OWNER', 'MANAGER', 'DEVELOPER') create(@Scope() s: TenantScope, @Body() dto: CreateTaskDto) { return this.service.create(s, dto); }
  @Patch(':id') @Roles('OWNER', 'MANAGER', 'DEVELOPER') update(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: UpdateTaskDto) { return this.service.update(s, id, dto); }
  @Patch(':id/move') @Roles('OWNER', 'MANAGER', 'DEVELOPER') move(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: MoveTaskDto) { return this.service.move(s, id, dto.status, dto.position); }
  @Delete(':id') @Roles('OWNER', 'MANAGER') remove(@Scope() s: TenantScope, @Param('id') id: string) { return this.service.remove(s, id); }
  @Post(':id/dependencies') @Roles('OWNER', 'MANAGER', 'DEVELOPER') addDep(@Scope() s: TenantScope, @Param('id') id: string, @Body() dto: DependencyDto) { return this.service.addDependency(s, id, dto.prerequisiteId); }
  @Delete(':id/dependencies/:prerequisiteId') @Roles('OWNER', 'MANAGER', 'DEVELOPER') removeDep(@Scope() s: TenantScope, @Param('id') id: string, @Param('prerequisiteId') prerequisiteId: string) { return this.service.removeDependency(s, id, prerequisiteId); }
}
