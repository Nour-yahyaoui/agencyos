import { z } from 'zod';

const optional = z.string().trim().optional().transform((v) => (v ? v : undefined));
const bool = (def: boolean) => z.enum(['true', 'false']).default(def ? 'true' : 'false').transform((v) => v === 'true');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: optional,
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  COOKIE_SECURE: bool(false),
  // Express `trust proxy` for the long-running server: a hop count (e.g. 1 behind the Next.js
  // proxy), 'loopback', or a CIDR list. Unset = do not trust X-Forwarded-For.
  TRUST_PROXY: optional,
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  STRIPE_PRICE_ID: optional,
  OPENAI_API_KEY: optional,
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default('AgencyOS <onboarding@resend.dev>'),
  S3_ENDPOINT: optional,
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  S3_FORCE_PATH_STYLE: bool(true),
  SENTRY_DSN: optional,
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && env.COOKIE_SECURE !== true) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['COOKIE_SECURE'], message: 'COOKIE_SECURE must be true in production' });
  }
  if (env.NODE_ENV === 'production' && /replace-with/.test(env.JWT_ACCESS_SECRET + env.JWT_REFRESH_SECRET)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Production JWT secrets must be generated, not example values' });
  }
});

export type AppEnv = z.infer<typeof envSchema>;
export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Invalid environment configuration:\n${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')}`);
  return parsed.data;
}
