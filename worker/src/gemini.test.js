import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateCarousel, QuotaError } from './gemini.js';
import fixture from '../../shared/fixtures/exemplo.json' with { type: 'json' };

const ok = (obj) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const status = (code) => new Response('{"error":{}}', { status: code });
const env = { GEMINI_API_KEY: 'x', GEMINI_MODEL: 'modelo-teste' };
const items = [{ title: 'Item', summary: 'Resumo', link: 'https://exemplo.com/a' }];
const args = { env, theme: 'LGPD na prática', slideCount: 5, items, sites: [], retryDelayMs: 0 };

afterEach(() => vi.unstubAllGlobals());

describe('generateCarousel', () => {
  it('sem cota de busca na web, gera só com os feeds e avisa', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(status(429)).mockResolvedValueOnce(ok(fixture));
    vi.stubGlobal('fetch', fetchMock);
    const result = await generateCarousel({ ...args, useWebSearch: true });
    expect(result.content.slides).toHaveLength(5);
    expect(result.warnings[0]).toMatch(/busca na web/);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.tools).toBeUndefined();
  });

  it('sem feeds, a falta de cota continua indo para o modo assistido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(status(429)));
    await expect(generateCarousel({ ...args, items: [], useWebSearch: true })).rejects.toBeInstanceOf(QuotaError);
  });

  it('modelo sobrecarregado (503) tenta mais uma vez', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(status(503)).mockResolvedValueOnce(ok(fixture));
    vi.stubGlobal('fetch', fetchMock);
    const result = await generateCarousel({ ...args, useWebSearch: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.warnings.some((w) => /busca/.test(w))).toBe(false);
  });

  it('se o modelo continua sobrecarregado, usa o modelo reserva', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(status(503)).mockResolvedValueOnce(status(503)).mockResolvedValueOnce(ok(fixture));
    vi.stubGlobal('fetch', fetchMock);
    await generateCarousel({ ...args, env: { ...env, GEMINI_FALLBACK_MODEL: 'modelo-reserva' }, useWebSearch: false });
    expect(fetchMock.mock.calls[2][0]).toContain('/modelo-reserva:generateContent');
  });
});
