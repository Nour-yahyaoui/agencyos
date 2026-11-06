import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private config: ConfigService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    if (req.authMethod !== 'cookie' && !req.cookies?.agencyos_refresh) return true;
    const origin = req.headers.origin as string | undefined;
    if (origin && !isAllowedOrigin(origin, this.config.getOrThrow<string>('WEB_URL'), process.env.NODE_ENV === 'production')) throw new ForbiddenException('Cross-origin request rejected');
    const cookie = req.cookies?.agencyos_csrf;
    const header = req.headers['x-csrf-token'];
    if (!cookie || !header || cookie.length !== header.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
      throw new ForbiddenException('CSRF token missing or invalid');
    }
    return true;
  }
}

/** Exact WEB_URL match in production; localhost aliases and E2B preview hosts in development/test. */
export function isAllowedOrigin(origin: string, webUrl: string, production: boolean): boolean {
  try {
    const o = new URL(origin); const w = new URL(webUrl);
    if (o.origin === w.origin) return true;
    if (production) return false;
    const local = ['localhost', '127.0.0.1', '[::1]'];
    if (local.includes(o.hostname) && local.includes(w.hostname)) return true;
    if (o.hostname.endsWith('.e2b.app')) return true;
    return false;
  } catch { return false; }
}
