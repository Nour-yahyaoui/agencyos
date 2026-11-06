import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { AppModule } from '../src/app.module';
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  const config = new DocumentBuilder().setTitle('AgencyOS API').setVersion('1.0').addBearerAuth().addApiKey({ type: 'apiKey', name: 'x-organization-id', in: 'header' }, 'organization').build();
  const doc = SwaggerModule.createDocument(app, config);
  // Runs from apps/api (npm workspace cwd). Override with OPENAPI_OUT when needed.
  const out = process.env.OPENAPI_OUT ?? resolve(process.cwd(), '../../docs/openapi.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(doc, null, 2));
  await app.close();
  console.log(`OpenAPI exported to ${out}`);
}
main().catch((error) => { console.error(error); process.exit(1); });
