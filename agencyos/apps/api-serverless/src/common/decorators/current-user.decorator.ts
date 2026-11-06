import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export interface AuthUser { id: string; email: string; name: string; platformRole: 'USER' | 'SUPER_ADMIN'; }
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);
