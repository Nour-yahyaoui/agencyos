import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    // The incoming id is client-controlled: accept only a short, simple token, otherwise mint one.
    const incoming = req.headers['x-request-id'];
    req.requestId = typeof incoming === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming) ? incoming : randomUUID();
    res.setHeader('x-request-id', req.requestId);
    const start = Date.now();
    return next.handle().pipe(tap(() => this.logger.log(JSON.stringify({ requestId: req.requestId, method: req.method, path: req.originalUrl?.split('?')[0], status: res.statusCode, durationMs: Date.now() - start, userId: req.user?.id, organizationId: req.membership?.organizationId }))));
  }
}
