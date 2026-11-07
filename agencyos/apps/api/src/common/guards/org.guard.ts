import { CanActivate, ExecutionContext, ForbiddenException, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const headerOrgId = req.headers['x-organization-id'];
    const pathOrgId = req.params?.orgId;
    if (headerOrgId && pathOrgId && headerOrgId !== pathOrgId) throw new ForbiddenException('Organization header does not match the requested organization');
    const orgId = pathOrgId || headerOrgId;
    if (typeof orgId !== 'string' || !orgId) throw new BadRequestException('x-organization-id header is required');
    const membership = await this.prisma.membership.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId: req.user.id } } });
    if (!membership) throw new ForbiddenException('You are not a member of this organization');
    req.membership = membership;
    return true;
  }
}
