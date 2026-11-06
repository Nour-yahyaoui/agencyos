import { Module } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { AuditService } from '../common/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [NotificationsModule], controllers: [MembershipsController], providers: [AuditService] }) export class MembershipsModule {}
