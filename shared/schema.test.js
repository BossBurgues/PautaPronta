import { describe, it, expect } from 'vitest';
import {
  LIMITS,
  ROLES,
  normalizeContent,
  validateContent,
  stripMarks,
} from './schema.js';
import fixture from './fixtures/exemplo.json';

describe('shared/schema', () => {
  it('valida a fixture exemplo.json com sucesso sem erros ou warnings', () => {
    const normalized = normalizeContent(fixture);
    const result = validateContent(normalized);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('rejeita carrossel com 3 slides (menos que o mínimo)', () => {
    const raw = {
      ...fixture,
      slides: fixture.slides.slice(0, 3),
    };
    const result = validateContent(normalizeContent(raw));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('quantidade de slides'))).toBe(true);
  });

  it('rejeita carrossel com 8 slides (mais que o máximo)', () => {
    const raw = {
      ...fixture,
      slides: [
        ...fixture.slides,
        { n: 6, role: 'ponto', title: 'Extra 1', body: 'Corpo extra 1' },
        { n: 7, role: 'ponto', title: 'Extra 2', body: 'Corpo extra 2' },
        { n: 8, role: 'ponto', title: 'Extra 3', body: 'Corpo extra 3' },
      ],
    };
    const result = validateContent(normalizeContent(raw));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('quantidade de slides'))).toBe(true);
  });

  it('emite warning quando título tem 61 caracteres, mantendo valid === true', () => {
    const longTitle = 'A'.repeat(61);
    const raw = {
      ...fixture,
      slides: [
        { ...fixture.slides[0], title: longTitle },
        ...fixture.slides.slice(1),
      ],
    };
    const result = validateContent(normalizeContent(raw));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('Slide 1: título com 61 caracteres'))).toBe(true);
  });

  it('emite warning quando corpo do slide excede 220 caracteres', () => {
    const longBody = 'B'.repeat(225);
    const raw = {
      ...fixture,
      slides: [
        { ...fixture.slides[0], body: longBody },
        ...fixture.slides.slice(1),
      ],
    };
    const result = validateContent(normalizeContent(raw));
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('Slide 1: texto com 225 caracteres'))).toBe(true);
  });

  it('emite warning quando CTA não termina com interrogação ou passa de 150 chars', () => {
    const raw = {
      ...fixture,
      cta: 'Chamada sem interrogacao',
    };
    const result = validateContent(normalizeContent(raw));
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("deve terminar com '?'"))).toBe(true);
  });

  it('rejeita quando há apenas 1 fonte', () => {
    const raw = {
      ...fixture,
      sources: [fixture.sources[0]],
    };
    const result = validateContent(normalizeContent(raw));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('no mínimo 2 fontes'))).toBe(true);
  });

  it('rejeita fonte com URL inválida ou protocolo ftp://', () => {
    const raw = {
      ...fixture,
      sources: [
        { title: 'Fonte 1', url: 'https://exemplo.com' },
        { title: 'Fonte 2', url: 'ftp://invalido.com' },
      ],
    };
    const result = validateContent(normalizeContent(raw));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ftp://invalido.com'))).toBe(true);
  });

  it('rejeita quando há menos de 3 hashtags', () => {
    const raw = {
      ...fixture,
      hashtags: ['#um', '#dois'],
    };
    const result = validateContent(normalizeContent(raw));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('no mínimo 3 hashtags'))).toBe(true);
  });

  it('normalizeContent renumera slides, higieniza hashtags, deduplica e limita a 5', () => {
    const raw = {
      topic: 'Teste',
      slides: [
        { n: 3, role: 'ponto', title: 'Slide A', body: 'Corpo A' },
        { n: 1, role: 'invalido', title: 'Slide B', body: 'Corpo B' },
        { n: 2, role: 'conclusao', title: 'Slide C', body: 'Corpo C' },
      ],
      hashtags: 'ia, #IA, seguranca, #nuvem, dados, extra',
      sources: [
        { title: 'Site 1', url: 'https://site.com' },
        { title: 'Site 1 duplicado', url: 'https://site.com' },
        { title: 'Site 2', url: 'https://site2.com', verified: true },
        { title: 'Sem url', url: '' },
      ],
    };

    const normalized = normalizeContent(raw);

    // Renumeração dos slides
    expect(normalized.slides.map((s) => s.n)).toEqual([1, 2, 3]);

    // Role válido preservado no slide 1 e 3; inválido normalizado no slide 2
    expect(normalized.slides[0].role).toBe('ponto');
    expect(normalized.slides[1].role).toBe('contexto'); // index 1 com role inválido vira contexto
    expect(normalized.slides[2].role).toBe('conclusao');

    // Hashtags formatadas com #, deduplicadas (case-insensitive) e cortadas em 5
    expect(normalized.hashtags).toEqual(['#ia', '#seguranca', '#nuvem', '#dados', '#extra']);

    // Fontes deduplicadas por URL e vazias ignoradas
    expect(normalized.sources).toHaveLength(2);
    expect(normalized.sources[0].url).toBe('https://site.com');
    expect(normalized.sources[1].verified).toBe(true);
  });

  it('normalizeContent({}) não lança erro e validateContent aponta os erros estruturais', () => {
    expect(() => normalizeContent({})).not.toThrow();
    const emptyResult = validateContent(normalizeContent({}));

    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.errors.length).toBeGreaterThanOrEqual(5);
    expect(emptyResult.errors.some((e) => e.includes('topic'))).toBe(true);
    expect(emptyResult.errors.some((e) => e.includes('quantidade de slides'))).toBe(true);
    expect(emptyResult.errors.some((e) => e.includes('LinkedIn'))).toBe(true);
    expect(emptyResult.errors.some((e) => e.includes('Instagram'))).toBe(true);
    expect(emptyResult.errors.some((e) => e.includes('hashtags'))).toBe(true);
    expect(emptyResult.errors.some((e) => e.includes('fontes'))).toBe(true);
  });
});

