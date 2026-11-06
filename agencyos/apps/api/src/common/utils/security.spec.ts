import { randomToken, safeEqual, sha256, slugify } from './security';
describe('security utilities', () => {
  it('hashes deterministically and generates high-entropy tokens', () => { expect(sha256('abc')).toBe(sha256('abc')); expect(sha256('abc')).not.toBe(sha256('abd')); const t = randomToken(); expect(t).toHaveLength(64); expect(randomToken()).not.toBe(t); });
  it('compares safely and slugifies organization names', () => { expect(safeEqual('a', 'a')).toBe(true); expect(safeEqual('a', 'b')).toBe(false); expect(safeEqual('a', 'aa')).toBe(false); expect(slugify('  Northstar Studio!  ')).toBe('northstar-studio'); expect(slugify('!!!')).toBe('org'); });
});
