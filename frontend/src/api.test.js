import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, request, generate, health, getSuggestions, runSuggestions } from './api.js';

describe('api client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retorna os dados do corpo em caso de resposta 200 com ok: true', async () => {
    const mockData = { ok: true, data: { carousel: 'test' } };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const config = { apiUrl: 'http://localhost:8787', token: 'token-123' };
    const result = await request(config, '/api/health');

    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8787/api/health');
    expect(opts.headers['Authorization']).toBe('Bearer token-123');
  });

  it('lança ApiError com code: "quota" e fallbackToAssisted: true para resposta 429', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        ok: false,
        error: 'quota',
        message: 'Quota exceeded',
        fallbackToAssisted: true,
      }),
    });

    const config = { apiUrl: 'http://localhost:8787', token: 'token-abc' };

    await expect(request(config, '/api/generate', { method: 'POST', body: {} })).rejects.toThrow(ApiError);

    try {
      await request(config, '/api/generate', { method: 'POST', body: {} });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('quota');
      expect(err.status).toBe(429);
      expect(err.fallbackToAssisted).toBe(true);
      expect(err.message).toContain('cota gratuita');
    }
  });

  it('lança ApiError com code: "network" e fallbackToAssisted: true se o fetch falhar/rejeitar', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const config = { apiUrl: 'http://localhost:8787', token: 'abc' };

    try {
      await health(config);
      expect.fail('Deveria ter lançado ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('network');
      expect(err.status).toBe(0);
      expect(err.fallbackToAssisted).toBe(true);
      expect(err.message).toContain('Sem conexão com o servidor');
    }
  });

  it('envia o header Authorization como Bearer abc quando token estiver configurado', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const config = {
      apiUrl: 'http://localhost:8787',
      token: 'abc',
      feeds: [{ name: 'Test Feed', url: 'https://exemplo.com/rss', enabled: true }],
    };

    await generate(config, {
      theme: 'Tema de teste',
      slideCount: 5,
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8787/api/generate');
    expect(opts.headers['Authorization']).toBe('Bearer abc');
    expect(opts.headers['Content-Type']).toBe('application/json');

    const sentBody = JSON.parse(opts.body);
    expect(sentBody.theme).toBe('Tema de teste');
    expect(sentBody.slideCount).toBe(5);
    expect(sentBody.sources).toEqual(['https://exemplo.com/rss']);
  });

  it('chama GET /api/suggestions e POST /api/suggestions/run com Authorization Bearer', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, generatedAt: '2026-10-19T09:00:00Z', suggestions: [] }),
    });

    const config = { apiUrl: 'http://localhost:8787', token: 'token-xyz' };

    await getSuggestions(config);
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      'http://localhost:8787/api/suggestions',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer token-xyz' },
      }),
    );

    await runSuggestions(config);
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      'http://localhost:8787/api/suggestions/run',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-xyz' },
      }),
    );
  });
});
