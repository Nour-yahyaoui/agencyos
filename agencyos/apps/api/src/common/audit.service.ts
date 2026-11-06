import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}
  async record(input: { organizationId?: string; actorId?: string; action: string; entityType: string; entityId?: string; metadata?: Prisma.InputJsonValue; requestId?: string }) {
    return this.prisma.auditEvent.create({ data: input });
  }
  list(organizationId: string, page = 1, limit = 30) {
    return this.prisma.auditEvent.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { actor: { select: { id: true, name: true, email: true } } } });
  }
}
