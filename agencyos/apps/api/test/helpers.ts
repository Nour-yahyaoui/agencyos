import { Test } from '@nestjs/testing';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { execSync } from 'child_process';
import { resolve } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

export async function createTestApp(): Promise<INestApplication> {
  execSync('npx prisma migrate deploy', { cwd: resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }, stdio: 'pipe' });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bodyParser: false });
  const cookieParser = (await import('cookie-parser')).default;
  const { json } = await import('express');
  app.use(cookieParser());
  app.use('/api/v1/billing/webhooks/stripe', json({ verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = Buffer.from(buf); } }));
  app.use(json({ limit: '2mb' }));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}
export async function resetDb(app: INestApplication) {
  const prisma = app.get(PrismaService);
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User", "Organization", "WebhookEvent" CASCADE');
}
export const api = (app: INestApplication) => request(app.getHttpServer());
export function auth(token: string, orgId?: string) { return { Authorization: `Bearer ${token}`, ...(orgId ? { 'x-organization-id': orgId } : {}) }; }
export async function register(app: INestApplication, suffix: string, orgName = `Org ${suffix}`) {
  const res = await api(app).post('/api/v1/auth/register').send({ name: `User ${suffix}`, email: `user-${suffix}@test.dev`, password: 'Password123!', organizationName: orgName }).expect(201);
  const orgs = await api(app).get('/api/v1/organizations').set(auth(res.body.accessToken)).expect(200);
  return { token: res.body.accessToken as string, userId: res.body.user.id as string, orgId: orgs.body.data[0].id as string };
}
