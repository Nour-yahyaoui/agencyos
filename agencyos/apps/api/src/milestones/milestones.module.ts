import { Module } from '@nestjs/common';
import { MilestonesController } from './milestones.controller';
import { ProjectsModule } from '../projects/projects.module';
import { AuditService } from '../common/audit.service';
@Module({ imports: [ProjectsModule], controllers: [MilestonesController], providers: [AuditService] }) export class MilestonesModule {}
