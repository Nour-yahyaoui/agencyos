import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuditService } from '../common/audit.service';
@Module({ controllers: [AdminController], providers: [AuditService] }) export class AdminModule {}
