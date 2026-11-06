import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { AuditService } from '../common/audit.service';
@Module({ controllers: [ClientsController], providers: [AuditService] }) export class ClientsModule {}
