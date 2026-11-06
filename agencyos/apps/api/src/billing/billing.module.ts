import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { AuditService } from '../common/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [NotificationsModule], controllers: [BillingController], providers: [BillingService, AuditService], exports: [BillingService] }) export class BillingModule {}
