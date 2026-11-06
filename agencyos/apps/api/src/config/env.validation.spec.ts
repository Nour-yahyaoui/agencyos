import { validateEnv } from './env.validation';
const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40) };
describe('environment validation', () => {
  it('applies safe defaults', () => { const env = validateEnv(base); expect(env.API_PORT).toBe(4000); expect(env.COOKIE_SECURE).toBe(false); expect(env.NODE_ENV).toBe('development'); });
  it('requires secure cookies and generated secrets in production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/COOKIE_SECURE/);
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true', JWT_ACCESS_SECRET: 'replace-with-a-random-access-secret-at-least-32-characters' })).toThrow(/generated/);
    expect(validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(true);
  });
  it('rejects malformed database URLs and short secrets', () => { expect(() => validateEnv({ ...base, DATABASE_URL: 'not-a-url' })).toThrow(); expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(); });
});
