import { describe, it, expect } from 'vitest';
import { checkToken, safeEqual } from './limits.js';

const ctx = (token, header) => ({ env: { ACCESS_TOKEN: token }, req: { header: () => header } });

describe('worker/limits', () => {
  it('safeEqual compara conteúdo e tamanho', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', '')).toBe(true);
  });

  it('checkToken aceita só o Bearer correto e exige token de 16+ caracteres', () => {
    const token = 'x'.repeat(32);
    expect(checkToken(ctx(token, `Bearer ${token}`))).toBe(true);
    expect(checkToken(ctx(token, `Bearer ${token}y`))).toBe(false);
    expect(checkToken(ctx(token, token))).toBe(false);
    expect(checkToken(ctx('curto', 'Bearer curto'))).toBe(false);
    expect(checkToken(ctx(undefined, 'Bearer '))).toBe(false);
  });
});
