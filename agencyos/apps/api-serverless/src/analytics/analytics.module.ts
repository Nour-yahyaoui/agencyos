import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ProjectsModule } from '../projects/projects.module';
@Module({ imports: [ProjectsModule], controllers: [AnalyticsController], providers: [AnalyticsService], exports: [AnalyticsService] }) export class AnalyticsModule {}
