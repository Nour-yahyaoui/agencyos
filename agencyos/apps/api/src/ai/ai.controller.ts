import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { OrgGuard } from '../common/guards/org.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { AiService, AssistantAction } from './ai.service';
class AssistDto { @IsIn(['project_summary', 'overdue_analysis', 'status_report', 'prioritize_tasks', 'ticket_summary', 'delivery_risks']) action: AssistantAction; @IsString() @IsOptional() projectId?: string; @IsString() @IsOptional() ticketId?: string; }
@ApiTags('AI') @ApiBearerAuth() @Controller('ai') @UseGuards(OrgGuard, RolesGuard) @Roles('OWNER', 'MANAGER', 'DEVELOPER')
export class AiController { constructor(private service: AiService) {} @Get('status') status() { return this.service.status(); } @Post('assist') assist(@Scope() s: TenantScope, @Body() dto: AssistDto) { return this.service.assist(s, dto.action, dto.projectId, dto.ticketId); } }