describe('campos visuais do slide', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';

  it('preserva layout, fundo, número, passos, fonte e imagem válidos', () => {
    const raw = structuredClone(fixture);
    Object.assign(raw.slides[2], {
      layout: 'destaque', theme: 'escuro', stat: '40%', source: 'McKinsey [1]',
      image: { src: png, focusX: 30, focusY: 120, zoom: 9 },
      steps: [{ label: ' A ', text: ' um ' }, { label: '', text: '' }],
    });
    const s = normalizeContent(raw).slides[2];
    expect(s).toMatchObject({ layout: 'destaque', theme: 'escuro', stat: '40%', source: 'McKinsey [1]' });
    expect(s.image).toEqual({ src: png, focusX: 30, focusY: 100, zoom: 3 });
    expect(s.steps).toEqual([{ label: 'A', text: 'um' }]);
  });

  it('descarta layout desconhecido, tema auto e imagem que não é data URL de imagem', () => {
    const raw = structuredClone(fixture);
    Object.assign(raw.slides[1], { layout: 'video', theme: 'auto', image: { src: 'https://x.com/a.png' } });
    const s = normalizeContent(raw).slides[1];
    expect(s.layout).toBeUndefined();
    expect(s.theme).toBeUndefined();
    expect(s.image).toBeUndefined();
  });

  it('não conta os marcadores de negrito no limite do título', () => {
    const raw = structuredClone(fixture);
    raw.slides[1].title = `**${'a'.repeat(60)}**`;
    expect(validateContent(normalizeContent(raw)).warnings).toEqual([]);
    expect(stripMarks('um **dois** três')).toBe('um dois três');
  });

  it('avisa quando falta o número em destaque ou passos suficientes', () => {
    const raw = structuredClone(fixture);
    raw.slides[2].layout = 'destaque';
    raw.slides[3].layout = 'passos';
    raw.slides[3].steps = [{ label: 'só um', text: 'passo' }];
    const { warnings, valid } = validateContent(normalizeContent(raw));
    expect(valid).toBe(true);
    expect(warnings.some((w) => w.includes('número em destaque'))).toBe(true);
    expect(warnings.some((w) => w.includes('de 2 a 4 passos'))).toBe(true);
  });
});
