import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { ProjectsModule } from '../projects/projects.module';
import { AuditService } from '../common/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [ProjectsModule, NotificationsModule], controllers: [CommentsController], providers: [AuditService] }) export class CommentsModule {}
