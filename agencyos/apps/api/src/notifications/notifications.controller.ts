import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgGuard } from '../common/guards/org.guard';
import { Scope, TenantScope } from '../common/decorators/scope.decorator';
import { NotificationService } from './notifications.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
@ApiTags('Notifications') @ApiBearerAuth() @Controller('notifications') @UseGuards(OrgGuard, RolesGuard)
export class NotificationsController {
  constructor(private service: NotificationService) {}
  @Get() list(@Scope() s: TenantScope, @Query('unread') unread?: string) { return this.service.list(s.organizationId, s.userId, unread === 'true'); }
  @Patch('read-all') readAll(@Scope() s: TenantScope) { return this.service.markAllRead(s.organizationId, s.userId); }
  @Patch(':id/read') read(@Scope() s: TenantScope, @Param('id') id: string) { return this.service.markRead(s.organizationId, s.userId, id); }
  @Post('run-reminders') @Roles('OWNER', 'MANAGER') run(@Scope() s: TenantScope) { return this.service.deadlineReminders(s.organizationId); }
}
