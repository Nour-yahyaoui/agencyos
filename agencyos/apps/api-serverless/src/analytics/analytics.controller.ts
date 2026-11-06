import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgGuard } from '../common/guards/org.guard';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { AnalyticsService } from './analytics.service';
@ApiTags('Analytics') @ApiBearerAuth() @Controller('analytics') @UseGuards(OrgGuard)
export class AnalyticsController { constructor(private service: AnalyticsService) {} @Get('dashboard') dashboard(@Scope() s: TenantScope) { return this.service.dashboard(s); } }
