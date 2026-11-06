import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgGuard } from './guards/org.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Scope, TenantScope } from './decorators/scope.decorator';
import { AuditService } from './audit.service';
@ApiTags('Audit') @ApiBearerAuth() @Controller('audit') @UseGuards(OrgGuard, RolesGuard) @Roles('OWNER')
export class AuditController { constructor(private audit: AuditService) {} @Get() list(@Scope() s: TenantScope, @Query('page') page?: string) { return this.audit.list(s.organizationId, Number(page) || 1, 30); } }
