import { describe, it, expect } from 'vitest';
import { wrapText, fitText } from './renderSlide.js';

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
