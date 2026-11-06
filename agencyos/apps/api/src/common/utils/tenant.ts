import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { TenantScope } from '../decorators/scope.decorator';
export const AGENCY_ROLES: MemberRole[] = ['OWNER', 'MANAGER', 'DEVELOPER'];
export const MANAGEMENT_ROLES: MemberRole[] = ['OWNER', 'MANAGER'];
export function assertAgency(scope: TenantScope) {
  if (!AGENCY_ROLES.includes(scope.role)) throw new ForbiddenException('Agency role required');
}
export function assertManagement(scope: TenantScope) {
  if (!MANAGEMENT_ROLES.includes(scope.role)) throw new ForbiddenException('Manager or owner role required');
}
export function clientFilter(scope: TenantScope) {
  return scope.role === 'CLIENT' ? { clientId: scope.clientId ?? '__none__' } : {};
}
export function notFound(entity: string): never { throw new NotFoundException(`${entity} not found`); }
