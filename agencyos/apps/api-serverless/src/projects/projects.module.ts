import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuditService } from '../common/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [NotificationsModule], controllers: [ProjectsController], providers: [ProjectsService, AuditService], exports: [ProjectsService] }) export class ProjectsModule {}
