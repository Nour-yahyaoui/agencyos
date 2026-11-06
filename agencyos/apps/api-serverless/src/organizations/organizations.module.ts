import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { AuditService } from '../common/audit.service';
@Module({ controllers: [OrganizationsController], providers: [AuditService] }) export class OrganizationsModule {}
