import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
@ApiTags('Health') @Controller('health') @Public() @SkipThrottle()
export class HealthController {
  constructor(private prisma: PrismaService) {}
  @Get('live') live() { return { status: 'ok', service: 'agencyos-api', timestamp: new Date().toISOString() }; }
  @Get('ready') async ready() { try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', database: 'up', timestamp: new Date().toISOString() }; } catch { throw new ServiceUnavailableException({ status: 'error', database: 'down' }); } }
}
