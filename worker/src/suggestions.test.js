import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSuggestions, runWeekly } from './suggestions.js';

const makeValidItem = (n) => ({
  theme: `Tema sugerido número ${n} sobre IA`,
  angle: `Ângulo relevante da sugestão ${n} para pequenas e médias empresas.`,
  sources: [
    {
      title: `Fonte Oficial ${n}`,
      url: `https://exemplo.com/noticia-${n}`,
    },
  ],
});

describe('worker/src/suggestions.js — validateSuggestions', () => {
  it('aceita lista válida com 2 ou 3 sugestões', () => {
    const input = {
      suggestions: [makeValidItem(1), makeValidItem(2), makeValidItem(3)],
    };

    const res = validateSuggestions(input);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.suggestions).toHaveLength(3);
  });

  it('rejeita lista com apenas 1 item', () => {
    const input = {
      suggestions: [makeValidItem(1)],
    };

    const res = validateSuggestions(input);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toMatch(/entre 2 e 3/i);
  });

  it('corta o excesso para 3 itens quando recebe 4 ou mais itens válidos', () => {
    const input = {
      suggestions: [
        makeValidItem(1),
        makeValidItem(2),
        makeValidItem(3),
        makeValidItem(4),
      ],
    };

    const res = validateSuggestions(input);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.suggestions).toHaveLength(3);
    expect(res.suggestions.map((s) => s.theme)).toEqual([
      'Tema sugerido número 1 sobre IA',
      'Tema sugerido número 2 sobre IA',
      'Tema sugerido número 3 sobre IA',
    ]);
  });

  it('rejeita quando alguma fonte possui URL inválida (sem http/https)', () => {
    const badItem = {
      ...makeValidItem(2),
      sources: [{ title: 'Fonte quebrada', url: 'ftp://invalido.com/doc' }],
    };

    const res = validateSuggestions({
      suggestions: [makeValidItem(1), badItem],
    });

    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /URL inválida/i.test(e))).toBe(true);
  });
});

describe('worker/src/suggestions.js — runWeekly', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('não sobrescreve o KV se a validação falhar após 1 retry', async () => {
    const putMock = vi.fn();
    const env = {
      DEFAULT_FEEDS: '',
      TOPICS: 'IA, gestão',
      GEMINI_API_KEY: 'fake-key',
      KV: { put: putMock },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ suggestions: [makeValidItem(1)] }) }],
              },
            },
          ],
        }),
      }),
    );

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await runWeekly(env);
    expect(res).toBeNull();
    expect(putMock).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });
});
