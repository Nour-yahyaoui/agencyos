import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { AuditService } from '../common/audit.service';
import { ProjectsModule } from '../projects/projects.module';
@Module({ imports: [ProjectsModule], controllers: [DocumentsController], providers: [AuditService] }) export class DocumentsModule {}
