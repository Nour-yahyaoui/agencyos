import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { OrgGuard } from '../common/guards/org.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
@ApiTags('Integrations') @Controller('integrations') @UseGuards(OrgGuard, RolesGuard) @Roles('OWNER', 'MANAGER')
export class IntegrationsController { constructor(private service: IntegrationsService) {} @Get('status') status() { return this.service.status(); } }
