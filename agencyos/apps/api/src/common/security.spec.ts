import { isAllowedOrigin } from './guards/csrf.guard';
describe('origin policy', () => {
  it('allows the configured web origin', () => expect(isAllowedOrigin('http://localhost:3000', 'http://localhost:3000', true)).toBe(true));
  it('rejects foreign origins in production', () => expect(isAllowedOrigin('https://evil.example', 'http://localhost:3000', true)).toBe(false));
  it('allows loopback aliases and preview hosts outside production', () => {
    expect(isAllowedOrigin('http://127.0.0.1:3000', 'http://localhost:3000', false)).toBe(true);
    expect(isAllowedOrigin('https://3000-abc.e2b.app', 'http://localhost:3000', false)).toBe(true);
    expect(isAllowedOrigin('https://3000-abc.e2b.app', 'http://localhost:3000', true)).toBe(false);
  });
});
