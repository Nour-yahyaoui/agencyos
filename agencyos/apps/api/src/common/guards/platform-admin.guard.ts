import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    if (ctx.switchToHttp().getRequest().user?.platformRole !== 'SUPER_ADMIN') throw new ForbiddenException('Platform administrator required');
    return true;
  }
}
