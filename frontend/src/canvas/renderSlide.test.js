import { describe, it, expect } from 'vitest';
import { wrapText, fitText, tokenizeRich, wrapRich, fitRich, getRenderSlides, slideTheme, mix, clampLines, resolveHandle, ensureContrast, contrast, paletteFor } from './renderSlide.js';

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

describe('clampLines', () => {
  const measure = (s) => s.length * 10;
  it('mantém o texto inteiro quando cabe', () => {
    expect(clampLines('aa bb', 100, measure, 2)).toEqual(['aa bb']);
  });
  it('corta em maxLines e termina com reticências, sem traço solto', () => {
    const lines = clampLines('[1] Gartner — Over 40% of agentic AI projects will be canceled by end of 2027', 200, measure, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(lines.join(' ').length).toBeLessThan(80);
  });
});

describe('@ por rede, contraste e visual do carrossel', () => {
  it('resolveHandle usa o @ da rede de destino, com recuo para os outros', () => {
    const p = { handleLinkedin: '@li', handleInstagram: '@ig' };
    expect(resolveHandle(p, 'linkedin')).toBe('@li');
    expect(resolveHandle(p, 'instagram')).toBe('@ig');
    expect(resolveHandle({ handleInstagram: '@ig' }, 'linkedin')).toBe('@ig');
    expect(resolveHandle({ handle: '@antigo' }, 'instagram')).toBe('@antigo');
    expect(resolveHandle({}, 'linkedin')).toBe('');
  });

  it('ensureContrast clareia o vinho no fundo grafite até ficar legível', () => {
    const c = ensureContrast('#A20136', '#1E1E1E', 4.5);
    expect(contrast(c, '#1E1E1E')).toBeGreaterThanOrEqual(4.5);
    expect(ensureContrast('#FFFFFF', '#1E1E1E', 4.5)).toBe('#ffffff');
  });

  it('cor secundária vale também nos slides escuros, legível, e a caixa usa a cor original', () => {
    const profile = { highlight: 'accent2', colors: { bg: '#F0F0F0', text: '#1E1E1E', accent: '#FF024B', accent2: '#A20136' } };
    const dark = paletteFor(profile, 'escuro');
    expect(dark.hlFill).toBe('#A20136');
    expect(contrast(dark.hl, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(paletteFor(profile, 'escuro', { highlight: 'accent' }).hlFill).toBe('#FF024B');
  });

  it('visual do carrossel: todo escuro ou todo claro, mas a escolha do slide prevalece', () => {
    expect(slideTheme({ role: 'ponto' }, 'slide', { theme: 'escuro' })).toBe('escuro');
    expect(slideTheme({ role: 'capa' }, 'slide', { theme: 'claro' })).toBe('claro');
    expect(slideTheme({ role: 'capa', theme: 'escuro' }, 'slide', { theme: 'claro' })).toBe('escuro');
    expect(slideTheme({ role: 'capa' }, 'slide', { theme: 'padrao' })).toBe('escuro');
  });
});
