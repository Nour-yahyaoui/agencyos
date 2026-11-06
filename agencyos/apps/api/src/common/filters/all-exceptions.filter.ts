import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any).message || exception.message;
      code = (body as any).code || exception.name.replace(/Exception$/, '').toUpperCase();
      details = (body as any).details;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') { status = 409; message = 'A record with these unique values already exists'; code = 'CONFLICT'; }
      else if (exception.code === 'P2025') { status = 404; message = 'Record not found'; code = 'NOT_FOUND'; }
      else if (exception.code === 'P2003') { status = 409; message = 'Operation violates a relational constraint'; code = 'CONSTRAINT'; }
      else { status = 400; message = 'Database request failed'; code = 'DATABASE_ERROR'; }
    }
    if (status >= 500) this.logger.error(JSON.stringify({ requestId: req.requestId, path: req.path, error: exception instanceof Error ? exception.message : String(exception) }));
    res.status(status).json({ statusCode: status, code, message, details, requestId: req.requestId, path: req.path, timestamp: new Date().toISOString() });
  }
}
