import { describe, it, expect } from 'vitest';
import { wrapText, fitText, tokenizeRich, wrapRich, fitRich, getRenderSlides, slideTheme, mix } from './renderSlide.js';

describe('canvas/renderSlide', () => {
  const measure = (s) => s.length * 10;

  it('wrapText quebra texto em linhas respeitando maxWidth', () => {
    // 'a b c': 'a b' tem 3 chars * 10 = 30; 'a b c' teria 5 * 10 = 50 > 30
    const lines = wrapText('a b c', 30, measure);
    expect(lines).toEqual(['a b', 'c']);
  });

  it('wrapText gera quebras a partir de \\n', () => {
    const text = 'Linha 1\nLinha 2\nLinha 3';
    const lines = wrapText(text, 500, measure);
    expect(lines).toEqual(['Linha 1', 'Linha 2', 'Linha 3']);
  });

  it('wrapText quebra palavras gigantes que excedem maxWidth', () => {
    // Palavra de 10 letras com maxWidth 50 (cada char mede 10, então cabe no máx 5 chars por pedaço)
    const longWord = '1234567890';
    const lines = wrapText(longWord, 50, measure);
    expect(lines).toEqual(['12345', '67890']);
  });

  it('fitText reduz tamanho de fonte quando texto não cabe', () => {
    const measureAt = (size) => (s) => s.length * size * 0.5;

    // Texto com 40 caracteres.
    // Em maxSize 60: largura = 40 * 60 * 0.5 = 1200 > maxWidth 800 -> vai quebrar em 2 linhas de 20 chars
    // 2 linhas * 60 * 1.2 = 144 > maxHeight 100 -> não cabe em 60
    // Deve reduzir até caber na altura maxHeight
    const result = fitText({
      text: 'Texto de teste com comprimento moderado!',
      maxWidth: 600,
      maxHeight: 80,
      maxSize: 60,
      minSize: 20,
      lineHeight: 1.2,
      measureAt,
    });

    expect(result.size).toBeLessThan(60);
    expect(result.overflow).toBe(false);
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('fitText marca overflow: true quando nem a fonte mínima cabe', () => {
    const measureAt = (size) => (s) => s.length * size * 0.5;
    const veryLongText = 'Texto '.repeat(50); // Muitas linhas

    const result = fitText({
      text: veryLongText,
      maxWidth: 200,
      maxHeight: 50,
      maxSize: 40,
      minSize: 20,
      lineHeight: 1.4,
      measureAt,
    });

    expect(result.size).toBe(20);
    expect(result.overflow).toBe(true);
  });
});

describe('texto rico e lista de slides', () => {
  const measure = (s) => s.length * 10;

  it('tokenizeRich marca o que está entre ** como negrito e remove os marcadores', () => {
    const words = tokenizeRich('um **dois três** quatro').filter((t) => t.text);
    expect(words.map((t) => [t.text, t.bold])).toEqual([['um', false], ['dois', true], ['três', true], ['quatro', false]]);
  });

  it('wrapRich quebra linhas mantendo os trechos em negrito', () => {
    const lines = wrapRich('aa **bb** cc', 50, measure);
    expect(lines).toEqual([[{ text: 'aa ', bold: false }, { text: 'bb', bold: true }], [{ text: 'cc', bold: false }]]);
  });

  it('fitRich não encolhe abaixo do mínimo: corta com reticências e marca overflow', () => {
    const r = fitRich({ text: 'palavra '.repeat(30), maxWidth: 100, maxHeight: 60, maxSize: 40, minSize: 30, lineHeight: 1, measureAt: () => measure });
    expect(r.size).toBe(30);
    expect(r.overflow).toBe(true);
    expect(r.lines).toHaveLength(2);
    expect(r.lines.at(-1).at(-1).text.endsWith('…')).toBe(true);
  });

  it('getRenderSlides acrescenta o slide de fontes quando há mais de 3', () => {
    const content = { slides: [{}, {}, {}, {}], sources: [1, 2, 3].map((i) => ({ title: `F${i}`, url: `https://f${i}.br` })) };
    expect(getRenderSlides(content)).toHaveLength(4);
    content.sources.push({ title: 'F4', url: 'https://f4.br' });
    const list = getRenderSlides(content);
    expect(list).toHaveLength(5);
    expect(list.at(-1).kind).toBe('fontes');
  });

  it('slideTheme deixa capa e conclusão escuras, respeita a escolha e o fundo de imagem', () => {
    expect(slideTheme({ role: 'capa' })).toBe('escuro');
    expect(slideTheme({ role: 'ponto' })).toBe('claro');
    expect(slideTheme({ role: 'capa', theme: 'claro' })).toBe('claro');
    expect(slideTheme({ role: 'ponto', layout: 'imagem-fundo' })).toBe('escuro');
  });

  it('mix mistura cores', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});
