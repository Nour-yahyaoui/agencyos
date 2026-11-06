import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
export interface TenantScope { organizationId: string; userId: string; role: MemberRole; clientId?: string | null; }
export const Scope = createParamDecorator((_data: unknown, ctx: ExecutionContext): TenantScope => {
  const req = ctx.switchToHttp().getRequest();
  return { organizationId: req.membership.organizationId, userId: req.user.id, role: req.membership.role, clientId: req.membership.clientId };
});
