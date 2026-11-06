import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  app.use(helmet());
  app.use(cookieParser());
  app.use('/api/v1/billing/webhooks/stripe', json({ verify: (req: any, _res, buf) => { req.rawBody = Buffer.from(buf); } }));
  app.use(json({ limit: '2mb' }));
  app.enableCors({ origin: config.getOrThrow<string>('WEB_URL'), credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } }));
  app.enableShutdownHooks();
  const swagger = new DocumentBuilder().setTitle('AgencyOS API').setDescription('Multi-tenant agency operations platform. Organization-scoped endpoints require the x-organization-id header. Browser mutations use HTTP-only cookies plus x-csrf-token.').setVersion('1.0').addBearerAuth().addApiKey({ type: 'apiKey', name: 'x-organization-id', in: 'header' }, 'organization').build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });
  const port = config.get<number>('API_PORT') ?? 4000;
  await app.listen(port, '0.0.0.0');
  Logger.log(JSON.stringify({ event: 'startup', port, docs: `/api/docs`, env: config.get('NODE_ENV') }), 'Bootstrap');
}
bootstrap().catch((err) => { Logger.error(err instanceof Error ? err.stack : String(err), 'Bootstrap'); process.exit(1); });
