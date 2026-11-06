import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProjectsModule } from '../projects/projects.module';
import { AuditService } from '../common/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [ProjectsModule, NotificationsModule], controllers: [TasksController], providers: [TasksService, AuditService], exports: [TasksService] }) export class TasksModule {}
