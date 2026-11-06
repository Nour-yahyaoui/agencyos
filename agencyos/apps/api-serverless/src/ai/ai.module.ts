import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ProjectsModule } from '../projects/projects.module';
import { AuditService } from '../common/audit.service';
@Module({ imports: [ProjectsModule], controllers: [AiController], providers: [AiService, AuditService] }) export class AiModule {}
