import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { AuditService } from '../common/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [NotificationsModule], controllers: [SupportController], providers: [AuditService] }) export class SupportModule {}
